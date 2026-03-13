// ============================================================
// server.js  —  Placement Eligibility App Backend  v2.0
// Tech Stack : Node.js + Express + MongoDB + JWT + Multer
// NEW: Applications, Resume Strength, Notifications, Excel
// ============================================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/authRoutes'));
app.use('/api/students',       require('./routes/studentRoutes'));
app.use('/api/companies',      require('./routes/companyRoutes'));
app.use('/api/admin',          require('./routes/adminRoutes'));
app.use('/api/documents',      require('./routes/documentRoutes'));
app.use('/api/applications',   require('./routes/applicationRoutes'));   // NEW
app.use('/api/notifications',  require('./routes/notificationRoutes'));  // NEW
app.use('/api/excel',          require('./routes/excelRoutes'));         // NEW

// ── Health Check ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: '🎓 BIT Sathy Placement Eligibility API v2.0',
    features: [
      '✅ JWT Auth (Student + Admin)',
      '✅ Eligibility Check (CGPA + 10th% + 12th% + Arrears + Dept)',
      '✅ File Uploader (PDF, JPG, PNG — max 5MB)',
      '✅ Resume Strength Checker (AI scoring ≥ 60% to apply)',
      '✅ Application System (apply per company, one resume per company)',
      '✅ Email Notifications (drive alerts, shortlist, results)',
      '✅ Admin: Add/Edit/Delete Companies + Set Criteria',
      '✅ Admin: Bulk Import Students from Excel',
      '✅ Admin: Export Eligible Students as Excel',
      '✅ Placement Tracker (mark placed, stats)',
    ],
  });
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── Connect & Start ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/placement_db';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');

    const ensureDemoAdmin = async () => {
      const demoEmail = 'admin12345@bitsathy.ac.in';
      const existing = await User.findOne({ email: demoEmail });
      if (existing) return;

      await User.create({
        name: 'Demo Admin',
        email: demoEmail,
        password: 'admin12345',
        role: 'admin',
      });
      console.log('👤 Demo admin created:', demoEmail);
    };

    ensureDemoAdmin().catch((err) => {
      console.error('❌ Demo admin creation error:', err.message);
    });

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`📋 API Docs: http://localhost:${PORT}/`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
