// models/Document.js
// For the FILE UPLOADER feature
// Students can upload: Resume, Marksheets, Offer Letters etc.

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    // ── Ownership ────────────────────────────────
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── File Info ────────────────────────────────
    documentType: {
      type: String,
      enum: [
        'resume',
        'tenth_marksheet',
        'twelfth_marksheet',
        'ug_marksheet',
        'offer_letter',
        'other',
      ],
      required: true,
    },
    originalName: {
      type: String,
      required: true,
      // Original filename from user's device e.g. "John_Resume.pdf"
    },
    fileName: {
      type: String,
      required: true,
      // Stored filename e.g. "resume-userId-timestamp.pdf"
    },
    filePath: {
      type: String,
      required: true,
      // Server path e.g. "uploads/resumes/resume-abc123.pdf"
    },
    fileUrl: {
      type: String,
      required: true,
      // Public URL e.g. "http://localhost:5000/uploads/resumes/resume-abc123.pdf"
    },
    mimeType: {
      type: String,
      // e.g. "application/pdf", "image/jpeg"
    },
    fileSize: {
      type: Number,
      // Size in bytes
    },

    // ── Status ──────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false,
      // Admin can mark documents as verified
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Document', documentSchema);
