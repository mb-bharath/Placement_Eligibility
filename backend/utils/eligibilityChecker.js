// utils/eligibilityChecker.js
// Flow Step 3: System Filters Eligible Students
// Criteria: CGPA, 10th %, 12th %, Arrears, Department
// Used by:
//   - studentRoutes → GET /api/students/eligibility
//   - applicationRoutes → before applying
//   - adminRoutes → GET /api/admin/eligible-students/:companyId

/**
 * Check if a student is eligible for a company.
 * @param {object} student   - User document
 * @param {object} company   - Company document
 * @returns {{ isEligible: boolean, reasons: string[], passedChecks: string[] }}
 */
const checkEligibility = (student, company) => {
  const reasons = [];        // Failure reasons
  const passedChecks = [];   // Passed criteria (for UI display)
  let isEligible = true;

  // ── 1. CGPA Check ─────────────────────────────────────────
  if (student.cgpa === null || student.cgpa === undefined) {
    isEligible = false;
    reasons.push('CGPA not set. Please complete your profile.');
  } else if (student.cgpa < company.minCGPA) {
    isEligible = false;
    reasons.push(
      `CGPA too low (Required: ${company.minCGPA}, Yours: ${student.cgpa.toFixed(2)})`
    );
  } else {
    passedChecks.push(`✓ CGPA: ${student.cgpa} ≥ ${company.minCGPA}`);
  }

  // ── 2. Backlogs Check ────────────────────────────────────
  const studentBacklogs = student.backlogs || 0;
  if (studentBacklogs > company.maxBacklogs) {
    isEligible = false;
    reasons.push(
      `Too many active backlogs (Max allowed: ${company.maxBacklogs}, Yours: ${studentBacklogs})`
    );
  } else {
    passedChecks.push(`✓ Backlogs: ${studentBacklogs} ≤ ${company.maxBacklogs}`);
  }

  // ── 3. History of Arrears Check ──────────────────────────
  if (
    company.maxHistoryOfArrears !== null &&
    company.maxHistoryOfArrears !== undefined
  ) {
    const history = student.historyOfArrears || 0;
    if (history > company.maxHistoryOfArrears) {
      isEligible = false;
      reasons.push(
        `History of arrears too high (Max: ${company.maxHistoryOfArrears}, Yours: ${history})`
      );
    } else {
      passedChecks.push(`✓ History of Arrears: ${history} ≤ ${company.maxHistoryOfArrears}`);
    }
  }

  // ── 4. 10th Percentage Check ─────────────────────────────
  if (company.tenthPercentageMin) {
    if (student.tenthPercentage === null || student.tenthPercentage === undefined) {
      isEligible = false;
      reasons.push('10th percentage not set. Please complete your profile.');
    } else if (student.tenthPercentage < company.tenthPercentageMin) {
      isEligible = false;
      reasons.push(
        `10th % too low (Required: ${company.tenthPercentageMin}%, Yours: ${student.tenthPercentage}%)`
      );
    } else {
      passedChecks.push(`✓ 10th %: ${student.tenthPercentage}% ≥ ${company.tenthPercentageMin}%`);
    }
  }

  // ── 5. 12th Percentage Check ─────────────────────────────
  if (company.twelfthPercentageMin) {
    if (student.twelfthPercentage === null || student.twelfthPercentage === undefined) {
      isEligible = false;
      reasons.push('12th percentage not set. Please complete your profile.');
    } else if (student.twelfthPercentage < company.twelfthPercentageMin) {
      isEligible = false;
      reasons.push(
        `12th % too low (Required: ${company.twelfthPercentageMin}%, Yours: ${student.twelfthPercentage}%)`
      );
    } else {
      passedChecks.push(`✓ 12th %: ${student.twelfthPercentage}% ≥ ${company.twelfthPercentageMin}%`);
    }
  }

  // ── 6. Department Check ───────────────────────────────────
  if (!student.department) {
    isEligible = false;
    reasons.push('Department not set. Please complete your profile.');
  } else if (!company.eligibleDepartments.includes(student.department)) {
    isEligible = false;
    reasons.push(
      `Department not eligible (Your dept: ${student.department}, Eligible: ${company.eligibleDepartments.join(', ')})`
    );
  } else {
    passedChecks.push(`✓ Department: ${student.department} is eligible`);
  }

  // ── 7. Batch Check ────────────────────────────────────────
  if (company.eligibleBatch && student.batch && company.eligibleBatch !== student.batch) {
    isEligible = false;
    reasons.push(`Batch not eligible (Required: ${company.eligibleBatch}, Yours: ${student.batch})`);
  }

  return { isEligible, reasons, passedChecks };
};

/**
 * Build a MongoDB query to filter eligible students for a company.
 * Used in admin routes to get the eligible student list.
 * @param {object} company - Company document
 * @returns {object} MongoDB filter object
 */
const buildEligibilityFilter = (company) => {
  const filter = {
    role: 'student',
    isActive: true,
    cgpa: { $gte: company.minCGPA },
    backlogs: { $lte: company.maxBacklogs },
    department: { $in: company.eligibleDepartments },
  };

  if (company.tenthPercentageMin) {
    filter.tenthPercentage = { $gte: company.tenthPercentageMin };
  }
  if (company.twelfthPercentageMin) {
    filter.twelfthPercentage = { $gte: company.twelfthPercentageMin };
  }
  if (company.maxHistoryOfArrears !== null && company.maxHistoryOfArrears !== undefined) {
    filter.historyOfArrears = { $lte: company.maxHistoryOfArrears };
  }
  if (company.eligibleBatch) {
    filter.batch = company.eligibleBatch;
  }

  return filter;
};

module.exports = { checkEligibility, buildEligibilityFilter };
