# Placement Eligibility App

A React Native mobile application for managing campus placements, allowing students to check their eligibility for various companies and administrators to manage company criteria.

## 📱 Features

### Student Features
- ✅ Login with email and password
- ✅ View and update profile (Name, Register Number, Department, CGPA, Backlogs)
- ✅ Check eligibility for all companies
- ✅ View company list with eligibility criteria
- ✅ Dashboard with placement statistics
- ✅ Real-time eligibility status with reasons

### Admin Features
- ✅ Admin dashboard with analytics
- ✅ Add/Edit/Delete company criteria
- ✅ View student statistics
- ✅ Manage eligibility requirements
- ✅ Visual charts and reports

## 🛠️ Technology Stack

- **Frontend:** React Native (Expo)
- **UI Library:** React Native Paper
- **Navigation:** React Navigation
- **Storage:** AsyncStorage (Local)
- **Charts:** React Native Chart Kit
- **Database:** MySQL/PostgreSQL (Schema provided)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for Android emulator) or Xcode (for iOS simulator)
- MySQL or PostgreSQL (for production database)

## 🚀 Installation & Setup

### 1. Clone or Extract the Project

```bash
cd placement-app
```

### 2. Install Dependencies

```bash
npm install
```

Or using yarn:

```bash
yarn install
```

### 3. Start the Application

```bash
npm start
```

Or:

```bash
expo start
```

### 4. Run on Device/Emulator

- **Android:** Press `a` in the terminal or scan QR code with Expo Go app
- **iOS:** Press `i` in the terminal or scan QR code with Expo Go app (Mac only)
- **Web:** Press `w` to run in browser

## 🔐 Demo Credentials

### Student Account
- **Email:** student@bitsathy.ac.in
- **Password:** password123

### Admin Account
- **Email:** admin@bitsathy.ac.in
- **Password:** admin123

## 📁 Project Structure

```
placement-app/
├── App.js                          # Main app entry point
├── package.json                    # Dependencies
├── src/
│   ├── screens/                    # All screen components
│   │   ├── LoginScreen.js
│   │   ├── StudentHomeScreen.js
│   │   ├── CompanyListScreen.js
│   │   ├── EligibilityResultScreen.js
│   │   ├── StudentProfileScreen.js
│   │   ├── AdminDashboardScreen.js
│   │   └── CompanyManagementScreen.js
│   └── data/
│       └── mockData.js             # Sample data
└── database/
    └── schema.sql                  # Database schema
```

## 🗄️ Database Setup

### For Production Use (Optional)

1. Install MySQL or PostgreSQL

2. Create the database:
   ```sql
   CREATE DATABASE placement_app;
   ```

3. Run the schema file:
   ```bash
   mysql -u your_username -p placement_app < database/schema.sql
   ```

   Or for PostgreSQL:
   ```bash
   psql -U your_username -d placement_app -f database/schema.sql
   ```

4. Update connection settings in your backend (when implementing API)

> **Note:** Currently, the app uses local AsyncStorage for demonstration. The SQL schema is provided for future backend integration.

## 📊 Database Schema Overview

The database includes the following tables:

- **users** - User authentication and roles
- **students** - Student academic information
- **companies** - Company details and criteria
- **eligible_departments** - Department eligibility mapping
- **eligibility_results** - Eligibility check audit trail
- **applications** - Student applications tracking
- **placement_statistics** - Dashboard statistics
- **admin_logs** - Admin activity logs

### Key Views:
- `student_eligibility_summary` - Quick student eligibility overview
- `company_application_stats` - Company-wise application statistics

### Stored Procedures:
- `CheckEligibility` - Automated eligibility checking with reason generation

## 🎯 Usage Guide

### For Students

1. **Login** with your credentials
2. **Update Profile** with your academic details (CGPA, Backlogs, Department)
3. **View Companies** to see all available opportunities
4. **Check Eligibility** to see which companies you're eligible for
5. View detailed reasons if you're not eligible for certain companies

### For Admins

1. **Login** with admin credentials
2. **View Dashboard** for placement statistics
3. **Manage Companies** - Add new companies or edit existing criteria
4. Set eligibility requirements:
   - Minimum CGPA
   - Maximum backlogs allowed
   - Eligible departments
   - Package details

## 🔧 Customization

### Adding New Companies

Admins can add companies through the app interface, or you can modify `src/data/mockData.js`:

```javascript
{
  id: 'unique_id',
  name: 'Company Name',
  minCGPA: 7.0,
  maxBacklogs: 0,
  package: '5-7 LPA',
  eligibleDepartments: ['CSE', 'IT', 'AI&DS'],
  description: 'Company description',
}
```

### Modifying Color Scheme

Update colors in respective screen StyleSheets. The primary color is `#6200ee` (purple).

## 📦 Building for Production

### Android APK

```bash
expo build:android
```

### iOS IPA

```bash
expo build:ios
```

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler port in use:**
   ```bash
   npx react-native start --reset-cache
   ```

2. **Dependencies not installing:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Expo app not connecting:**
   - Ensure both devices are on the same network
   - Try using tunnel mode: `expo start --tunnel`

## 🚧 Future Enhancements

- [ ] Firebase backend integration
- [ ] Push notifications for new company postings
- [ ] Document upload feature
- [ ] Interview scheduling
- [ ] Email notifications
- [ ] Excel export functionality
- [ ] Advanced filtering and search
- [ ] Student performance analytics

## 👨‍💻 Developer Information

**Name:** BHARATH M B  
**Register Number:** 7376232AD117  
**Email:** bharathmb.ad23@bitsathy.ac.in  
**Department:** B.Tech - Artificial Intelligence & Data Science  
**Year:** III Year / VI Semester  
**Institution:** Bannari Amman Institute of Technology, Sathyamangalam  

## 📄 License

This project is created for educational purposes as a Mini Project.

## 🙏 Acknowledgments

- React Native Community
- Expo Documentation
- React Native Paper
- BIT Sathy Placement Cell

## 📞 Support

For any queries or issues, please contact:  
📧 bharathmb.ad23@bitsathy.ac.in

---

**Last Updated:** 03-02-2026  
**Version:** 1.0.0
