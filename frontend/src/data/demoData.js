// Demo data for offline mode / network failures

export const demoStudent = {
  id: 'demo-student',
  name: 'Demo Student',
  registerNumber: 'AI2026001',
  department: 'AI&DS',
  cgpa: 7.8,
  backlogs: 0,
  tenthPercentage: 85,
  twelfthPercentage: 82,
};

export const demoStudents = [
  demoStudent,
  {
    id: 'student-2',
    name: 'Rahul Kumar',
    registerNumber: 'CSE2026002',
    department: 'CSE',
    cgpa: 6.9,
    backlogs: 0,
  },
  {
    id: 'student-3',
    name: 'Priya Sharma',
    registerNumber: 'IT2026003',
    department: 'IT',
    cgpa: 8.2,
    backlogs: 0,
  },
];

export const demoCompanies = [
  {
    id: 'c1',
    name: 'Infosys',
    jobRole: 'Software Engineer',
    package: '6 LPA',
    minCGPA: 7.0,
    maxBacklogs: 0,
    eligibleDepartments: ['CSE', 'AI&DS', 'IT'],
    registrationDeadline: '2026-03-20',
    driveDate: '2026-03-25',
    driveStatus: 'open',
    description: 'Infosys campus hiring',
  },
  {
    id: 'c2',
    name: 'TCS',
    jobRole: 'Ninja Developer',
    package: '4 LPA',
    minCGPA: 6.5,
    maxBacklogs: 0,
    eligibleDepartments: ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'IT', 'AI&DS'],
    registrationDeadline: '2026-03-18',
    driveDate: '2026-03-22',
    driveStatus: 'open',
    description: 'TCS Ninja drive',
  },
  {
    id: 'c3',
    name: 'Wipro',
    jobRole: 'Project Engineer',
    package: '3.5 LPA',
    minCGPA: 6.0,
    maxBacklogs: 0,
    eligibleDepartments: ['CSE', 'IT'],
    registrationDeadline: '2026-03-21',
    driveDate: '2026-03-28',
    driveStatus: 'open',
    description: 'Wipro campus drive',
  },
  {
    id: 'c4',
    name: 'Zoho',
    jobRole: 'Backend Developer',
    package: '8 LPA',
    minCGPA: 7.5,
    maxBacklogs: 0,
    eligibleDepartments: ['CSE', 'AI&DS'],
    registrationDeadline: '2026-03-19',
    driveDate: '2026-03-23',
    driveStatus: 'open',
    description: 'Zoho backend drive',
  },
  {
    id: 'c5',
    name: 'HCL',
    jobRole: 'Software Trainee',
    package: '4.5 LPA',
    minCGPA: 6.5,
    maxBacklogs: 0,
    eligibleDepartments: ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'IT', 'AI&DS'],
    registrationDeadline: '2026-03-22',
    driveDate: '2026-03-26',
    driveStatus: 'open',
    description: 'HCL campus hiring',
  },
];

export const demoApplications = [
  { id: 'a1', studentId: 'demo-student', companyId: 'c1', status: 'applied' },
  { id: 'a2', studentId: 'demo-student', companyId: 'c2', status: 'shortlisted' },
];

export const demoNotifications = [
  {
    id: 'n1',
    title: 'Zoho Drive Registration',
    message: 'Apply before March 19',
    createdAt: new Date('2026-03-12T09:00:00Z').toISOString(),
    isRead: false,
  },
  {
    id: 'n2',
    title: 'TCS Drive Update',
    message: 'Drive date updated to March 22',
    createdAt: new Date('2026-03-11T10:30:00Z').toISOString(),
    isRead: true,
  },
];

export const demoAdminStats = {
  totalCompanies: 5,
  totalStudents: 120,
  avgCGPA: 7.4,
  totalDocuments: 64,
};

export const demoAppStats = {
  totalApplications: 78,
  shortlisted: 24,
  selected: 12,
  totalPlaced: 65,
};

export const demoDeptStats = [
  { _id: 'CSE', total: 40, placed: 22, avgCGPA: 7.6 },
  { _id: 'AI&DS', total: 25, placed: 14, avgCGPA: 7.8 },
  { _id: 'IT', total: 20, placed: 11, avgCGPA: 7.3 },
  { _id: 'ECE', total: 15, placed: 8, avgCGPA: 7.1 },
];

export const demoChart = {
  labels: ['CSE', 'AI&DS', 'IT', 'ECE'],
  data: [40, 25, 20, 15],
};

export const computeEligibility = (student, company) => {
  if (!student || !company) return false;
  const cgpaOk = student.cgpa >= company.minCGPA;
  const backlogsOk = (student.backlogs || 0) <= (company.maxBacklogs || 0);
  const deptOk = company.eligibleDepartments.includes(student.department);
  return cgpaOk && backlogsOk && deptOk;
};

export const eligibleCompaniesForStudent = (student) =>
  demoCompanies.filter((c) => computeEligibility(student, c));

export const eligibleStudentsForCompany = (company) =>
  demoStudents.filter((s) => computeEligibility(s, company));

export const demoDashboardCounts = {
  total: 5,
  eligible: 4,
  notEligible: 1,
  applied: 2,
  shortlisted: 1,
};

export const demoResumeUrl =
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
