// routes/notificationRoutes.js
// Admin Dashboard Flow Step 5: Email / Notification System
//
// POST /api/notifications/broadcast     [Admin] Send to all / by dept
// POST /api/notifications/company/:id  [Admin] Notify about new drive
// GET  /api/notifications/my            Student: view own notifications
// PUT  /api/notifications/:id/read      Mark as read

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Company = require('../models/Company');
const { sendBulkEmail, sendEmail, templates } = require('../utils/emailService');

// ── GET /api/notifications/my ─────────────────────────────────
// Student: get all notifications for me (personal + broadcast)
router.get('/my', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipient: req.user._id },
        { recipient: null, targetDepartment: { $in: [req.user.department, 'ALL'] } },
      ],
    })
      .populate('relatedCompany', 'name package driveDate')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({ success: true, unreadCount, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/notifications/:id/read ──────────────────────────
router.put('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/notifications/read-all ──────────────────────────
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
//  ADMIN ROUTES
// ─────────────────────────────────────────────────────────────

// ── POST /api/notifications/broadcast ────────────────────────
// Admin: send announcement to all students or by department
// Body: { title, message, department: 'ALL'|'CSE'|..., sendEmail: true }
router.post('/broadcast', protect, adminOnly, async (req, res) => {
  try {
    const { title, message, department = 'ALL', sendEmailFlag = false } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message required' });
    }

    // Save notification (broadcast = no recipient)
    const notification = await Notification.create({
      recipient: null,
      targetDepartment: department,
      title,
      message,
      type: 'announcement',
      createdBy: req.user._id,
    });

    let emailResults = [];

    // Send emails if requested
    if (sendEmailFlag) {
      const filter = { role: 'student', isActive: true };
      if (department !== 'ALL') filter.department = department;

      const students = await User.find(filter).select('email name department');

      emailResults = await sendBulkEmail(
        students,
        `📢 ${title} — BIT Sathy Placement`,
        (student) => templates.announcement(student, title, message)
      );

      await Notification.findByIdAndUpdate(notification._id, {
        isEmailSent: true,
        emailSentAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: `Notification broadcast to ${department} students`,
      notificationId: notification._id,
      emailsSent: emailResults.filter((r) => r.success).length,
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/notifications/new-drive/:companyId ─────────────
// Admin: notify eligible students about a new company drive
router.post('/new-drive/:companyId', protect, adminOnly, async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const { buildEligibilityFilter } = require('../utils/eligibilityChecker');
    const eligibleFilter = buildEligibilityFilter(company);
    const eligibleStudents = await User.find(eligibleFilter).select('email name department');

    // Save individual notifications for each eligible student
    const notifDocs = eligibleStudents.map((student) => ({
      recipient: student._id,
      title: `New Drive: ${company.name} — ${company.package}`,
      message: `A new placement drive for ${company.name} has been announced. Apply before ${
        company.registrationDeadline
          ? new Date(company.registrationDeadline).toDateString()
          : 'the deadline'
      }.`,
      type: 'new_company',
      relatedCompany: company._id,
      createdBy: req.user._id,
    }));

    await Notification.insertMany(notifDocs);

    // Send emails
    const { sendEmailFlag = true } = req.body;
    let emailResults = [];

    if (sendEmailFlag && eligibleStudents.length > 0) {
      emailResults = await sendBulkEmail(
        eligibleStudents,
        `🏢 New Company Drive: ${company.name} — BIT Sathy Placement`,
        (student) => templates.newCompany(student, company)
      );
    }

    res.json({
      success: true,
      message: `Notified ${eligibleStudents.length} eligible students`,
      eligibleCount: eligibleStudents.length,
      emailsSent: emailResults.filter((r) => r.success).length,
    });
  } catch (error) {
    console.error('Drive notification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/notifications/drive-reminder ───────────────────
// Admin: send reminder for upcoming drives (3 days before)
// Can be called by a cron job or manually
router.post('/drive-reminder', protect, adminOnly, async (req, res) => {
  try {
    const today = new Date();
    const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find drives in the next 3 days
    const upcomingDrives = await Company.find({
      isActive: true,
      driveDate: { $gte: today, $lte: threeDaysLater },
    });

    let totalNotified = 0;

    for (const company of upcomingDrives) {
      const { buildEligibilityFilter } = require('../utils/eligibilityChecker');
      const daysLeft = Math.ceil((company.driveDate - today) / (1000 * 60 * 60 * 24));
      const eligibleStudents = await User.find(buildEligibilityFilter(company))
        .select('email name _id');

      for (const student of eligibleStudents) {
        // Avoid duplicate reminders
        const existing = await Notification.findOne({
          recipient: student._id,
          relatedCompany: company._id,
          type: 'drive_reminder',
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });

        if (!existing) {
          await Notification.create({
            recipient: student._id,
            title: `Drive in ${daysLeft} day(s): ${company.name}`,
            message: `The ${company.name} placement drive is on ${new Date(company.driveDate).toDateString()}.`,
            type: 'drive_reminder',
            relatedCompany: company._id,
            createdBy: req.user._id,
          });

          await sendEmail({
            to: student.email,
            subject: `⏰ Drive Reminder: ${company.name} in ${daysLeft} day(s)`,
            html: templates.driveReminder(student, company, daysLeft),
          });

          totalNotified++;
        }
      }
    }

    res.json({
      success: true,
      message: `Drive reminders sent`,
      drivesChecked: upcomingDrives.length,
      studentsNotified: totalNotified,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
