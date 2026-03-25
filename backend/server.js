const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const User = require('./models/User');
const Student = require('./models/Student');
const Company = require('./models/Company');
const Application = require('./models/Application');
const Document = require('./models/Document');
const Notification = require('./models/Notification');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();
const ADMIN_NAME = String(process.env.ADMIN_NAME || 'Admin').trim() || 'Admin';
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'placement_app';

let mongoReady = false;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = String(file.originalname || '').toLowerCase();
    const isPdf = name.endsWith('.pdf');
    if (!isPdf) {
      const err = new Error('Only PDF files are allowed');
      err.statusCode = 400;
      return cb(err);
    }
    return cb(null, true);
  },
});

const departments = ['CSE', 'AI&DS', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'];

const db = {
  users: [],
  students: [],
  companies: [],
  applications: [],
  documents: [],
  notifications: [],
};

// OTP store (in-memory). In production, replace with a durable store.
// Keyed by `${email}|${phone}`
const otpStore = new Map();
// Time allowed to enter/verify the OTP code (requested: 60 seconds)
const OTP_VERIFY_TTL_MS = Number(process.env.OTP_VERIFY_TTL_MS || 60 * 1000);
// Time allowed to complete registration after OTP verification
const OTP_VERIFIED_TTL_MS = Number(process.env.OTP_VERIFIED_TTL_MS || 15 * 60 * 1000);
const OTP_RESEND_COOLDOWN_MS = Number(process.env.OTP_RESEND_COOLDOWN_MS || 30 * 1000); // 30 seconds
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const OTP_DEBUG = String(process.env.OTP_DEBUG || '').toLowerCase() === 'true' || process.env.NODE_ENV !== 'production';

const nowIso = () => new Date().toISOString();

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(0, 10);

const isValidNameCapsWithLastInitial = (value) => /^[A-Z]+(?: [A-Z]+)* [A-Z]\.?$/.test(String(value || '').trim());
const isValidRegisterNumber = (value) => /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{12}$/.test(String(value || '').trim().toUpperCase());
const isValidAllowedEmail = (value) => {
  const email = normalizeEmail(value);
  if (!email.includes('@')) return false;
  return email.endsWith('@gmail.com') || email.endsWith('.ac.in');
};
const isValidPassword = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(value || ''));
const isValidPhone = (value) => /^\d{10}$/.test(normalizePhone(value));

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const sendEmailOtp = async (toEmail, otp) => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!host || !port || !user || !pass || !from) {
    console.log(`[OTP][EMAIL][MOCK] to=${toEmail} otp=${otp}`);
    return { ok: true, mode: 'mock' };
  }

  let nodemailer;
  try {
    // Optional dependency. If not installed, fallback to mock.
    nodemailer = require('nodemailer');
  } catch (err) {
    console.log(`[OTP][EMAIL][MOCK] nodemailer_missing to=${toEmail} otp=${otp}`);
    return { ok: true, mode: 'mock' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: 'Your OTP for Placement Eligibility App',
    text: `Your OTP is ${otp}. It expires in ${Math.max(30, Math.round(OTP_VERIFY_TTL_MS / 1000))} seconds.`,
  });

  return { ok: true, mode: 'smtp' };
};

const sendSmsOtp = async (toPhone, otp) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) {
    console.log(`[OTP][SMS][MOCK] to=${toPhone} otp=${otp}`);
    return { ok: true, mode: 'mock' };
  }

  const https = require('https');
  const postData = new URLSearchParams({
    To: `+91${toPhone}`,
    From: from,
    Body: `Your OTP is ${otp}. It expires in ${Math.max(30, Math.round(OTP_VERIFY_TTL_MS / 1000))} seconds.`,
  }).toString();

  const options = {
    hostname: 'api.twilio.com',
    path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
    method: 'POST',
    auth: `${accountSid}:${authToken}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) return resolve();
        return reject(new Error(`Twilio error ${res.statusCode}: ${body}`));
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  return { ok: true, mode: 'twilio' };
};

const seed = () => {
  db.users = [];
  db.students = [];

  const companySeed = [
    {
      name: 'Infosys',
      jobRole: 'Software Engineer',
      package: '6 LPA',
      minCGPA: 7.0,
      maxBacklogs: 0,
      eligibleDepartments: ['CSE', 'AI&DS', 'IT'],
      registrationDeadline: '2026-03-20',
      driveDate: '2026-03-25',
      driveStatus: 'open',
      description: 'Infosys campus hiring',
    },
    {
      name: 'TCS',
      jobRole: 'Ninja Developer',
      package: '4 LPA',
      minCGPA: 6.5,
      maxBacklogs: 0,
      eligibleDepartments: ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'IT', 'AI&DS'],
      registrationDeadline: '2026-03-18',
      driveDate: '2026-03-22',
      driveStatus: 'open',
      description: 'TCS Ninja drive',
    },
    {
      name: 'Wipro',
      jobRole: 'Project Engineer',
      package: '3.5 LPA',
      minCGPA: 6.0,
      maxBacklogs: 0,
      eligibleDepartments: ['CSE', 'IT'],
      registrationDeadline: '2026-03-21',
      driveDate: '2026-03-28',
      driveStatus: 'open',
      description: 'Wipro campus drive',
    },
    {
      name: 'Zoho',
      jobRole: 'Backend Developer',
      package: '8 LPA',
      minCGPA: 7.5,
      maxBacklogs: 0,
      eligibleDepartments: ['CSE', 'AI&DS'],
      registrationDeadline: '2026-03-19',
      driveDate: '2026-03-23',
      driveStatus: 'open',
      description: 'Zoho backend drive',
    },
    {
      name: 'HCL',
      jobRole: 'Software Trainee',
      package: '4.5 LPA',
      minCGPA: 6.5,
      maxBacklogs: 0,
      eligibleDepartments: ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'IT', 'AI&DS'],
      registrationDeadline: '2026-03-22',
      driveDate: '2026-03-26',
      driveStatus: 'open',
      description: 'HCL campus hiring',
    },
  ];

  db.companies = companySeed.map((c) => ({
    _id: uuidv4(),
    ...c,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));

  db.notifications.push(
    {
      _id: uuidv4(),
      title: 'Zoho Drive Registration',
      message: 'Apply before March 19',
      department: 'ALL',
      createdAt: nowIso(),
      isReadBy: [],
    },
    {
      _id: uuidv4(),
      title: 'TCS Drive Update',
      message: 'Drive date updated to March 22',
      department: 'ALL',
      createdAt: nowIso(),
      isReadBy: [],
    }
  );
};

const signToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
};

const getAuthToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (req.query && req.query.token) return req.query.token;
  return null;
};

const requireAuth = (req, res, next) => {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ success: false, message: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

const findStudentByUserId = (userId) => db.students.find((s) => s.userId === userId);

const normalizeCompanyDates = (company) => ({
  ...company,
  driveDate: company.driveDate ? new Date(company.driveDate).toISOString() : null,
  registrationDeadline: company.registrationDeadline ? new Date(company.registrationDeadline).toISOString() : null,
});

const computeEligibility = (student, company) => {
  const reasons = [];
  const passedChecks = {};

  if (!student || !company) {
    return { isEligible: false, reasons: ['Missing data'], passedChecks };
  }

  const cgpaOk = Number(student.cgpa) >= Number(company.minCGPA);
  passedChecks.cgpa = cgpaOk;
  if (!cgpaOk) reasons.push(`CGPA must be at least ${company.minCGPA}`);

  const backlogsOk = Number(student.backlogs || 0) <= Number(company.maxBacklogs || 0);
  passedChecks.backlogs = backlogsOk;
  if (!backlogsOk) reasons.push(`Backlogs must be at most ${company.maxBacklogs}`);

  const deptOk = (company.eligibleDepartments || []).includes(student.department);
  passedChecks.department = deptOk;
  if (!deptOk) reasons.push('Department not eligible');

  if (company.tenthPercentageMin != null) {
    const tenthOk = Number(student.tenthPercentage || 0) >= Number(company.tenthPercentageMin);
    passedChecks.tenthPercentage = tenthOk;
    if (!tenthOk) reasons.push(`10th % must be at least ${company.tenthPercentageMin}`);
  }

  if (company.twelfthPercentageMin != null) {
    const twelfthOk = Number(student.twelfthPercentage || 0) >= Number(company.twelfthPercentageMin);
    passedChecks.twelfthPercentage = twelfthOk;
    if (!twelfthOk) reasons.push(`12th % must be at least ${company.twelfthPercentageMin}`);
  }

  return { isEligible: reasons.length === 0, reasons, passedChecks };
};

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

app.get('/api/meta', (req, res) => {
  return res.json({
    success: true,
    version: process.env.npm_package_version || null,
    mongo: {
      ready: mongoReady,
      db: mongoReady ? mongoose.connection.name : null,
    },
    features: {
      deleteDocumentById: true,
      deleteResumeByCompany: true,
      adminStudentDetails: true,
      pdfOnlyUploads: true,
      maxUploadSizeMb: 5,
    },
  });
});

const cleanupOtpStore = () => {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (!record) otpStore.delete(key);
    else if (record.expiresAtMs && record.expiresAtMs < now) otpStore.delete(key);
    else if (record.verified && record.verifiedAtMs && now - record.verifiedAtMs > OTP_VERIFIED_TTL_MS) otpStore.delete(key);
  }
};

const requestOtpHandler = async (req, res) => {
  cleanupOtpStore();
  const { email, phone } = req.body || {};
  const emailLower = normalizeEmail(email);
  const phoneNorm = normalizePhone(phone);

  if (!isValidAllowedEmail(emailLower)) {
    return res.status(400).json({ success: false, message: 'Email must end with @gmail.com or .ac.in' });
  }
  if (!isValidPhone(phoneNorm)) {
    return res.status(400).json({ success: false, message: 'Mobile number must be 10 digits' });
  }

  if (ADMIN_EMAIL && emailLower === ADMIN_EMAIL) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }
  if (db.users.find((u) => u.email.toLowerCase() === emailLower)) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }
  if (mongoReady) {
    const existing = await User.findOne({ email: emailLower }).lean();
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const key = `${emailLower}|${phoneNorm}`;
  const now = Date.now();
  const existing = otpStore.get(key);
  if (existing?.nextSendAtMs && existing.nextSendAtMs > now) {
    const waitSec = Math.ceil((existing.nextSendAtMs - now) / 1000);
    return res.status(429).json({ success: false, message: `Please wait ${waitSec}s before requesting OTP again` });
  }

  const otp = generateOtp();
  const otpHash = bcrypt.hashSync(otp, 10);
  otpStore.set(key, {
    otpHash,
    createdAtMs: now,
    expiresAtMs: now + OTP_VERIFY_TTL_MS,
    attempts: 0,
    verified: false,
    verifiedAtMs: null,
    nextSendAtMs: now + OTP_RESEND_COOLDOWN_MS,
  });

  try {
    const [emailResult, smsResult] = await Promise.all([sendEmailOtp(emailLower, otp), sendSmsOtp(phoneNorm, otp)]);
    return res.json({
      success: true,
      delivery: { email: emailResult.mode, sms: smsResult.mode },
      ...(OTP_DEBUG ? { otp } : {}),
    });
  } catch (err) {
    otpStore.delete(key);
    return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

const verifyOtpHandler = (req, res) => {
  cleanupOtpStore();
  const { email, phone, otp } = req.body || {};
  const emailLower = normalizeEmail(email);
  const phoneNorm = normalizePhone(phone);
  const otpStr = String(otp || '').trim();

  if (!isValidAllowedEmail(emailLower) || !isValidPhone(phoneNorm)) {
    return res.status(400).json({ success: false, message: 'Invalid email or mobile number' });
  }
  if (!/^\d{6}$/.test(otpStr)) {
    return res.status(400).json({ success: false, message: 'OTP must be 6 digits' });
  }

  const key = `${emailLower}|${phoneNorm}`;
  const record = otpStore.get(key);
  if (!record) {
    return res.status(404).json({ success: false, message: 'OTP not found. Please request OTP again.' });
  }
  if (record.expiresAtMs && record.expiresAtMs < Date.now()) {
    otpStore.delete(key);
    return res.status(410).json({ success: false, message: 'OTP expired. Please request OTP again.' });
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    otpStore.delete(key);
    return res.status(429).json({ success: false, message: 'Too many attempts. Please request OTP again.' });
  }

  record.attempts += 1;
  const ok = bcrypt.compareSync(otpStr, record.otpHash);
  if (!ok) {
    otpStore.set(key, record);
    return res.status(401).json({ success: false, message: 'Invalid OTP' });
  }

  record.verified = true;
  record.verifiedAtMs = Date.now();
  otpStore.set(key, record);

  const otpToken = jwt.sign({ purpose: 'otp', email: emailLower, phone: phoneNorm }, JWT_SECRET, { expiresIn: '15m' });
  return res.json({ success: true, otpToken });
};

// Support both base URLs:
// - http://host:5000/api  -> /api/auth/*
// - http://host:5000      -> /auth/*
app.post('/api/auth/request-otp', requestOtpHandler);
app.post('/auth/request-otp', requestOtpHandler);
app.post('/api/auth/verify-otp', verifyOtpHandler);
app.post('/auth/verify-otp', verifyOtpHandler);

app.post('/api/auth/register', async (req, res) => {
  const { name, registerNumber, email, password, phone } = req.body || {};
  if (!name || !registerNumber || !email || !password || !phone) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const emailLower = normalizeEmail(email);
  const phoneNorm = normalizePhone(phone);

  if (!isValidNameCapsWithLastInitial(name)) {
    return res.status(400).json({ success: false, message: 'Full name must be uppercase with last initial' });
  }
  if (!isValidRegisterNumber(registerNumber)) {
    return res.status(400).json({ success: false, message: 'Register number must be 12 alphanumeric characters' });
  }
  if (!isValidAllowedEmail(emailLower)) {
    return res.status(400).json({ success: false, message: 'Email must end with @gmail.com or .ac.in' });
  }
  if (!isValidPassword(password)) {
    return res
      .status(400)
      .json({ success: false, message: 'Password must be 8+ chars with uppercase, lowercase, number and special char' });
  }
  if (!isValidPhone(phoneNorm)) {
    return res.status(400).json({ success: false, message: 'Mobile number must be 10 digits' });
  }

  if (ADMIN_EMAIL && emailLower === ADMIN_EMAIL) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }
  if (db.users.find((u) => u.email.toLowerCase() === emailLower)) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }
  if (mongoReady) {
    const existing = await User.findOne({ email: emailLower }).lean();
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const user = {
    id: uuidv4(),
    email: emailLower,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'student',
    name,
    registerNumber: String(registerNumber).trim().toUpperCase(),
    phone: phoneNorm,
    createdAt: nowIso(),
  };

  const student = {
    _id: uuidv4(),
    userId: user.id,
    name,
    registerNumber: user.registerNumber,
    degree: '',
    department: 'AI&DS',
    cgpa: 7.0,
    backlogs: 0,
    phone: phoneNorm,
    batch: '',
    historyOfArrears: 0,
    tenthPercentage: 0,
    twelfthPercentage: 0,
    profileComplete: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  try {
    if (mongoReady) {
      await User.create(user);
      await Student.create(student);
    }
    db.users.push(user);
    db.students.push(student);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to register user' });
  }

  const token = signToken(user);
  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      degree: student.degree,
      registerNumber: user.registerNumber,
      phone: phoneNorm,
      department: student.department,
      cgpa: student.cgpa,
      backlogs: student.backlogs,
      profileComplete: student.profileComplete,
    },
  });
});

app.post('/api/auth/create-admin', (req, res) => {
  return res.status(403).json({ success: false, message: 'Admin creation is disabled' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const emailLower = String(email || '').toLowerCase();

  if (ADMIN_EMAIL && emailLower === ADMIN_EMAIL) {
    const inputPassword = String(password || '').trim();
    const ok = ADMIN_PASSWORD
      ? ADMIN_PASSWORD.startsWith('$2')
        ? bcrypt.compareSync(inputPassword, ADMIN_PASSWORD)
        : inputPassword === ADMIN_PASSWORD
      : false;

    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const adminUser = {
      id: 'admin_env',
      email: ADMIN_EMAIL,
      role: 'admin',
      name: ADMIN_NAME,
    };
    const token = signToken(adminUser);
    return res.json({ success: true, token, user: adminUser });
  }

  const user = db.users.find((u) => u.email.toLowerCase() === emailLower);
  if (!user || user.role !== 'student' || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = signToken(user);
  const student = user.role === 'student' ? findStudentByUserId(user.id) : null;
  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      registerNumber: student?.registerNumber,
      department: student?.department,
      cgpa: student?.cgpa,
      backlogs: student?.backlogs,
    },
  });
});

app.get('/api/companies', requireAuth, (req, res) => {
  return res.json({
    success: true,
    companies: db.companies.map(normalizeCompanyDates),
  });
});

app.post('/api/companies', requireAuth, requireRole('admin'), async (req, res) => {
  const payload = req.body || {};
  const required = [
    'name',
    'minCGPA',
    'maxBacklogs',
    'package',
    'description',
    'jobRole',
    'location',
    'driveDate',
    'registrationDeadline',
    'tenthPercentageMin',
    'twelfthPercentageMin',
    'eligibleDepartments',
  ];
  const missing = required.filter((k) => payload[k] === undefined || payload[k] === null || payload[k] === '');
  if (missing.length) {
    return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
  }
  if (!Array.isArray(payload.eligibleDepartments) || payload.eligibleDepartments.length === 0) {
    return res.status(400).json({ success: false, message: 'eligibleDepartments must be a non-empty array' });
  }

  const driveDate = new Date(payload.driveDate);
  const registrationDeadline = new Date(payload.registrationDeadline);
  if (Number.isNaN(driveDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid driveDate' });
  }
  if (Number.isNaN(registrationDeadline.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid registrationDeadline' });
  }

  const tenth = Number(payload.tenthPercentageMin);
  const twelfth = Number(payload.twelfthPercentageMin);
  if (!Number.isFinite(tenth) || tenth < 0 || tenth > 100) {
    return res.status(400).json({ success: false, message: 'Invalid tenthPercentageMin' });
  }
  if (!Number.isFinite(twelfth) || twelfth < 0 || twelfth > 100) {
    return res.status(400).json({ success: false, message: 'Invalid twelfthPercentageMin' });
  }

  const company = {
    _id: uuidv4(),
    name: String(payload.name || '').trim(),
    minCGPA: Number(payload.minCGPA),
    maxBacklogs: Number(payload.maxBacklogs),
    package: String(payload.package || '').trim(),
    eligibleDepartments: payload.eligibleDepartments,
    description: String(payload.description || '').trim(),
    jobRole: String(payload.jobRole || '').trim(),
    location: String(payload.location || '').trim(),
    driveDate: driveDate.toISOString(),
    registrationDeadline: registrationDeadline.toISOString(),
    driveStatus: payload.driveStatus || 'open',
    tenthPercentageMin: tenth,
    twelfthPercentageMin: twelfth,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  try {
    if (mongoReady) await Company.create(company);
    db.companies.unshift(company);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create company' });
  }
  return res.json({ success: true, company: normalizeCompanyDates(company) });
});

app.put('/api/companies/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const company = db.companies.find((c) => c._id === req.params.id);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  const payload = req.body || {};
  const updates = {
    jobRole: payload.jobRole ?? company.jobRole,
    location: payload.location ?? company.location,
    driveDate: payload.driveDate ?? company.driveDate,
    registrationDeadline: payload.registrationDeadline ?? company.registrationDeadline,
    driveStatus: payload.driveStatus ?? company.driveStatus,
    updatedAt: nowIso(),
  };
  try {
    if (mongoReady) await Company.updateOne({ _id: company._id }, { $set: updates });
    Object.assign(company, updates);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update company' });
  }

  return res.json({ success: true, company: normalizeCompanyDates(company) });
});

app.delete('/api/companies/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const idx = db.companies.findIndex((c) => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Company not found' });
  const [removed] = db.companies.splice(idx, 1);
  try {
    if (mongoReady) await Company.deleteOne({ _id: removed._id });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete company' });
  }
  return res.json({ success: true });
});

app.get('/api/students/profile', requireAuth, requireRole('student'), (req, res) => {
  const student = findStudentByUserId(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  const normalized = {
    ...student,
    degree: student.degree || '',
    profileComplete: Boolean(student.profileComplete),
  };
  return res.json({ success: true, student: normalized });
});

app.put('/api/students/profile', requireAuth, requireRole('student'), async (req, res) => {
  const student = findStudentByUserId(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  const payload = req.body || {};
  const updates = {
    name: payload.name ?? student.name,
    registerNumber: payload.registerNumber ?? student.registerNumber,
    phone: payload.phone ?? student.phone,
    degree: payload.degree ?? student.degree,
    department: payload.department ?? student.department,
    batch: payload.batch ?? student.batch,
    cgpa: payload.cgpa ?? student.cgpa,
    backlogs: payload.backlogs ?? student.backlogs,
    historyOfArrears: payload.historyOfArrears ?? student.historyOfArrears,
    tenthPercentage: payload.tenthPercentage ?? student.tenthPercentage,
    twelfthPercentage: payload.twelfthPercentage ?? student.twelfthPercentage,
    profileComplete: true,
    updatedAt: nowIso(),
  };
  try {
    if (mongoReady) {
      await Student.updateOne({ _id: student._id }, { $set: updates });
    }
    Object.assign(student, updates);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update student profile' });
  }
  return res.json({ success: true, student });
});

app.get('/api/students/dashboard', requireAuth, requireRole('student'), (req, res) => {
  const student = findStudentByUserId(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  const eligibilityResults = db.companies.map((c) => computeEligibility(student, c));
  const eligibleCount = eligibilityResults.filter((r) => r.isEligible).length;
  const totalCompanies = db.companies.length;
  const notEligible = totalCompanies - eligibleCount;

  const studentApps = db.applications.filter((a) => a.studentId === student._id);
  const applied = studentApps.length;
  const shortlisted = studentApps.filter((a) => a.status === 'shortlisted').length;

  return res.json({
    success: true,
    dashboard: {
      totalCompanies,
      eligible: eligibleCount,
      notEligible,
      applied,
      shortlisted,
    },
  });
});

app.get('/api/students/eligible-companies', requireAuth, requireRole('student'), (req, res) => {
  const student = findStudentByUserId(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  const companies = db.companies.filter((c) => computeEligibility(student, c).isEligible);
  return res.json({ success: true, companies: companies.map(normalizeCompanyDates) });
});

app.get('/api/students/eligibility', requireAuth, requireRole('student'), (req, res) => {
  const student = findStudentByUserId(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  const results = db.companies.map((company) => {
    const { isEligible, reasons, passedChecks } = computeEligibility(student, company);
    return {
      company: normalizeCompanyDates(company),
      isEligible,
      reasons,
      passedChecks,
    };
  });

  const eligibleCount = results.filter((r) => r.isEligible).length;
  return res.json({
    success: true,
    summary: { total: results.length, eligible: eligibleCount },
    studentProfile: {
      cgpa: student.cgpa,
      tenthPercentage: student.tenthPercentage,
      twelfthPercentage: student.twelfthPercentage,
      backlogs: student.backlogs,
    },
    results,
  });
});

app.get('/api/documents/my-docs', requireAuth, requireRole('student'), (req, res) => {
  const student = findStudentByUserId(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  const docs = db.documents.filter((d) => d.studentId === student._id);
  return res.json({ success: true, count: docs.length, documents: docs });
});

app.delete('/api/documents/resume/:companyId', requireAuth, requireRole('student'), async (req, res) => {
  const student = findStudentByUserId(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  const companyId = req.params.companyId;

  const docIndex = db.documents.findIndex(
    (d) => d.studentId === student._id && d.companyId === companyId && d.documentType === 'resume'
  );
  if (docIndex === -1) return res.status(404).json({ success: false, message: 'Resume not found' });

  const [doc] = db.documents.splice(docIndex, 1);
  try {
    if (mongoReady) {
      await Document.deleteOne({ _id: doc._id });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete resume' });
  }

  try {
    const filename = String(doc.fileUrl || '').split('/uploads/')[1];
    if (filename) {
      const filepath = path.join(uploadDir, filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
  } catch (err) {}

  return res.json({ success: true, message: 'Resume deleted' });
});

app.delete('/api/documents/:id', requireAuth, requireRole('student'), async (req, res) => {
  const student = findStudentByUserId(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  const docId = req.params.id;

  const docIndex = db.documents.findIndex((d) => d._id === docId && d.studentId === student._id);
  if (docIndex === -1) return res.status(404).json({ success: false, message: 'Document not found' });

  const [doc] = db.documents.splice(docIndex, 1);
  try {
    if (mongoReady) {
      await Document.deleteOne({ _id: doc._id });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete document' });
  }

  try {
    const filename = String(doc.fileUrl || '').split('/uploads/')[1];
    if (filename) {
      const filepath = path.join(uploadDir, filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
  } catch (err) {}

  return res.json({ success: true, message: 'Document deleted' });
});

app.post('/api/applications/check-resume', requireAuth, requireRole('student'), upload.single('document'), (req, res) => {
  const resumeScore = Math.floor(45 + Math.random() * 50);
  const minRequiredScore = 60;
  const suggestions = [
    'Add 2-3 impactful project bullet points.',
    'Quantify achievements with numbers.',
    'Ensure ATS-friendly formatting.',
  ];
  return res.json({ success: true, resumeScore, minRequiredScore, suggestions });
});

app.post(
  '/api/applications/apply/:companyId',
  requireAuth,
  requireRole('student'),
  upload.single('document'),
  async (req, res) => {
  const student = findStudentByUserId(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  const company = db.companies.find((c) => c._id === req.params.companyId);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  const resumeScore = Math.floor(40 + Math.random() * 60);
  const minRequiredScore = 60;
  if (resumeScore < minRequiredScore) {
    return res.status(400).json({
      success: false,
      message: 'Resume score too low',
      resumeScore,
      minRequiredScore,
    });
  }

  const existing = db.applications.find((a) => a.studentId === student._id && a.companyId === company._id);
  if (!existing) {
    const application = {
      _id: uuidv4(),
      studentId: student._id,
      companyId: company._id,
      status: 'applied',
      createdAt: nowIso(),
    };
    try {
      if (mongoReady) await Application.create(application);
      db.applications.push(application);
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to create application' });
    }
  }

  if (req.file) {
    const fileUrl = `/uploads/${req.file.filename}`;
    const existingDoc = db.documents.find(
      (d) => d.studentId === student._id && d.companyId === company._id && d.documentType === 'resume'
    );
    try {
      if (existingDoc) {
        try {
          const filepath = path.join(uploadDir, req.file.filename);
          if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        } catch (err) {}
        return res.status(409).json({
          success: false,
          message: 'Resume already uploaded for this company. Delete the old resume to upload a new one.',
        });
      } else {
        const doc = {
          _id: uuidv4(),
          studentId: student._id,
          companyId: company._id,
          documentType: 'resume',
          fileUrl,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        if (mongoReady) await Document.create(doc);
        db.documents.push(doc);
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to save document' });
    }
  }

  return res.json({ success: true, message: 'Application submitted' });
});

app.get('/api/applications/stats', requireAuth, requireRole('admin'), (req, res) => {
  const totalApplications = db.applications.length;
  const shortlisted = db.applications.filter((a) => a.status === 'shortlisted').length;
  const selected = db.applications.filter((a) => a.status === 'selected').length;
  const totalPlaced = selected;

  const deptStats = departments.map((dept) => {
    const deptStudents = db.students.filter((s) => s.department === dept);
    const total = deptStudents.length;
    const placed = deptStudents.filter((s) =>
      db.applications.some((a) => a.studentId === s._id && a.status === 'selected')
    ).length;
    const avgCGPA =
      total === 0 ? 0 : deptStudents.reduce((sum, s) => sum + Number(s.cgpa || 0), 0) / total;
    return { _id: dept, total, placed, avgCGPA };
  });

  return res.json({
    success: true,
    stats: {
      totalStudents: db.students.length,
      totalCompanies: db.companies.length,
      totalApplications,
      shortlisted,
      selected,
      totalPlaced,
      placementRate: db.students.length ? ((totalPlaced / db.students.length) * 100).toFixed(1) : '0.0',
    },
    deptStats,
  });
});

app.get('/api/admin/stats', requireAuth, requireRole('admin'), (req, res) => {
  const totalDocuments = db.documents.length;
  const avgCGPA =
    db.students.length === 0
      ? 0
      : (
          db.students.reduce((sum, s) => sum + Number(s.cgpa || 0), 0) / db.students.length
        ).toFixed(2);

  const chart = departments.reduce(
    (acc, dept) => {
      const count = db.students.filter((s) => s.department === dept).length;
      if (count > 0) {
        acc.labels.push(dept);
        acc.data.push(count);
      }
      return acc;
    },
    { labels: [], data: [] }
  );

  return res.json({
    success: true,
    stats: {
      totalCompanies: db.companies.length,
      totalStudents: db.students.length,
      avgCGPA,
      totalDocuments,
    },
    chart,
  });
});

app.get('/api/admin/users', requireAuth, requireRole('admin'), (req, res) => {
  const users = db.users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    name: u.name,
    registerNumber: u.registerNumber,
    createdAt: u.createdAt,
  }));
  return res.json({ success: true, users });
});

app.get('/api/admin/student/:studentId', requireAuth, requireRole('admin'), async (req, res) => {
  const studentId = req.params.studentId;

  try {
    let student = db.students.find((s) => s._id === studentId) || null;
    let user = student ? db.users.find((u) => u.id === student.userId) || null : null;
    let documents = db.documents.filter((d) => d.studentId === studentId);
    let applications = db.applications.filter((a) => a.studentId === studentId);

    if (mongoReady) {
      const studentDoc = await Student.findOne({ _id: studentId }).lean();
      const userId = studentDoc?.userId || student?.userId || null;
      const [userDoc, docs, apps] = await Promise.all([
        userId ? User.findOne({ id: userId }, { _id: 0, passwordHash: 0 }).lean() : Promise.resolve(null),
        Document.find({ studentId }).lean(),
        Application.find({ studentId }).lean(),
      ]);
      student = studentDoc || student;
      user = userDoc || user;
      documents = docs || documents;
      applications = apps || applications;
    }

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    documents.sort((a, b) =>
      String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
    );
    applications.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    return res.json({
      success: true,
      student,
      user: user ? { id: user.id, email: user.email, role: user.role, name: user.name } : null,
      documents,
      applications,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load student details' });
  }
});

app.get('/api/admin/students', requireAuth, requireRole('admin'), (req, res) => {
  const { department, minCGPA, search } = req.query || {};
  let students = [...db.students];
  if (department) {
    students = students.filter((s) => s.department?.toLowerCase() === String(department).toLowerCase());
  }
  if (minCGPA) {
    students = students.filter((s) => Number(s.cgpa || 0) >= Number(minCGPA));
  }
  if (search) {
    const query = String(search).toLowerCase();
    students = students.filter((s) => {
      const user = db.users.find((u) => u.id === s.userId);
      return (
        s.name?.toLowerCase().includes(query) ||
        s.registerNumber?.toLowerCase().includes(query) ||
        user?.email?.toLowerCase().includes(query)
      );
    });
  }

  return res.json({ success: true, students });
});

app.get('/api/admin/eligible-students/:companyId', requireAuth, requireRole('admin'), (req, res) => {
  const company = db.companies.find((c) => c._id === req.params.companyId);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  const students = db.students.filter((s) => computeEligibility(s, company).isEligible);
  return res.json({ success: true, students });
});

app.get('/api/notifications/my', requireAuth, requireRole('student'), (req, res) => {
  const student = findStudentByUserId(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  const notifications = db.notifications.map((n) => ({
    _id: n._id,
    title: n.title,
    message: n.message,
    createdAt: n.createdAt,
    isRead: n.isReadBy.includes(student._id),
  }));
  return res.json({ success: true, notifications });
});

app.put('/api/notifications/read-all', requireAuth, requireRole('student'), async (req, res) => {
  const student = findStudentByUserId(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  try {
    db.notifications.forEach((n) => {
      if (!n.isReadBy.includes(student._id)) n.isReadBy.push(student._id);
    });
    if (mongoReady) {
      await Notification.updateMany(
        { isReadBy: { $ne: student._id } },
        { $addToSet: { isReadBy: student._id } }
      );
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
  return res.json({ success: true });
});

app.put('/api/notifications/:id/read', requireAuth, requireRole('student'), async (req, res) => {
  const student = findStudentByUserId(req.user.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  const notification = db.notifications.find((n) => n._id === req.params.id);
  if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
  try {
    if (!notification.isReadBy.includes(student._id)) notification.isReadBy.push(student._id);
    if (mongoReady) {
      await Notification.updateOne({ _id: notification._id }, { $addToSet: { isReadBy: student._id } });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
  return res.json({ success: true });
});

app.post('/api/notifications/broadcast', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, message, department } = req.body || {};
  if (!title || !message) {
    return res.status(400).json({ success: false, message: 'Title and message are required' });
  }
  const notification = {
    _id: uuidv4(),
    title,
    message,
    department: department || 'ALL',
    createdAt: nowIso(),
    isReadBy: [],
  };
  try {
    if (mongoReady) await Notification.create(notification);
    db.notifications.unshift(notification);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create notification' });
  }
  return res.json({ success: true, notification });
});

app.post('/api/notifications/new-drive/:companyId', requireAuth, requireRole('admin'), async (req, res) => {
  const company = db.companies.find((c) => c._id === req.params.companyId);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
  const notification = {
    _id: uuidv4(),
    title: `${company.name} Drive Update`,
    message: `${company.name} drive is ${company.driveStatus || 'open'}. Apply before ${company.registrationDeadline || 'N/A'}.`,
    department: 'ALL',
    createdAt: nowIso(),
    isReadBy: [],
  };
  try {
    if (mongoReady) await Notification.create(notification);
    db.notifications.unshift(notification);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create notification' });
  }
  return res.json({ success: true, message: 'Notified students', notification });
});

const csvEscape = (value) => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const sendCsv = (res, filename, rows) => {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(content);
};

app.get('/api/excel/template', requireAuth, requireRole('admin'), (req, res) => {
  const rows = [
    ['Name', 'RegisterNumber', 'Department', 'CGPA', 'Backlogs', '10th%', '12th%'],
    ['Jane Doe', 'AI2026002', 'AI&DS', '7.5', '0', '85', '82'],
  ];
  return sendCsv(res, 'student_template.csv', rows);
});

app.get('/api/excel/export-students', requireAuth, requireRole('admin'), (req, res) => {
  const rows = [
    ['Name', 'RegisterNumber', 'Department', 'CGPA', 'Backlogs', '10th%', '12th%'],
    ...db.students.map((s) => [
      s.name,
      s.registerNumber,
      s.department,
      s.cgpa,
      s.backlogs,
      s.tenthPercentage,
      s.twelfthPercentage,
    ]),
  ];
  return sendCsv(res, 'students.csv', rows);
});

app.get('/api/excel/export-eligible/:companyId', requireAuth, requireRole('admin'), (req, res) => {
  const company = db.companies.find((c) => c._id === req.params.companyId);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
  const eligible = db.students.filter((s) => computeEligibility(s, company).isEligible);
  const rows = [
    ['Name', 'RegisterNumber', 'Department', 'CGPA', 'Backlogs'],
    ...eligible.map((s) => [s.name, s.registerNumber, s.department, s.cgpa, s.backlogs]),
  ];
  return sendCsv(res, `eligible_${company.name}.csv`, rows);
});

app.post('/api/excel/import-students', requireAuth, requireRole('admin'), upload.single('file'), (req, res) => {
  return res.json({ success: true, message: 'Import processed (demo)' });
});

app.use((err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Max file size is 5 MB (PDF only)' });
    }
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message || 'Upload error' });
    }
  }
  return next(err);
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const initMongoAndSync = async () => {
  if (!MONGODB_URI) return;
  try {
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
    await Promise.all([
      User.init(),
      Student.init(),
      Company.init(),
      Application.init(),
      Document.init(),
      Notification.init(),
    ]);
    mongoReady = true;
    // eslint-disable-next-line no-console
    console.log(`MongoDB connected (db: ${mongoose.connection.name})`);

    const demoEmails = [
      'student12345@bitsathy.ac.in',
      'student@bitsathy.ac.in',
      'admin12345@bitsathy.ac.in',
      'admin@bitsathy.ac.in',
    ];
    const demoUsers = await User.find({ email: { $in: demoEmails } }).lean();
    if (demoUsers.length) {
      const demoUserIds = demoUsers.map((u) => u.id);
      await Promise.all([
        User.deleteMany({ id: { $in: demoUserIds } }),
        Student.deleteMany({ userId: { $in: demoUserIds } }),
      ]);
    }

    const [userCount, studentCount, companyCount, applicationCount, documentCount, notificationCount] =
      await Promise.all([
        User.estimatedDocumentCount(),
        Student.estimatedDocumentCount(),
        Company.estimatedDocumentCount(),
        Application.estimatedDocumentCount(),
        Document.estimatedDocumentCount(),
        Notification.estimatedDocumentCount(),
      ]);

    if (userCount === 0 && db.users.length) await User.insertMany(db.users);
    if (studentCount === 0 && db.students.length) await Student.insertMany(db.students);
    if (companyCount === 0 && db.companies.length) await Company.insertMany(db.companies);
    if (applicationCount === 0 && db.applications.length) await Application.insertMany(db.applications);
    if (documentCount === 0 && db.documents.length) await Document.insertMany(db.documents);
    if (notificationCount === 0 && db.notifications.length) await Notification.insertMany(db.notifications);

    const [users, students, companies, applications, documents, notifications] = await Promise.all([
      User.find({}, { _id: 0 }).lean(),
      Student.find({}).lean(),
      Company.find({}).lean(),
      Application.find({}).lean(),
      Document.find({}).lean(),
      Notification.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    db.users = users;
    db.students = students;
    db.companies = companies;
    db.applications = applications;
    db.documents = documents;
    db.notifications = notifications;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection failed; running with in-memory DB only.', err.message || err);
    mongoReady = false;
  }
};

const startServer = async () => {
  seed();
  await initMongoAndSync();
  app.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on http://localhost:${PORT} (listening on ${HOST}:${PORT})`);
  });
};

startServer();
