// models/Notification.js
// Admin Dashboard Flow Step 5: Email / Notification System
//   - New company drive alerts
//   - Interview date reminders
//   - Result announcements
//   - Admin broadcasts

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // ── Target ────────────────────────────────────
    // null = broadcast to all students
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // For department-specific broadcasts
    targetDepartment: {
      type: String,
      enum: ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'IT', 'ALL'],
      default: 'ALL',
    },

    // ── Content ───────────────────────────────────
    title:   { type: String, required: true },
    message: { type: String, required: true },

    // ── Type ─────────────────────────────────────
    type: {
      type: String,
      enum: [
        'new_company',        // New company added
        'drive_reminder',     // Drive date coming up (3 days before)
        'deadline_reminder',  // Application deadline
        'result',             // Drive result announced
        'shortlisted',        // Student shortlisted
        'document_verified',  // Admin verified document
        'announcement',       // General admin broadcast
        'profile_incomplete', // Reminder to complete profile
      ],
      default: 'announcement',
    },

    // ── Related Entity ────────────────────────────
    relatedCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },

    // ── Delivery ──────────────────────────────────
    isEmailSent:   { type: Boolean, default: false },
    emailSentAt:   { type: Date,    default: null  },
    isRead:        { type: Boolean, default: false },
    readAt:        { type: Date,    default: null  },

    // ── Sender ────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
