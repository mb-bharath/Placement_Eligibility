// routes/applicationRoutes.js
// Flow Steps 4 & 5:
//   Student checks eligibility → uploads resume → resume is scored → if ≥60%, can apply

const express = require('express');
const router = express.Router();
const fs = require('fs');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const Application = require('../models/Application');
const Company = require('../models/Company');
const Document = require('../models/Document');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { checkEligibility } = require('../utils/eligibilityChecker');
const { analyzeResume } = require('../utils/resumeStrengthChecker');
const { sendEmail, templates } = require('../utils/emailService');

// ─────────────────────────────────────────────────────────────
//  STUDENT ROUTES
// ─────────────────────────────────────────────────────────────

// ── POST /api/applications/apply/:companyId ───────────────────
// Flow Step 5: Student applies to a company with PDF resume
// Multipart/form-data: { document: <pdf file> }
router.post('/apply/:companyId', protect, uploadSingle, async (req, res) => {
  try {
    const student = req.user;
    const company = await Company.findById(req.params.companyId);

    if (!company || !company.isActive) {
      return res.status(404).json({ success: false, message: 'Company not found or inactive' });
    }

    // ── 1. Check registration deadline ───────────────────────
    if (company.registrationDeadline && new Date() > company.registrationDeadline) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Application deadline has passed' });
    }

    // ── 2. Check drive status ─────────────────────────────────
    if (company.driveStatus === 'closed' || company.driveStatus === 'completed') {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'This drive is no longer accepting applications' });
    }

    // ── 3. Check if already applied ──────────────────────────
    const existing = await Application.findOne({ student: student._id, company: company._id });
    if (existing) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(409).json({ success: false, message: 'You have already applied to this company' });
    }

    // ── 4. Eligibility check ──────────────────────────────────
    const { isEligible, reasons } = checkEligibility(student, company);
    if (!isEligible) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        message: 'You are not eligible for this company',
        reasons,
      });
    }

    // ── 5. Resume required ────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Resume (PDF) is required to apply' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Only PDF files are accepted for resume' });
    }

    // ── 6. Analyze Resume Strength ────────────────────────────
    const resumeAnalysis = await analyzeResume(req.file.path);

    const minScore = parseInt(process.env.RESUME_MIN_SCORE) || 60;
    if (resumeAnalysis.score < minScore) {
      // Resume too weak — still save but block application
      const fileUrl = `${req.protocol}://${req.get('host')}/${req.file.path.replace(/\\/g, '/')}`;
      return res.status(400).json({
        success: false,
        message: `Resume score is ${resumeAnalysis.score}/100. Minimum required is ${minScore}/100.`,
        resumeScore: resumeAnalysis.score,
        resumeAnalysis,
      });
    }

    // ── 7. Save resume as Document ────────────────────────────
    const fileUrl = `${req.protocol}://${req.get('host')}/${req.file.path.replace(/\\/g, '/')}`;
    const resumeDoc = await Document.create({
      student: student._id,
      documentType: 'resume',
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileUrl,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
    });

    // ── 8. Create application ─────────────────────────────────
    const application = await Application.create({
      student: student._id,
      company: company._id,
      resumeId: resumeDoc._id,
      resumeUrl: fileUrl,
      resumeFileName: req.file.originalname,
      resumeScore: resumeAnalysis.score,
      resumeScoreBreakdown: resumeAnalysis.breakdown,
      resumeSuggestions: resumeAnalysis.suggestions,
      isResumeStrong: resumeAnalysis.isStrong,
      status: 'applied',
    });

    // ── 9. Update company stats ───────────────────────────────
    await Company.findByIdAndUpdate(company._id, { $inc: { totalApplied: 1 } });

    // ── 10. In-app notification ───────────────────────────────
    await Notification.create({
      recipient: student._id,
      title: `Application Submitted: ${company.name}`,
      message: `Your application to ${company.name} has been submitted successfully. Resume score: ${resumeAnalysis.score}/100`,
      type: 'announcement',
      relatedCompany: company._id,
      createdBy: student._id,
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      application: {
        id: application._id,
        company: { id: company._id, name: company.name },
        status: application.status,
        resumeScore: resumeAnalysis.score,
        resumeAnalysis,
        appliedAt: application.appliedAt,
      },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Already applied to this company' });
    }
    console.error('Apply error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/applications/my-applications ────────────────────
// Student views all their applications
router.get('/my-applications', protect, async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user._id })
      .populate('company', 'name package jobRole driveDate driveStatus location')
      .sort({ appliedAt: -1 });

    res.json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/applications/check-resume ──────────────────────
// Student checks resume strength BEFORE applying
// Multipart/form-data: { document: <pdf file> }
router.post('/check-resume', protect, uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF file' });
    }

    const analysis = await analyzeResume(req.file.path);

    // Clean up temp file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    const minScore = parseInt(process.env.RESUME_MIN_SCORE) || 60;

    res.json({
      success: true,
      resumeScore: analysis.score,
      minRequiredScore: minScore,
      isStrong: analysis.isStrong,
      canApply: analysis.isStrong,
      breakdown: analysis.breakdown,
      suggestions: analysis.suggestions,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Resume analysis failed' });
  }
});

// ─────────────────────────────────────────────────────────────
//  ADMIN ROUTES
// ─────────────────────────────────────────────────────────────

// ── GET /api/applications/company/:companyId ─────────────────
// Admin: view all applications for a specific company
router.get('/company/:companyId', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { company: req.params.companyId };
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate('student', 'name registerNumber department cgpa backlogs tenthPercentage twelfthPercentage email phone')
      .populate('company', 'name package jobRole')
      .sort({ appliedAt: -1 });

    res.json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/applications/:id/status ─────────────────────────
// Admin: update application status (shortlist, select, reject)
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    const validStatuses = ['applied', 'shortlisted', 'attended', 'selected', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const application = await Application.findById(req.params.id)
      .populate('student', 'name email')
      .populate('company', 'name jobRole driveDate package');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Update timestamps based on status
    const updateData = { status };
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (status === 'shortlisted') updateData.shortlistedAt = new Date();
    if (status === 'attended') updateData.attendedAt = new Date();
    if (status === 'selected' || status === 'rejected') updateData.resultAt = new Date();

    await Application.findByIdAndUpdate(req.params.id, updateData);

    // ── Send email notification ───────────────────────────────
    const student = application.student;
    const company = application.company;

    if (status === 'shortlisted') {
      await sendEmail({
        to: student.email,
        subject: `🎉 Shortlisted for ${company.name} — BIT Sathy Placement`,
        html: templates.shortlisted(student, company),
      });
      await Notification.create({
        recipient: student._id,
        title: `Shortlisted: ${company.name}`,
        message: `Congratulations! You've been shortlisted for the ${company.name} drive.`,
        type: 'shortlisted',
        relatedCompany: company._id,
        createdBy: req.user._id,
      });
    }

    if (status === 'selected') {
      // Mark student as placed
      await User.findByIdAndUpdate(student._id, {
        isPlaced: true,
        placedCompany: company.name,
        placedPackage: company.package,
        placedDate: new Date(),
      });
      await Company.findByIdAndUpdate(company._id, { $inc: { totalSelected: 1 } });

      await sendEmail({
        to: student.email,
        subject: `🎊 Selected in ${company.name} — BIT Sathy Placement`,
        html: templates.result(student, company, true, company.package),
      });
      await Notification.create({
        recipient: student._id,
        title: `Selected in ${company.name}! 🎊`,
        message: `Congratulations! You have been selected in ${company.name} with a package of ${company.package}.`,
        type: 'result',
        relatedCompany: company._id,
        createdBy: req.user._id,
      });
    }

    if (status === 'rejected') {
      await sendEmail({
        to: student.email,
        subject: `${company.name} Drive Result — BIT Sathy Placement`,
        html: templates.result(student, company, false),
      });
    }

    res.json({ success: true, message: `Application status updated to: ${status}` });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/applications/stats ───────────────────────────────
// Admin: placement statistics dashboard
// Flow Step 4: Total Students, Eligible, Applied, Placed
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [
      totalStudents,
      totalCompanies,
      totalApplications,
      shortlisted,
      selected,
      totalPlaced,
    ] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      Company.countDocuments({ isActive: true }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'shortlisted' }),
      Application.countDocuments({ status: 'selected' }),
      User.countDocuments({ role: 'student', isPlaced: true }),
    ]);

    // Department-wise placement stats
    const deptStats = await User.aggregate([
      { $match: { role: 'student', isActive: true } },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          placed: { $sum: { $cond: ['$isPlaced', 1, 0] } },
          avgCGPA: { $avg: '$cgpa' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Average package of placed students
    const placedStudents = await User.find({ isPlaced: true, placedPackage: { $ne: null } });

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalCompanies,
        totalApplications,
        shortlisted,
        selected,
        totalPlaced,
        placementRate: totalStudents > 0
          ? ((totalPlaced / totalStudents) * 100).toFixed(1)
          : 0,
      },
      deptStats,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
