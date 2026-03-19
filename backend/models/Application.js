const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    studentId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    status: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

module.exports =
  mongoose.models.Application || mongoose.model('Application', ApplicationSchema);

