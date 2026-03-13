// routes/adminRoutes.js
// Matches AdminDashboardScreen.js
//
// GET /api/admin/stats         → Dashboard stats (totalCompanies, totalStudents, avgCGPA)
// GET /api/admin/students      → View all students list
// PUT /api/admin/students/:id  → Activate / Deactivate student
// GET /api/admin/students/:id  → View single student with documents

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Company = require('../models/Company');
const Document = require('../models/Document');

// All admin routes require admin role
router.use(protect, adminOnly);

// ── GET /api/admin/stats ──────────────────────────────────────
// Matches AdminDashboardScreen.js calculateStats()
// Returns: totalCompanies, totalStudents, avgCGPA
// Also returns eligibility breakdown per dept (for chart)
router.get('/stats', async (req, res) => {
  try {
    const [totalCompanies, totalStudents, students, documents] =
      await Promise.all([
        Company.countDocuments({ isActive: true }),
        User.countDocuments({ role: 'student', isActive: true }),
        User.find({ role: 'student', cgpa: { $ne: null } }).select('cgpa department'),
        Document.countDocuments(),
      ]);

    // Average CGPA
    const avgCGPA =
      students.length > 0
        ? (
            students.reduce((sum, s) => sum + (s.cgpa || 0), 0) /
            students.length
          ).toFixed(2)
        : 0;

    // Students per department (for bar chart in AdminDashboardScreen)
    const deptBreakdown = students.reduce((acc, s) => {
      if (s.department) {
        acc[s.department] = (acc[s.department] || 0) + 1;
      }
      return acc;
    }, {});

    // Chart data format matching AdminDashboardScreen BarChart
    const chartLabels = Object.keys(deptBreakdown);
    const chartData = Object.values(deptBreakdown);

    res.json({
      success: true,
      stats: {
        totalCompanies,
        totalStudents,
        avgCGPA: parseFloat(avgCGPA),
        totalDocuments: documents,
      },
      chart: {
        labels: chartLabels,
        data: chartData,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/admin/students ───────────────────────────────────
// Admin views all students (with optional filters)
// Query: ?department=CSE  ?minCGPA=7  ?hasBacklogs=true  ?search=name
router.get('/students', async (req, res) => {
  try {
    const { department, minCGPA, search, page = 1, limit = 20 } = req.query;

    const filter = { role: 'student' };

    if (department) filter.department = department;
    if (minCGPA) filter.cgpa = { $gte: parseFloat(minCGPA) };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { registerNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [students, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .populate('documents', 'documentType isVerified fileUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      students,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/admin/students/:id ───────────────────────────────
// Admin views a single student's full profile
router.get('/students/:id', async (req, res) => {
  try {
    const student = await User.findOne({
      _id: req.params.id,
      role: 'student',
    })
      .select('-password')
      .populate('documents');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/admin/students/:id/status ───────────────────────
// Admin activate/deactivate student
router.put('/students/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    const student = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      message: `Student ${isActive ? 'activated' : 'deactivated'} successfully`,
      student,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/admin/eligible-students/:companyId ───────────────
// Admin checks which students are eligible for a specific company
router.get('/eligible-students/:companyId', async (req, res) => {
  try {
    const Company = require('../models/Company');
    const company = await Company.findById(req.params.companyId);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const students = await User.find({
      role: 'student',
      isActive: true,
      isProfileComplete: true,
      cgpa: { $gte: company.minCGPA },
      backlogs: { $lte: company.maxBacklogs },
      department: { $in: company.eligibleDepartments },
    }).select('name registerNumber department cgpa backlogs email');

    res.json({
      success: true,
      company: company.name,
      criteria: {
        minCGPA: company.minCGPA,
        maxBacklogs: company.maxBacklogs,
        eligibleDepartments: company.eligibleDepartments,
      },
      eligibleCount: students.length,
      students,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
