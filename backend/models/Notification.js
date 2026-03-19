const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    department: { type: String, default: 'ALL' },
    createdAt: { type: String, required: true },
    isReadBy: { type: [String], default: [] },
  },
  { versionKey: false }
);

module.exports =
  mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

