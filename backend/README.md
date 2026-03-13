# 🎓 Placement Eligibility App — Backend
**Node.js + Express + MongoDB + JWT + Multer**

## 📁 Project Structure
```
placement-backend/
├── server.js                  ← Entry point
├── seed.js                    ← Seed DB with demo data
├── .env.example               ← Copy to .env
├── package.json
│
├── config/
│   └── db.js                  ← MongoDB connection
│
├── models/
│   ├── User.js                ← Student & Admin schema
│   ├── Company.js             ← Company + eligibility criteria
│   └── Document.js            ← Uploaded files metadata
│
├── middleware/
│   ├── authMiddleware.js      ← JWT protect + adminOnly
│   └── uploadMiddleware.js    ← Multer file upload handler
│
├── routes/
│   ├── authRoutes.js          ← /api/auth/*
│   ├── studentRoutes.js       ← /api/students/*
│   ├── companyRoutes.js       ← /api/companies/*
│   ├── documentRoutes.js      ← /api/documents/*  (FILE UPLOADER)
│   └── adminRoutes.js         ← /api/admin/*
│
├── uploads/                   ← Auto-created on first upload
│   ├── resumes/
│   ├── marksheets/
│   ├── offer_letters/
│   ├── logos/
│   └── others/
│
└── FRONTEND_INTEGRATION.md    ← How to connect React Native app
```

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 16
- MongoDB running locally or MongoDB Atlas URI

### 2. Setup
```bash
cd placement-backend
npm install
cp .env.example .env
# Edit .env with your MONGO_URI
```

### 3. Seed Database
```bash
node seed.js
```
This creates:
- Admin: `admin@bitsathy.ac.in` / `admin123`
- Student: `student@bitsathy.ac.in` / `password123`
- 5 sample companies (TCS, Infosys, Wipro, Zoho, Cognizant)

### 4. Start Server
```bash
npm run dev    # Development (with nodemon)
npm start      # Production
```
Server runs at **http://localhost:5000**

---

## 🔐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (returns JWT token) |
| POST | `/api/auth/register` | Student self-registration |
| POST | `/api/auth/create-admin` | Create admin (needs secretKey) |
| GET | `/api/auth/me` | Get current user |

### Student (🔒 JWT Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students/profile` | Get my profile |
| PUT | `/api/students/profile` | Update profile |
| GET | `/api/students/eligibility` | Check eligibility for all companies |

### Companies (🔒 JWT Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies` | List all active companies |
| GET | `/api/companies/:id` | Get single company |
| POST | `/api/companies` | ⚡ **[ADMIN]** Add company |
| PUT | `/api/companies/:id` | ⚡ **[ADMIN]** Edit criteria |
| DELETE | `/api/companies/:id` | ⚡ **[ADMIN]** Delete company |
| POST | `/api/companies/:id/logo` | ⚡ **[ADMIN]** Upload logo |

### Documents / File Uploader (🔒 JWT Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload` | Upload document (PDF/JPG/PNG, max 5MB) |
| GET | `/api/documents/my-docs` | View my uploaded documents |
| DELETE | `/api/documents/:id` | Delete my document |
| GET | `/api/documents/all` | ⚡ **[ADMIN]** View all docs |
| PUT | `/api/documents/:id/verify` | ⚡ **[ADMIN]** Verify document |

### Admin (🔒 JWT + Admin Role Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard stats + chart data |
| GET | `/api/admin/students` | List all students (with filters) |
| GET | `/api/admin/students/:id` | Single student full profile |
| PUT | `/api/admin/students/:id/status` | Activate/deactivate student |
| GET | `/api/admin/eligible-students/:companyId` | Students eligible for a company |

---

## 📎 File Upload Details

**Supported Types:** PDF, JPG, PNG
**Max Size:** 5MB per file
**Document Types:**
- `resume`
- `tenth_marksheet`
- `twelfth_marksheet`
- `ug_marksheet`
- `offer_letter`
- `other`

**Sample Upload Request (multipart/form-data):**
```
POST /api/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

document: <file>
documentType: resume
```

---

## 🛡️ Eligibility Logic
Matches frontend `EligibilityResultScreen.js`:
1. `student.cgpa >= company.minCGPA`
2. `student.backlogs <= company.maxBacklogs`
3. `company.eligibleDepartments.includes(student.department)`
4. *(Optional)* 10th % and 12th % checks

---

## 📊 Admin Dashboard Data
`GET /api/admin/stats` returns:
```json
{
  "stats": {
    "totalCompanies": 5,
    "totalStudents": 120,
    "avgCGPA": 7.82,
    "totalDocuments": 43
  },
  "chart": {
    "labels": ["CSE", "ECE", "MECH"],
    "data": [55, 30, 15]
  }
}
```
Directly feeds AdminDashboardScreen BarChart.
