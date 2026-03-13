// routes/studentRoutes.js  ─ v2.0
// Matches StudentProfileScreen.js  →  GET/PUT /api/students/profile
// NEW: tenthPercentage, twelfthPercentage, phone, historyOfArrears

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Company = require('../models/Company');
const { checkEligibility } = require('../utils/eligibilityChecker');

router.use(protect);

// ── GET /api/students/profile ─────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const student = await User.findById(req.user._id)
      .select('-password')
      .populate('documents');
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/students/profile ─────────────────────────────────
// Body: { name, registerNumber, phone, department, batch,
//         cgpa, backlogs, historyOfArrears,
//         tenthPercentage, twelfthPercentage }
router.put(
  '/profile',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('registerNumber').notEmpty().withMessage('Register number is required'),
    body('department').isIn(['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'IT', 'AI&DS']).withMessage('Invalid department'),
    body('cgpa').isFloat({ min: 0, max: 10 }).withMessage('CGPA must be 0–10'),
    body('backlogs').isInt({ min: 0 }).withMessage('Backlogs must be ≥ 0'),
    body('tenthPercentage').isFloat({ min: 0, max: 100 }).withMessage('10th % must be 0–100'),
    body('twelfthPercentage').isFloat({ min: 0, max: 100 }).withMessage('12th % must be 0–100'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name, registerNumber, phone, department, batch,
      cgpa, backlogs, historyOfArrears,
      tenthPercentage, twelfthPercentage,
    } = req.body;

    try {
      const existing = await User.findOne({ registerNumber, _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Register number already in use' });
      }

      const updated = await User.findByIdAndUpdate(
        req.user._id,
        {
          name, registerNumber, phone: phone || '',
          department, batch: batch || '',
          cgpa: parseFloat(cgpa), backlogs: parseInt(backlogs),
          historyOfArrears: parseInt(historyOfArrears) || 0,
          tenthPercentage: parseFloat(tenthPercentage),
          twelfthPercentage: parseFloat(twelfthPercentage),
          isProfileComplete: true,
        },
        { new: true, runValidators: true }
      ).select('-password');

      res.json({ success: true, message: 'Profile updated successfully', student: updated });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ── GET /api/students/eligibility ────────────────────────────
// Returns eligibility for all active companies with full criteria breakdown
router.get('/eligibility', async (req, res) => {
  try {
    const student = req.user;

    if (!student.cgpa || !student.department) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your profile (CGPA, 10th%, 12th%, Department) to check eligibility',
      });
    }

    const companies = await Company.find({ isActive: true });

    const results = companies.map((company) => {
      const { isEligible, reasons, passedChecks } = checkEligibility(student, company);
      return {
        company: {
          id: company._id,
          name: company.name,
          package: company.package,
          minCGPA: company.minCGPA,
          maxBacklogs: company.maxBacklogs,
          tenthPercentageMin: company.tenthPercentageMin,
          twelfthPercentageMin: company.twelfthPercentageMin,
          eligibleDepartments: company.eligibleDepartments,
          description: company.description,
          driveDate: company.driveDate,
          registrationDeadline: company.registrationDeadline,
          jobRole: company.jobRole,
          location: company.location,
          driveStatus: company.driveStatus,
        },
        isEligible,
        reasons,
        passedChecks,
      };
    });

    const eligibleCount = results.filter((r) => r.isEligible).length;

    res.json({
      success: true,
      studentProfile: {
        cgpa: student.cgpa,
        tenthPercentage: student.tenthPercentage,
        twelfthPercentage: student.twelfthPercentage,
        backlogs: student.backlogs,
        historyOfArrears: student.historyOfArrears,
        department: student.department,
      },
      summary: {
        total: results.length,
        eligible: eligibleCount,
        notEligible: results.length - eligibleCount,
      },
      results,
    });
  } catch (error) {
    console.error('Eligibility check error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/students/dashboard ───────────────────────────────
// Returns all stats for StudentHomeScreen dashboard
// ── GET /api/students/eligible-companies ──────────────────────
// Returns only the eligible companies for the logged-in student
router.get('/eligible-companies', async (req, res) => {
  try {
    const student = req.user;
    const companies = await Company.find({ isActive: true });

    const eligible = companies.filter((company) => {
      const { isEligible } = checkEligibility(student, company);
      return isEligible;
    });

    res.json({
      success: true,
      count: eligible.length,
      companies: eligible,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const student = await User.findById(req.user._id).select('-password');
    const Application = require('../models/Application');

    const companies = await Company.find({ isActive: true });

    let eligible = 0;
    companies.forEach((c) => {
      const { isEligible } = checkEligibility(student, c);
      if (isEligible) eligible++;
    });

    const myApplications = await Application.countDocuments({ student: student._id });
    const shortlisted = await Application.countDocuments({ student: student._id, status: 'shortlisted' });

    res.json({
      success: true,
      dashboard: {
        totalCompanies: companies.length,
        eligible,
        notEligible: companies.length - eligible,
        applied: myApplications,
        shortlisted,
        isPlaced: student.isPlaced,
        placedCompany: student.placedCompany,
        placedPackage: student.placedPackage,
      },
      academicProfile: {
        cgpa: student.cgpa,
        tenthPercentage: student.tenthPercentage,
        twelfthPercentage: student.twelfthPercentage,
        backlogs: student.backlogs,
        historyOfArrears: student.historyOfArrears,
        department: student.department,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
