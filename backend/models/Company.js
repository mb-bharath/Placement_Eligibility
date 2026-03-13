// models/Company.js  ─ v2.0
// Admin Dashboard → Company Management from handwritten flow:
//   Add Company, Set Criteria (CGPA, 10th%, 12th%, Arrears), Drive Date

const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    // ── Basic Info ────────────────────────────────
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: 'No description available' },
    logoUrl:     { type: String, default: null },
    website:     { type: String, default: '' },

    // ── Package ────────────────────────────────────
    package:    { type: String, required: true },  // e.g. "8-10 LPA"
    packageMin: { type: Number, default: null },   // for filtering/sorting
    packageMax: { type: Number, default: null },

    // ── Eligibility Criteria ───────────────────────
    // Matches handwritten flow criteria table
    minCGPA:              { type: Number, required: true, min: 0, max: 10 },
    maxBacklogs:          { type: Number, default: 0, min: 0 },   // active arrears
    maxHistoryOfArrears:  { type: Number, default: null },         // total history
    tenthPercentageMin:   { type: Number, default: null },         // 10th %
    twelfthPercentageMin: { type: Number, default: null },         // 12th %
    eligibleDepartments:  {
      type: [String],
      enum: ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'IT', 'AI&DS'],
      default: ['CSE', 'ECE', 'MECH', 'EEE'],
    },
    eligibleBatch: { type: String, default: '' },  // e.g. "2021-2025"

    // ── Drive Details (Admin "Drive Control") ─────
    jobRole:               { type: String, default: '' },
    location:              { type: String, default: '' },
    driveDate:             { type: Date,   default: null },
    registrationDeadline:  { type: Date,   default: null },
    driveRounds:           { type: [String], default: [] },
    // e.g. ["Aptitude Test", "Technical Interview", "HR Interview"]

    // ── Drive Status ──────────────────────────────
    driveStatus: {
      type: String,
      enum: ['upcoming', 'open', 'closed', 'completed'],
      default: 'upcoming',
    },

    // ── Stats (auto-computed, cached) ─────────────
    totalApplied:  { type: Number, default: 0 },
    totalSelected: { type: Number, default: 0 },

    // ── Meta ──────────────────────────────────────
    isActive:  { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
