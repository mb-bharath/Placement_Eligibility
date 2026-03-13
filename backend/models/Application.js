// models/Application.js
// Flow Step 5: "Students upload resume (PDF)" + apply to company
// Flow Step 4: Resume Strength Check (score ≥ 60%)

const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    // ── Relationships ─────────────────────────────
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },

    // ── Resume ────────────────────────────────────
    // From flow: "Upload Resume (PDF only, Max 5MB, One per company)"
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    resumeUrl:      { type: String, default: null },
    resumeFileName: { type: String, default: null },

    // ── Resume Strength Score ─────────────────────
    // From flow: "Resume Score ≥ 60% → can attend drive"
    resumeScore:      { type: Number, default: null }, // 0–100
    resumeScoreBreakdown: {
      // Detailed scoring breakdown
      skillsScore:       { type: Number, default: 0 },
      educationScore:    { type: Number, default: 0 },
      experienceScore:   { type: Number, default: 0 },
      formattingScore:   { type: Number, default: 0 },
      keywordsScore:     { type: Number, default: 0 },
    },
    resumeSuggestions: [String], // improvement suggestions
    isResumeStrong:    { type: Boolean, default: null }, // score >= 60

    // ── Application Status ────────────────────────
    status: {
      type: String,
      enum: [
        'applied',       // Student applied, resume uploaded
        'shortlisted',   // Admin shortlisted for drive
        'attended',      // Student attended drive
        'selected',      // Student selected / placed
        'rejected',      // Not selected
        'withdrawn',     // Student withdrew application
      ],
      default: 'applied',
    },

    // ── Admin Notes ───────────────────────────────
    adminNotes: { type: String, default: '' },

    // ── Timestamps ───────────────────────────────
    appliedAt:     { type: Date, default: Date.now },
    shortlistedAt: { type: Date, default: null },
    attendedAt:    { type: Date, default: null },
    resultAt:      { type: Date, default: null },
  },
  { timestamps: true }
);

// Unique constraint: one application per student per company
applicationSchema.index({ student: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
