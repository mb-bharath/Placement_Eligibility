// seed.js
// Seed demo admin, students, companies, and applications

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Company = require('./models/Company');
const Application = require('./models/Application');
const Document = require('./models/Document');

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/placement_db';

const allDepts = ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'IT', 'AI&DS'];
const HOST_URL = 'http://localhost:5000';

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

const writeDummyPdf = (filePath) => {
  const content = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
      '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n' +
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\n' +
      'xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000062 00000 n \n0000000117 00000 n \n' +
      'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n178\n%%EOF\n',
    'utf-8'
  );
  fs.writeFileSync(filePath, content);
};

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');

    // Clean existing data
    await Promise.all([
      Application.deleteMany({}),
      Document.deleteMany({}),
      Company.deleteMany({}),
      User.deleteMany({}),
    ]);

    // Ensure upload folders exist
    const resumeDir = path.join(__dirname, 'uploads', 'resumes');
    const marksheetDir = path.join(__dirname, 'uploads', 'marksheets');
    ensureDir(resumeDir);
    ensureDir(marksheetDir);

    // Demo Admin
    const admin = await User.create({
      name: 'Demo Admin',
      email: 'admin12345@bitsathy.ac.in',
      password: 'admin12345',
      role: 'admin',
    });
    console.log('Admin:', admin.email);

    // Demo Students
    const demoStudent = await User.create({
      name: 'Demo Student',
      email: 'student12345@bitsathy.ac.in',
      password: 'student12345',
      role: 'student',
      registerNumber: 'AI2026001',
      department: 'AI&DS',
      cgpa: 7.8,
      backlogs: 0,
      tenthPercentage: 85,
      twelfthPercentage: 82,
      isProfileComplete: true,
    });

    const rahul = await User.create({
      name: 'Rahul Kumar',
      email: 'rahul.kumar@bitsathy.ac.in',
      password: 'rahul12345',
      role: 'student',
      registerNumber: 'CSE2026002',
      department: 'CSE',
      cgpa: 6.9,
      backlogs: 0,
      tenthPercentage: 80,
      twelfthPercentage: 78,
      isProfileComplete: true,
    });

    const priya = await User.create({
      name: 'Priya Sharma',
      email: 'priya.sharma@bitsathy.ac.in',
      password: 'priya12345',
      role: 'student',
      registerNumber: 'IT2026003',
      department: 'IT',
      cgpa: 8.2,
      backlogs: 0,
      tenthPercentage: 90,
      twelfthPercentage: 88,
      isProfileComplete: true,
    });

    console.log('Students:', demoStudent.email, rahul.email, priya.email);

    // Companies
    const companies = await Company.insertMany([
      {
        name: 'Infosys',
        jobRole: 'Software Engineer',
        package: '6 LPA',
        minCGPA: 7.0,
        maxBacklogs: 0,
        eligibleDepartments: ['CSE', 'AI&DS', 'IT'],
        registrationDeadline: new Date('2026-03-20'),
        driveDate: new Date('2026-03-25'),
        driveStatus: 'open',
        description: 'Infosys campus hiring',
        createdBy: admin._id,
      },
      {
        name: 'TCS',
        jobRole: 'Ninja Developer',
        package: '4 LPA',
        minCGPA: 6.5,
        maxBacklogs: 0,
        eligibleDepartments: allDepts,
        registrationDeadline: new Date('2026-03-18'),
        driveDate: new Date('2026-03-22'),
        driveStatus: 'open',
        description: 'TCS Ninja drive',
        createdBy: admin._id,
      },
      {
        name: 'Wipro',
        jobRole: 'Project Engineer',
        package: '3.5 LPA',
        minCGPA: 6.0,
        maxBacklogs: 0,
        eligibleDepartments: ['CSE', 'IT'],
        registrationDeadline: new Date('2026-03-21'),
        driveDate: new Date('2026-03-28'),
        driveStatus: 'open',
        description: 'Wipro campus drive',
        createdBy: admin._id,
      },
      {
        name: 'Zoho',
        jobRole: 'Backend Developer',
        package: '8 LPA',
        minCGPA: 7.5,
        maxBacklogs: 0,
        eligibleDepartments: ['CSE', 'AI&DS'],
        registrationDeadline: new Date('2026-03-19'),
        driveDate: new Date('2026-03-23'),
        driveStatus: 'open',
        description: 'Zoho backend drive',
        createdBy: admin._id,
      },
      {
        name: 'HCL',
        jobRole: 'Software Trainee',
        package: '4.5 LPA',
        minCGPA: 6.5,
        maxBacklogs: 0,
        eligibleDepartments: allDepts,
        registrationDeadline: new Date('2026-03-22'),
        driveDate: new Date('2026-03-26'),
        driveStatus: 'open',
        description: 'HCL campus hiring',
        createdBy: admin._id,
      },
    ]);

    const [infosys, tcs] = companies;

    // Create dummy PDFs for resumes and marksheets
    const demoResumeFile = path.join(resumeDir, 'demo-student-resume.pdf');
    const rahulResumeFile = path.join(resumeDir, 'rahul-resume.pdf');
    const priyaResumeFile = path.join(resumeDir, 'priya-resume.pdf');
    writeDummyPdf(demoResumeFile);
    writeDummyPdf(rahulResumeFile);
    writeDummyPdf(priyaResumeFile);

    const demo10thFile = path.join(marksheetDir, 'demo-10th.pdf');
    const demo12thFile = path.join(marksheetDir, 'demo-12th.pdf');
    writeDummyPdf(demo10thFile);
    writeDummyPdf(demo12thFile);

    const demoResumeDoc = await Document.create({
      student: demoStudent._id,
      documentType: 'resume',
      originalName: 'resume_demo.pdf',
      fileName: 'demo-student-resume.pdf',
      filePath: demoResumeFile,
      fileUrl: `${HOST_URL}/uploads/resumes/demo-student-resume.pdf`,
      mimeType: 'application/pdf',
      fileSize: fs.statSync(demoResumeFile).size,
      isVerified: true,
    });

    const demo10thDoc = await Document.create({
      student: demoStudent._id,
      documentType: 'tenth_marksheet',
      originalName: 'tenth_marksheet.pdf',
      fileName: 'demo-10th.pdf',
      filePath: demo10thFile,
      fileUrl: `${HOST_URL}/uploads/marksheets/demo-10th.pdf`,
      mimeType: 'application/pdf',
      fileSize: fs.statSync(demo10thFile).size,
      isVerified: true,
    });

    const demo12thDoc = await Document.create({
      student: demoStudent._id,
      documentType: 'twelfth_marksheet',
      originalName: 'twelfth_marksheet.pdf',
      fileName: 'demo-12th.pdf',
      filePath: demo12thFile,
      fileUrl: `${HOST_URL}/uploads/marksheets/demo-12th.pdf`,
      mimeType: 'application/pdf',
      fileSize: fs.statSync(demo12thFile).size,
      isVerified: true,
    });

    await User.findByIdAndUpdate(demoStudent._id, {
      $push: { documents: { $each: [demoResumeDoc._id, demo10thDoc._id, demo12thDoc._id] } },
    });

    // Applications (demo student)
    await Application.create([
      {
        student: demoStudent._id,
        company: infosys._id,
        status: 'applied',
        appliedAt: new Date(),
        resumeId: demoResumeDoc._id,
        resumeUrl: demoResumeDoc.fileUrl,
        resumeFileName: demoResumeDoc.originalName,
      },
      {
        student: demoStudent._id,
        company: tcs._id,
        status: 'shortlisted',
        appliedAt: new Date(),
        shortlistedAt: new Date(),
        resumeId: demoResumeDoc._id,
        resumeUrl: demoResumeDoc.fileUrl,
        resumeFileName: demoResumeDoc.originalName,
      },
    ]);

    // Optional: mark one student as placed for admin stats
    await User.findByIdAndUpdate(priya._id, {
      isPlaced: true,
      placedCompany: 'Zoho',
      placedPackage: '8 LPA',
      placedDate: new Date('2026-03-11'),
    });

    console.log(`${companies.length} companies created`);
    console.log('Seed complete');
    console.log('Demo Credentials:');
    console.log('Admin   -> admin12345@bitsathy.ac.in / admin12345');
    console.log('Student -> student12345@bitsathy.ac.in / student12345');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message || err);
    process.exit(1);
  }
};

seedData();
