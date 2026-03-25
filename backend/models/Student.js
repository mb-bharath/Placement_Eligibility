const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    registerNumber: { type: String, required: true },
    degree: { type: String, default: '' },
    department: { type: String, required: true },
    cgpa: { type: Number, required: true },
    backlogs: { type: Number, required: true },
    phone: { type: String, default: '' },
    batch: { type: String, default: '' },
    historyOfArrears: { type: Number, default: 0 },
    tenthPercentage: { type: Number, default: 0 },
    twelfthPercentage: { type: Number, default: 0 },
    profileComplete: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
    updatedAt: { type: String },
  },
  { versionKey: false }
);

module.exports = mongoose.models.Student || mongoose.model('Student', StudentSchema);
