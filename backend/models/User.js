const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['student', 'admin'] },
    name: { type: String, required: true },
    registerNumber: { type: String },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);

