# 🔌 Frontend API Integration Guide
# Replace mockData with real API calls in your React Native app

## 1. Install axios in your frontend project
```
npm install axios @react-native-async-storage/async-storage
```

## 2. Create src/services/api.js in your React Native project

```javascript
// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your backend URL
// For Android Emulator: http://10.0.2.2:5000
// For iOS Simulator:    http://localhost:5000
// For Physical Device:  http://<your-ip>:5000
const BASE_URL = 'http://10.0.2.2:5000/api';

const api = axios.create({ baseURL: BASE_URL });

// Auto-attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ────────────────────────────────────────────────────
export const loginAPI = (email, password) =>
  api.post('/auth/login', { email, password });

export const registerAPI = (data) =>
  api.post('/auth/register', data);

// ── Student ──────────────────────────────────────────────────
export const getProfileAPI = () =>
  api.get('/students/profile');

export const updateProfileAPI = (data) =>
  api.put('/students/profile', data);

export const checkEligibilityAPI = () =>
  api.get('/students/eligibility');

// ── Companies ────────────────────────────────────────────────
export const getCompaniesAPI = () =>
  api.get('/companies');

export const addCompanyAPI = (data) =>
  api.post('/companies', data);

export const updateCompanyAPI = (id, data) =>
  api.put(`/companies/${id}`, data);

export const deleteCompanyAPI = (id) =>
  api.delete(`/companies/${id}`);

// ── Documents (File Upload) ──────────────────────────────────
export const uploadDocumentAPI = (file, documentType) => {
  const formData = new FormData();
  formData.append('document', {
    uri: file.uri,
    type: file.type || 'application/pdf',
    name: file.name || 'document.pdf',
  });
  formData.append('documentType', documentType);
  return api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getMyDocumentsAPI = () =>
  api.get('/documents/my-docs');

export const deleteDocumentAPI = (id) =>
  api.delete(`/documents/${id}`);

// ── Admin ─────────────────────────────────────────────────────
export const getAdminStatsAPI = () =>
  api.get('/admin/stats');

export const getAllStudentsAPI = (params) =>
  api.get('/admin/students', { params });

export const getEligibleStudentsAPI = (companyId) =>
  api.get(`/admin/eligible-students/${companyId}`);
```

## 3. Update LoginScreen.js
Replace mock login with:
```javascript
// Replace handleLogin mock block with:
const response = await loginAPI(email, password);
const { token, user } = response.data;
await AsyncStorage.setItem('token', token);
await AsyncStorage.setItem('user', JSON.stringify(user));
```

## 4. Update StudentProfileScreen.js
```javascript
// Load profile
const response = await getProfileAPI();
const data = response.data.student;
setUser({ name: data.name, ... });

// Save profile
await updateProfileAPI({ name, registerNumber, department, cgpa, backlogs });
```

## 5. Update EligibilityResultScreen.js
```javascript
// Replace mockCompanies map with:
const response = await checkEligibilityAPI();
setResults(response.data.results);
setStats(response.data.summary);
```

## 6. Update CompanyManagementScreen.js (Admin)
```javascript
// Load companies
const res = await getCompaniesAPI();
setCompanies(res.data.companies);

// Add company
await addCompanyAPI({ name, minCGPA, maxBacklogs, package, eligibleDepartments, description });

// Delete company
await deleteCompanyAPI(id);
```

## 7. File Upload in StudentProfileScreen
```javascript
import * as DocumentPicker from 'expo-document-picker';

const pickAndUploadResume = async () => {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
  if (!result.canceled) {
    const file = result.assets[0];
    const res = await uploadDocumentAPI(file, 'resume');
    Alert.alert('Success', 'Resume uploaded!');
  }
};
```
