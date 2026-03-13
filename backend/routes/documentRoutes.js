// routes/documentRoutes.js
// FILE UPLOADER FEATURE
// Matches StudentProfileScreen (resume upload button)
//
// POST   /api/documents/upload       → Upload a document
// GET    /api/documents/my-docs      → List my uploaded docs
// DELETE /api/documents/:id          → Delete a document
// GET    /api/documents/all          → Admin: view all student docs
// PUT    /api/documents/:id/verify   → Admin: verify a document

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const Document = require('../models/Document');
const User = require('../models/User');

// ── POST /api/documents/upload ────────────────────────────────
// Students upload their documents
// Form-data fields:
//   document     : <file>   (PDF/JPG/PNG, max 5MB)
//   documentType : resume | tenth_marksheet | twelfth_marksheet |
//                  ug_marksheet | offer_letter | other
router.post('/upload', protect, uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a file.',
      });
    }

    const { documentType } = req.body;
    if (!documentType) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'documentType is required (resume, tenth_marksheet, etc.)',
      });
    }

    // Build public URL for the file
    const fileUrl = `${req.protocol}://${req.get('host')}/${req.file.path.replace(/\\/g, '/')}`;

    // Check if student already has a doc of same type — replace it
    const existing = await Document.findOne({
      student: req.user._id,
      documentType,
    });

    if (existing) {
      // Delete old file from disk
      if (fs.existsSync(existing.filePath)) {
        fs.unlinkSync(existing.filePath);
      }
      // Remove old doc from DB
      await existing.deleteOne();
      // Remove from user's documents array
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { documents: existing._id },
      });
    }

    // Save new document record
    const document = await Document.create({
      student: req.user._id,
      documentType,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileUrl,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
    });

    // Link document to student
    await User.findByIdAndUpdate(req.user._id, {
      $push: { documents: document._id },
    });

    res.status(201).json({
      success: true,
      message: `${documentType} uploaded successfully`,
      document: {
        id: document._id,
        documentType: document.documentType,
        originalName: document.originalName,
        fileUrl: document.fileUrl,
        fileSize: document.fileSize,
        uploadedAt: document.createdAt,
      },
    });
  } catch (error) {
    // Clean up if DB save failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Document upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// ── GET /api/documents/my-docs ────────────────────────────────
// Students view their own uploaded documents
router.get('/my-docs', protect, async (req, res) => {
  try {
    const documents = await Document.find({ student: req.user._id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      count: documents.length,
      documents: documents.map((doc) => ({
        id: doc._id,
        documentType: doc.documentType,
        originalName: doc.originalName,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        isVerified: doc.isVerified,
        uploadedAt: doc.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/documents/:id ─────────────────────────────────
// Students delete their own documents
router.delete('/:id', protect, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      student: req.user._id, // Ensure ownership
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or unauthorized',
      });
    }

    // Delete file from disk
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Remove from user documents array
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { documents: document._id },
    });

    await document.deleteOne();

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/documents/all ────────────────────────────────────
// Admin only: view all student documents
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const { studentId, documentType, isVerified } = req.query;
    const filter = {};

    if (studentId) filter.student = studentId;
    if (documentType) filter.documentType = documentType;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';

    const documents = await Document.find(filter)
      .populate('student', 'name registerNumber email department')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: documents.length, documents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/documents/:id/verify ─────────────────────────────
// Admin only: verify or reject a student document
router.put('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const { isVerified } = req.body;

    const document = await Document.findByIdAndUpdate(
      req.params.id,
      {
        isVerified,
        verifiedBy: req.user._id,
        verifiedAt: new Date(),
      },
      { new: true }
    ).populate('student', 'name registerNumber');

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.json({
      success: true,
      message: `Document ${isVerified ? 'verified' : 'rejected'} successfully`,
      document,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
