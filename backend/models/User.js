// models/User.js  ─ v2.0
// Matches:
//   LoginScreen          → email, password, role
//   StudentProfileScreen → name, registerNumber, department, cgpa, backlogs
//   NEW (from flow)      → tenthPercentage, twelfthPercentage, phone, isPlaced

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // ── Auth ──────────────────────────────────────
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },

    // ── Basic Profile ──────────────────────────────
    name: { type: String, trim: true },
    registerNumber: { type: String, trim: true },
    phone: { type: String, trim: true, default: '' },
    department: {
      type: String,
      enum: ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'IT', 'AI&DS', ''],
      default: '',
    },
    batch: { type: String, default: '' },        // e.g. "2021-2025"
    profilePhoto: { type: String, default: null },

    // ── Academic Performance ───────────────────────
    // From handwritten flow: CGPA, 10th %, 12th %, Arrears
    cgpa:               { type: Number, min: 0, max: 10,  default: null },
    backlogs:           { type: Number, min: 0,            default: 0   }, // active
    historyOfArrears:   { type: Number, min: 0,            default: 0   }, // total history
    tenthPercentage:    { type: Number, min: 0, max: 100,  default: null },
    twelfthPercentage:  { type: Number, min: 0, max: 100,  default: null },

    // ── Documents ──────────────────────────────────
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],

    // ── Placement Result ───────────────────────────
    isPlaced:       { type: Boolean, default: false },
    placedCompany:  { type: String,  default: null  },
    placedPackage:  { type: String,  default: null  },
    placedDate:     { type: Date,    default: null  },

    // ── Account Status ─────────────────────────────
    isProfileComplete: { type: Boolean, default: false },
    isActive:          { type: Boolean, default: true  },
  },
  { timestamps: true }
);

// ── Hash password before save ─────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare password ────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return await bcrypt.compare(candidate, this.password);
};

// ── Virtual: full profile check ──────────────────────────────
userSchema.virtual('profileComplete').get(function () {
  return !!(
    this.name && this.registerNumber && this.department &&
    this.cgpa !== null &&
    this.tenthPercentage !== null &&
    this.twelfthPercentage !== null
  );
});

module.exports = mongoose.model('User', userSchema);
