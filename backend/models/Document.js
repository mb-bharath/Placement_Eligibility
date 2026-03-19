const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    studentId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    documentType: { type: String, required: true },
    fileUrl: { type: String, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String },
  },
  { versionKey: false }
);

module.exports = mongoose.models.Document || mongoose.model('Document', DocumentSchema);

