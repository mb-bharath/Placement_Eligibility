// routes/excelRoutes.js
// Flow Step 1: "Admin uploads student data (Excel / Google Sheet)"
// Also: Export eligible students list as Excel
//
// POST /api/excel/import-students    [Admin] Bulk import students from Excel
// GET  /api/excel/export-students    [Admin] Export student list
// GET  /api/excel/export-eligible/:companyId  [Admin] Export eligible list
// GET  /api/excel/template           [Admin] Download import template

const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const bcrypt = require('bcryptjs');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Company = require('../models/Company');
const Application = require('../models/Application');

// Temp upload for Excel
const excelUpload = multer({
  dest: 'uploads/temp/',
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel/CSV files allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('file');

// All routes require admin
router.use(protect, adminOnly);

// --- Google Sheet CSV import helpers ---
const normalizeHeader = (header) =>
  String(header || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const headerMap = {
  name: 'name',
  email: 'email',
  registernumber: 'registerNumber',
  regno: 'registerNumber',
  register: 'registerNumber',
  phone: 'phone',
  department: 'department',
  batch: 'batch',
  cgpa: 'cgpa',
  tenthpercentage: 'tenthPercentage',
  twelfthpercentage: 'twelfthPercentage',
  backlogs: 'backlogs',
  historyofarrears: 'historyOfArrears',
  password: 'password',
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((c) => c !== '')) rows.push(row);
  }

  return rows;
};

const toGoogleCsvUrl = (url) => {
  if (!url) return '';
  if (url.includes('export?format=csv')) return url;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return url;
  const id = match[1];
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
};

const fetchCsvText = (url) =>
  new Promise((resolve, reject) => {
    const target = toGoogleCsvUrl(url);
    const client = target.startsWith('https') ? https : http;
    client
      .get(target, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch sheet. Status ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });

// ── GET /api/excel/template ───────────────────────────────────
// Download the Excel template for student import
router.get('/template', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');

    // ── Define columns (matches User model) ──────────────────
    sheet.columns = [
      { header: 'Name *',             key: 'name',              width: 25 },
      { header: 'Email *',            key: 'email',             width: 30 },
      { header: 'Register Number *',  key: 'registerNumber',    width: 20 },
      { header: 'Phone',              key: 'phone',             width: 15 },
      { header: 'Department *',       key: 'department',        width: 12 },
      { header: 'Batch',              key: 'batch',             width: 15 },
      { header: 'CGPA *',             key: 'cgpa',              width: 10 },
      { header: '10th Percentage *',  key: 'tenthPercentage',   width: 18 },
      { header: '12th Percentage *',  key: 'twelfthPercentage', width: 18 },
      { header: 'Active Backlogs',    key: 'backlogs',          width: 18 },
      { header: 'History of Arrears', key: 'historyOfArrears',  width: 20 },
      { header: 'Password',           key: 'password',          width: 20 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF6200EE' },
    };
    sheet.getRow(1).height = 25;

    // Add example row
    sheet.addRow({
      name: 'John Kumar',
      email: 'john@bitsathy.ac.in',
      registerNumber: '710821104001',
      phone: '9876543210',
      department: 'CSE',
      batch: '2021-2025',
      cgpa: 8.5,
      tenthPercentage: 92.5,
      twelfthPercentage: 88.0,
      backlogs: 0,
      historyOfArrears: 0,
      password: 'student123',
    });

    // Add notes sheet
    const notesSheet = workbook.addWorksheet('Notes');
    notesSheet.addRows([
      ['Field', 'Notes'],
      ['Department', 'Must be one of: CSE, ECE, MECH, EEE, CIVIL, IT, AI&DS'],
      ['CGPA', 'Value between 0.00 and 10.00'],
      ['10th Percentage', 'Value between 0 and 100'],
      ['12th Percentage', 'Value between 0 and 100'],
      ['Password', 'If left blank, defaults to register number as password'],
      ['Batch', 'e.g. 2021-2025'],
    ]);
    notesSheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Template error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
});

// ── POST /api/excel/import-students ──────────────────────────
// Admin imports students from Excel file
router.post('/import-students', (req, res) => {
  excelUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);
      const sheet = workbook.getWorksheet('Students') || workbook.worksheets[0];

      const results = { created: 0, skipped: 0, errors: [] };
      const rows = [];

      sheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return; // Skip header
        const [, name, email, registerNumber, phone, department, batch, cgpa,
               tenthPercentage, twelfthPercentage, backlogs, historyOfArrears, password
              ] = row.values;

        if (!name || !email || !registerNumber) return;
        rows.push({ name, email: String(email).toLowerCase().trim(), registerNumber: String(registerNumber),
                    phone: phone || '', department: department || '', batch: batch || '',
                    cgpa: parseFloat(cgpa) || null, tenthPercentage: parseFloat(tenthPercentage) || null,
                    twelfthPercentage: parseFloat(twelfthPercentage) || null,
                    backlogs: parseInt(backlogs) || 0, historyOfArrears: parseInt(historyOfArrears) || 0,
                    password: password ? String(password) : String(registerNumber) });
      });

      // Process rows
      for (const row of rows) {
        try {
          const existing = await User.findOne({
            $or: [{ email: row.email }, { registerNumber: row.registerNumber }],
          });

          if (existing) {
            results.skipped++;
            results.errors.push(`Row skipped: ${row.email} already exists`);
            continue;
          }

          // Validate department
          const validDepts = ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'IT', 'AI&DS'];
          if (row.department && !validDepts.includes(row.department)) {
            results.errors.push(`${row.name}: Invalid department '${row.department}'`);
            results.skipped++;
            continue;
          }

          await User.create({
            name: row.name, email: row.email, password: row.password,
            registerNumber: row.registerNumber, phone: row.phone,
            department: row.department, batch: row.batch,
            cgpa: row.cgpa, tenthPercentage: row.tenthPercentage,
            twelfthPercentage: row.twelfthPercentage,
            backlogs: row.backlogs, historyOfArrears: row.historyOfArrears,
            role: 'student', isProfileComplete: !!(row.cgpa && row.tenthPercentage && row.twelfthPercentage),
          });
          results.created++;
        } catch (rowErr) {
          results.errors.push(`${row.email}: ${rowErr.message}`);
          results.skipped++;
        }
      }

      // Clean up temp file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        message: `Import complete: ${results.created} created, ${results.skipped} skipped`,
        results,
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error('Import error:', error);
      res.status(500).json({ success: false, message: 'Import failed: ' + error.message });
    }
  });
});

// ── GET /api/excel/export-students ───────────────────────────
// Export all students as Excel with full academic details
// ── POST /api/excel/import-google ─────────────────────────────
// Import students from a Google Sheet (CSV export URL)
// Body: { sheetUrl }
router.post('/import-google', async (req, res) => {
  try {
    const { sheetUrl } = req.body || {};
    if (!sheetUrl) {
      return res.status(400).json({ success: false, message: 'sheetUrl is required' });
    }

    const csvText = await fetchCsvText(sheetUrl);
    const rows = parseCsv(csvText);
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Sheet is empty' });
    }

    const headers = rows[0].map((h) => headerMap[normalizeHeader(h)] || null);
    const results = { created: 0, skipped: 0, errors: [] };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const data = {};
      headers.forEach((key, idx) => {
        if (!key) return;
        data[key] = row[idx] !== undefined ? String(row[idx]).trim() : '';
      });

      if (!data.name || !data.email || !data.registerNumber) {
        continue;
      }

      const email = String(data.email).toLowerCase().trim();
      const registerNumber = String(data.registerNumber).trim();
      const department = (data.department || '').toUpperCase().trim();

      try {
        const existing = await User.findOne({
          $or: [{ email }, { registerNumber }],
        });

        if (existing) {
          results.skipped++;
          results.errors.push(`Row skipped: ${email} already exists`);
          continue;
        }

        const validDepts = ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'IT', 'AI&DS'];
        if (department && !validDepts.includes(department)) {
          results.errors.push(`${data.name}: Invalid department '${department}'`);
          results.skipped++;
          continue;
        }

        await User.create({
          name: data.name,
          email,
          password: data.password ? String(data.password) : registerNumber,
          registerNumber,
          phone: data.phone || '',
          department,
          batch: data.batch || '',
          cgpa: data.cgpa ? parseFloat(data.cgpa) : null,
          tenthPercentage: data.tenthPercentage ? parseFloat(data.tenthPercentage) : null,
          twelfthPercentage: data.twelfthPercentage ? parseFloat(data.twelfthPercentage) : null,
          backlogs: data.backlogs ? parseInt(data.backlogs, 10) : 0,
          historyOfArrears: data.historyOfArrears ? parseInt(data.historyOfArrears, 10) : 0,
          role: 'student',
          isProfileComplete: !!(data.cgpa && data.tenthPercentage && data.twelfthPercentage),
        });
        results.created++;
      } catch (rowErr) {
        results.errors.push(`${email}: ${rowErr.message}`);
        results.skipped++;
      }
    }

    res.json({
      success: true,
      message: `Import complete: ${results.created} created, ${results.skipped} skipped`,
      results,
    });
  } catch (error) {
    console.error('Google Sheet import error:', error);
    res.status(500).json({ success: false, message: 'Import failed: ' + error.message });
  }
});

router.get('/export-students', async (req, res) => {
  try {
    const { department, minCGPA, isPlaced } = req.query;
    const filter = { role: 'student', isActive: true };
    if (department) filter.department = department;
    if (minCGPA) filter.cgpa = { $gte: parseFloat(minCGPA) };
    if (isPlaced !== undefined) filter.isPlaced = isPlaced === 'true';

    const students = await User.find(filter).select('-password').sort({ department: 1, name: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BIT Sathy Placement Cell';
    const sheet = workbook.addWorksheet('Students');

    sheet.columns = [
      { header: 'S.No', key: 'sno', width: 6 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Register Number', key: 'registerNumber', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Department', key: 'department', width: 12 },
      { header: 'Batch', key: 'batch', width: 12 },
      { header: 'CGPA', key: 'cgpa', width: 8 },
      { header: '10th %', key: 'tenth', width: 10 },
      { header: '12th %', key: 'twelfth', width: 10 },
      { header: 'Backlogs', key: 'backlogs', width: 10 },
      { header: 'History of Arrears', key: 'history', width: 18 },
      { header: 'Placed', key: 'placed', width: 8 },
      { header: 'Placed Company', key: 'placedCompany', width: 20 },
      { header: 'Package', key: 'placedPackage', width: 12 },
    ];

    // Style headers
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6200EE' } };
    sheet.getRow(1).height = 22;

    students.forEach((s, i) => {
      const row = sheet.addRow({
        sno: i + 1, name: s.name, registerNumber: s.registerNumber,
        email: s.email, phone: s.phone, department: s.department,
        batch: s.batch, cgpa: s.cgpa, tenth: s.tenthPercentage,
        twelfth: s.twelfthPercentage, backlogs: s.backlogs,
        history: s.historyOfArrears, placed: s.isPlaced ? 'Yes' : 'No',
        placedCompany: s.placedCompany || '', placedPackage: s.placedPackage || '',
      });
      if (s.isPlaced) {
        row.getCell('placed').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=students_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// ── GET /api/excel/export-eligible/:companyId ────────────────
// Export eligible students for a company as Excel
router.get('/export-eligible/:companyId', async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const { buildEligibilityFilter } = require('../utils/eligibilityChecker');
    const students = await User.find(buildEligibilityFilter(company))
      .select('name registerNumber email phone department cgpa tenthPercentage twelfthPercentage backlogs')
      .sort({ cgpa: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Eligible - ${company.name}`);

    // Title row
    sheet.mergeCells('A1:K1');
    sheet.getCell('A1').value = `Eligible Students for ${company.name} — Criteria: CGPA≥${company.minCGPA}, Backlogs≤${company.maxBacklogs}`;
    sheet.getCell('A1').font = { bold: true, size: 12 };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };

    sheet.addRow([]); // Empty row

    sheet.columns = [
      { header: 'S.No', key: 'sno', width: 6 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Register Number', key: 'registerNumber', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Department', key: 'department', width: 12 },
      { header: 'CGPA', key: 'cgpa', width: 8 },
      { header: '10th %', key: 'tenth', width: 10 },
      { header: '12th %', key: 'twelfth', width: 10 },
      { header: 'Backlogs', key: 'backlogs', width: 10 },
    ];

    sheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6200EE' } };

    students.forEach((s, i) => {
      sheet.addRow({
        sno: i + 1, name: s.name, registerNumber: s.registerNumber,
        email: s.email, phone: s.phone, department: s.department,
        cgpa: s.cgpa, tenth: s.tenthPercentage, twelfth: s.twelfthPercentage,
        backlogs: s.backlogs,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=eligible_${company.name}_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export eligible error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

module.exports = router;
