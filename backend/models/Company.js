const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    jobRole: { type: String, default: '' },
    location: { type: String, default: '' },
    package: { type: String, required: true },
    minCGPA: { type: Number, required: true },
    maxBacklogs: { type: Number, required: true },
    eligibleDepartments: { type: [String], default: [] },
    description: { type: String, default: '' },
    driveDate: { type: String, default: null },
    registrationDeadline: { type: String, default: null },
    driveStatus: { type: String, default: 'open' },
    tenthPercentageMin: { type: Number, default: null },
    twelfthPercentageMin: { type: Number, default: null },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false }
);

module.exports = mongoose.models.Company || mongoose.model('Company', CompanySchema);

