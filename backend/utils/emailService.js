// utils/emailService.js
// Admin Dashboard Flow Step 5: Email / Notification System
// Sends: new company alerts, drive reminders, result announcements

const nodemailer = require('nodemailer');

// ── Transporter ───────────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ── HTML Email Templates ──────────────────────────────────────

const baseTemplate = (title, body, color = '#6200ee') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: ${color}; padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 30px; }
    .body h2 { color: #333; }
    .body p { color: #555; line-height: 1.6; }
    .criteria-box { background: #f9f9f9; border-left: 4px solid ${color}; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .criteria-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .badge { display: inline-block; background: ${color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; }
    .btn { display: inline-block; background: ${color}; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; background: #fafafa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 BIT Sathy Placement Cell</h1>
      <p>Placement Management System</p>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>BIT Sathy Placement Cell | Do not reply to this email</p>
      <p>This is an automated notification from the Placement Portal</p>
    </div>
  </div>
</body>
</html>`;

// ── Template: New Company Drive ───────────────────────────────
const newCompanyTemplate = (student, company) => {
  const criteriaRows = `
    <div class="criteria-row"><span>📊 Min CGPA:</span> <strong>${company.minCGPA}</strong></div>
    <div class="criteria-row"><span>❌ Max Backlogs:</span> <strong>${company.maxBacklogs}</strong></div>
    ${company.tenthPercentageMin ? `<div class="criteria-row"><span>📝 10th %:</span> <strong>≥ ${company.tenthPercentageMin}%</strong></div>` : ''}
    ${company.twelfthPercentageMin ? `<div class="criteria-row"><span>📝 12th %:</span> <strong>≥ ${company.twelfthPercentageMin}%</strong></div>` : ''}
    <div class="criteria-row"><span>🏢 Departments:</span> <strong>${company.eligibleDepartments.join(', ')}</strong></div>
    ${company.driveDate ? `<div class="criteria-row"><span>📅 Drive Date:</span> <strong>${new Date(company.driveDate).toDateString()}</strong></div>` : ''}
    ${company.registrationDeadline ? `<div class="criteria-row"><span>⏰ Deadline:</span> <strong>${new Date(company.registrationDeadline).toDateString()}</strong></div>` : ''}
  `;

  const body = `
    <h2>🏢 New Company Drive: ${company.name}</h2>
    <p>Dear ${student.name || 'Student'},</p>
    <p>A new placement drive has been announced. Check if you are eligible and apply before the deadline.</p>
    <div class="criteria-box">
      <strong>Eligibility Criteria:</strong><br><br>
      ${criteriaRows}
    </div>
    <p><strong>Role:</strong> ${company.jobRole || 'Not specified'}</p>
    <p><strong>Package:</strong> <span class="badge">${company.package}</span></p>
    <p>Login to the Placement Portal to check your eligibility and apply.</p>
  `;
  return baseTemplate(`New Drive: ${company.name}`, body);
};

// ── Template: Drive Reminder ──────────────────────────────────
const driveReminderTemplate = (student, company, daysLeft) => {
  const body = `
    <h2>⏰ Drive Reminder: ${company.name}</h2>
    <p>Dear ${student.name || 'Student'},</p>
    <p>This is a reminder that the <strong>${company.name}</strong> placement drive is in <strong>${daysLeft} day(s)</strong>.</p>
    <div class="criteria-box">
      <div class="criteria-row"><span>📅 Drive Date:</span> <strong>${new Date(company.driveDate).toDateString()}</strong></div>
      <div class="criteria-row"><span>💼 Role:</span> <strong>${company.jobRole || 'N/A'}</strong></div>
      <div class="criteria-row"><span>💰 Package:</span> <strong>${company.package}</strong></div>
    </div>
    <p>Make sure you have uploaded your resume and your profile is complete.</p>
  `;
  return baseTemplate('Drive Reminder', body, '#ff6f00');
};

// ── Template: Shortlisted ─────────────────────────────────────
const shortlistedTemplate = (student, company) => {
  const body = `
    <h2>🎉 Congratulations! You're Shortlisted</h2>
    <p>Dear ${student.name || 'Student'},</p>
    <p>You have been <strong>shortlisted</strong> for the <strong>${company.name}</strong> placement drive!</p>
    <div class="criteria-box">
      <div class="criteria-row"><span>🏢 Company:</span> <strong>${company.name}</strong></div>
      <div class="criteria-row"><span>💼 Role:</span> <strong>${company.jobRole || 'N/A'}</strong></div>
      <div class="criteria-row"><span>📅 Drive Date:</span> <strong>${company.driveDate ? new Date(company.driveDate).toDateString() : 'TBD'}</strong></div>
    </div>
    <p>Please report to the placement cell for further instructions.</p>
  `;
  return baseTemplate('You are Shortlisted!', body, '#2e7d32');
};

// ── Template: Result Announced ────────────────────────────────
const resultTemplate = (student, company, isSelected, package_) => {
  const color = isSelected ? '#2e7d32' : '#c62828';
  const body = `
    <h2>${isSelected ? '🎊 Selected!' : '📋 Drive Result'}</h2>
    <p>Dear ${student.name || 'Student'},</p>
    ${isSelected
      ? `<p>Congratulations! You have been <strong>SELECTED</strong> in the <strong>${company.name}</strong> placement drive!</p>
         <div class="criteria-box">
           <div class="criteria-row"><span>🏢 Company:</span> <strong>${company.name}</strong></div>
           <div class="criteria-row"><span>💰 Package:</span> <strong>${package_ || company.package}</strong></div>
         </div>
         <p>The placement cell will share further details about your joining formalities.</p>`
      : `<p>Thank you for attending the <strong>${company.name}</strong> drive. Unfortunately, you were not selected this time.</p>
         <p>Do not be discouraged. Keep working on your skills and apply for upcoming drives!</p>`
    }
  `;
  return baseTemplate(`${company.name} — Drive Result`, body, color);
};

// ── Template: General Announcement ───────────────────────────
const announcementTemplate = (student, title, message) => {
  const body = `
    <h2>📢 ${title}</h2>
    <p>Dear ${student.name || 'Student'},</p>
    <div class="criteria-box">${message}</div>
    <p>Login to the Placement Portal for more details.</p>
  `;
  return baseTemplate(title, body);
};

// ── Send Email Helper ─────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"BIT Sathy Placement" <placement@bitsathy.ac.in>',
      to,
      subject,
      html,
    });
    console.log(`✉️  Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ── Bulk Email ────────────────────────────────────────────────
const sendBulkEmail = async (students, subject, htmlFn) => {
  const results = [];
  for (const student of students) {
    if (!student.email) continue;
    const result = await sendEmail({
      to: student.email,
      subject,
      html: htmlFn(student),
    });
    results.push({ email: student.email, ...result });
    // Small delay to avoid SMTP rate limit
    await new Promise((r) => setTimeout(r, 100));
  }
  return results;
};

module.exports = {
  sendEmail,
  sendBulkEmail,
  templates: {
    newCompany: newCompanyTemplate,
    driveReminder: driveReminderTemplate,
    shortlisted: shortlistedTemplate,
    result: resultTemplate,
    announcement: announcementTemplate,
  },
};
