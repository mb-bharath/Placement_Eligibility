// middleware/uploadMiddleware.js
// Handles all file uploads using Multer
// Supports: PDF, JPG, PNG  |  Max size: 5MB

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Allowed document types & their folders ───────────────────
const UPLOAD_FOLDERS = {
  resume: 'uploads/resumes',
  tenth_marksheet: 'uploads/marksheets',
  twelfth_marksheet: 'uploads/marksheets',
  ug_marksheet: 'uploads/marksheets',
  offer_letter: 'uploads/offer_letters',
  other: 'uploads/others',
  company_logo: 'uploads/logos',
};

// ── Ensure upload folders exist ──────────────────────────────
Object.values(UPLOAD_FOLDERS).forEach((folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
});

// ── Storage Config ───────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine folder from request body documentType
    const docType = req.body.documentType || 'other';
    const folder = UPLOAD_FOLDERS[docType] || UPLOAD_FOLDERS.other;
    cb(null, folder);
  },

  filename: (req, file, cb) => {
    // Format: docType-userId-timestamp.ext
    const userId = req.user ? req.user._id : 'unknown';
    const docType = req.body.documentType || 'file';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${docType}-${userId}-${timestamp}${ext}`;
    cb(null, filename);
  },
});

// ── File Filter ──────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'),
      false
    );
  }
};

// ── Multer Instance ──────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },
});

// ── Named Export Helpers ─────────────────────────────────────

// Single document upload  → field name: "document"
const uploadSingle = upload.single('document');

// Company logo upload     → field name: "logo"
const uploadLogo = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_FOLDERS.company_logo),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `logo-${Date.now()}${ext}`);
    },
  }),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for logos
}).single('logo');

// ── Error Handler Wrapper ────────────────────────────────────
// Wraps multer errors into clean JSON responses
const handleUploadError = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB.',
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

module.exports = {
  uploadSingle: handleUploadError(uploadSingle),
  uploadLogo: handleUploadError(uploadLogo),
  UPLOAD_FOLDERS,
};
