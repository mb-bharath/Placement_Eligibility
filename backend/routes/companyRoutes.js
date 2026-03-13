// routes/companyRoutes.js
// Matches CompanyManagementScreen.js & CompanyListScreen.js
//
// GET    /api/companies          → CompanyListScreen (students)
// POST   /api/companies          → CompanyManagementScreen handleAddCompany() [Admin]
// PUT    /api/companies/:id      → Edit company criteria          [Admin]
// DELETE /api/companies/:id      → handleDeleteCompany()          [Admin]

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadLogo } = require('../middleware/uploadMiddleware');
const Company = require('../models/Company');

// ── GET /api/companies ────────────────────────────────────────
// Public (but token preferred) – used by CompanyListScreen
// Supports: ?department=CSE  ?minPackage=5  ?active=true
router.get('/', protect, async (req, res) => {
  try {
    const filter = { isActive: true };

    // Optional filters from query params
    if (req.query.department) {
      filter.eligibleDepartments = { $in: [req.query.department] };
    }

    const companies = await Company.find(filter)
      .sort({ createdAt: -1 })
      .select('-createdBy');

    res.json({
      success: true,
      count: companies.length,
      companies,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/companies/:id ────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    res.json({ success: true, company });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/companies ───────────────────────────────────────
// Admin only | Matches CompanyManagementScreen handleAddCompany()
// Body: { name, minCGPA, maxBacklogs, package, eligibleDepartments, description }
router.post(
  '/',
  protect,
  adminOnly,
  [
    body('name').notEmpty().withMessage('Company name is required'),
    body('minCGPA')
      .isFloat({ min: 0, max: 10 })
      .withMessage('minCGPA must be between 0 and 10'),
    body('maxBacklogs')
      .isInt({ min: 0 })
      .withMessage('maxBacklogs must be a non-negative integer'),
    body('package').notEmpty().withMessage('Package info is required'),
    body('eligibleDepartments')
      .isArray({ min: 1 })
      .withMessage('At least one department must be selected'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const {
        name, minCGPA, maxBacklogs, package: pkg,
        eligibleDepartments, description,
        driveDate, registrationDeadline,
        jobRole, location,
        tenthPercentageMin, twelfthPercentageMin,
      } = req.body;

      const company = await Company.create({
        name,
        minCGPA: parseFloat(minCGPA),
        maxBacklogs: parseInt(maxBacklogs),
        package: pkg,
        eligibleDepartments,
        description: description || 'No description available',
        driveDate: driveDate || null,
        registrationDeadline: registrationDeadline || null,
        jobRole: jobRole || '',
        location: location || '',
        tenthPercentageMin: tenthPercentageMin ? parseFloat(tenthPercentageMin) : null,
        twelfthPercentageMin: twelfthPercentageMin ? parseFloat(twelfthPercentageMin) : null,
        createdBy: req.user._id,
      });

      res.status(201).json({
        success: true,
        message: 'Company added successfully',
        company,
      });
    } catch (error) {
      console.error('Add company error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ── PUT /api/companies/:id ────────────────────────────────────
// Admin only – Edit any company field including eligibility criteria
// This is the "SET CRITERIA" feature requested
router.put(
  '/:id',
  protect,
  adminOnly,
  [
    body('minCGPA')
      .optional()
      .isFloat({ min: 0, max: 10 })
      .withMessage('minCGPA must be between 0 and 10'),
    body('maxBacklogs')
      .optional()
      .isInt({ min: 0 })
      .withMessage('maxBacklogs must be a non-negative integer'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const company = await Company.findById(req.params.id);
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found' });
      }

      // Only update provided fields (partial update)
      const allowedFields = [
        'name', 'description', 'package', 'minCGPA', 'maxBacklogs',
        'eligibleDepartments', 'driveDate', 'registrationDeadline',
        'jobRole', 'location', 'isActive',
        'tenthPercentageMin', 'twelfthPercentageMin',
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          company[field] = req.body[field];
        }
      });

      await company.save();

      res.json({
        success: true,
        message: 'Company updated successfully',
        company,
      });
    } catch (error) {
      console.error('Update company error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ── DELETE /api/companies/:id ─────────────────────────────────
// Admin only | Matches CompanyManagementScreen handleDeleteCompany()
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    await company.deleteOne();

    res.json({
      success: true,
      message: 'Company deleted successfully',
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/companies/:id/logo ──────────────────────────────
// Admin only – Upload company logo (File Uploader for logos)
router.post('/:id/logo', protect, adminOnly, uploadLogo, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No logo file uploaded' });
    }

    const logoUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { logoUrl },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      logoUrl,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
