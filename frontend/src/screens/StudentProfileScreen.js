import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { TextInput, Button, Dialog, Portal, useTheme, RadioButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, apiJson } from '../config/api';
import { demoStudent } from '../data/demoData';

const DEGREE_OPTIONS = [
  { value: 'BE', label: 'B.E' },
  { value: 'BTECH', label: 'B.Tech' },
];

const DEPARTMENTS_BY_DEGREE = {
  BE: [
    'Biomedical Engineering',
    'Civil Engineering',
    'Computer Science & Design',
    'Computer Science & Engineering',
    'Electrical & Electronics Engineering',
    'Electronics & Communication Engineering',
    'Electronics & Instrumentation Engineering',
    'Information Science & Engineering',
    'Mechanical Engineering',
    'Mechatronics Engineering',
  ],
  BTECH: [
    'Agricultural Engineering',
    'Artificial Intelligence and Data Science',
    'Artificial Intelligence and Machine Learning',
    'Biotechnology',
    'Computer Science & Business Systems',
    'Computer Technology',
    'Food Technology',
    'Fashion Technology',
    'Information Technology',
    'Textile Technology',
  ],
};

export default function StudentProfileScreen({ navigation }) {
  const theme = useTheme();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [user, setUser] = useState({
    name: '',
    registerNumber: '',
    phone: '',
    degree: '',
    department: '',
    batch: '',
    cgpa: '',
    backlogs: '',
    historyOfArrears: '',
    tenthPercentage: '',
    twelfthPercentage: '',
  });
  const [loading, setLoading] = useState(false);
  const [deptOther, setDeptOther] = useState('');
  const [firstVisit, setFirstVisit] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { response, data } = await apiFetch('/students/profile');
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load profile');
      }

      const student = data.student || {};
      const profileComplete = !!student.profileComplete;
      setFirstVisit(!profileComplete);
      setUser({
        name: student.name || '',
        registerNumber: student.registerNumber || '',
        phone: student.phone || '',
        degree: student.degree || '',
        department: student.department || '',
        batch: student.batch || '',
        cgpa: student.cgpa !== null && student.cgpa !== undefined ? String(student.cgpa) : '',
        backlogs: student.backlogs !== null && student.backlogs !== undefined ? String(student.backlogs) : '',
        historyOfArrears: student.historyOfArrears !== null && student.historyOfArrears !== undefined ? String(student.historyOfArrears) : '',
        tenthPercentage: student.tenthPercentage !== null && student.tenthPercentage !== undefined ? String(student.tenthPercentage) : '',
        twelfthPercentage: student.twelfthPercentage !== null && student.twelfthPercentage !== undefined ? String(student.twelfthPercentage) : '',
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      setUser({
        name: demoStudent.name,
        registerNumber: demoStudent.registerNumber,
        phone: '',
        degree: '',
        department: demoStudent.department,
        batch: '',
        cgpa: String(demoStudent.cgpa),
        backlogs: String(demoStudent.backlogs),
        historyOfArrears: '0',
        tenthPercentage: String(demoStudent.tenthPercentage),
        twelfthPercentage: String(demoStudent.twelfthPercentage),
      });
    }
  };

  const handleSave = async () => {
    const requiredFields = [
      { key: 'name', label: 'Name' },
      { key: 'registerNumber', label: 'Register Number' },
      { key: 'phone', label: 'Phone' },
      { key: 'degree', label: 'Degree' },
      { key: 'department', label: 'Department' },
      { key: 'batch', label: 'Batch' },
      { key: 'cgpa', label: 'CGPA' },
      { key: 'backlogs', label: 'Backlogs' },
      { key: 'historyOfArrears', label: 'History of Arrears' },
      { key: 'tenthPercentage', label: '10th Percentage' },
      { key: 'twelfthPercentage', label: '12th Percentage' },
    ];

    const missing = requiredFields.filter(({ key }) => !String(user[key] || '').trim());
    if (missing.length > 0) {
      Alert.alert('Error', `Please fill: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }

    const cgpa = parseFloat(user.cgpa);
    const backlogs = parseInt(user.backlogs, 10);
    const historyOfArrears = parseInt(user.historyOfArrears || '0', 10);
    const tenthPercentage = parseFloat(user.tenthPercentage);
    const twelfthPercentage = parseFloat(user.twelfthPercentage);

    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
      Alert.alert('Error', 'Please enter valid CGPA (0-10)');
      return;
    }

    if (isNaN(backlogs) || backlogs < 0) {
      Alert.alert('Error', 'Please enter valid number of backlogs');
      return;
    }

    if (isNaN(tenthPercentage) || tenthPercentage < 0 || tenthPercentage > 100) {
      Alert.alert('Error', 'Please enter valid 10th % (0-100)');
      return;
    }

    if (isNaN(twelfthPercentage) || twelfthPercentage < 0 || twelfthPercentage > 100) {
      Alert.alert('Error', 'Please enter valid 12th % (0-100)');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: user.name,
        registerNumber: user.registerNumber,
        phone: user.phone,
        degree: user.degree,
        department: user.department,
        batch: user.batch,
        cgpa,
        backlogs,
        historyOfArrears,
        tenthPercentage,
        twelfthPercentage,
      };

      const { response, data } = await apiJson('/students/profile', 'PUT', payload);
      if (!response.ok || !data.success) {
        Alert.alert('Error', data.message || 'Failed to save profile');
        setLoading(false);
        return;
      }

      const userData = await AsyncStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : {};
      await AsyncStorage.setItem('user', JSON.stringify({ ...currentUser, ...data.student, profileComplete: true }));

      const onContinue = firstVisit
        ? () => navigation.replace('StudentApp')
        : () => navigation.goBack();

      onContinue();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const confirmLogout = async () => {
    setLogoutOpen(false);
    await AsyncStorage.multiRemove(['user', 'token']);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login', params: { toast: 'Logged out successfully' } }],
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Portal>
        <Dialog visible={logoutOpen} onDismiss={() => setLogoutOpen(false)}>
          <Dialog.Title>Logout</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>Are you sure you want to logout?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutOpen(false)}>Cancel</Button>
            <Button onPress={confirmLogout} textColor={theme.colors.error}>
              Logout
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>Student Profile</Text>
        <Text style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
          All fields are required. Complete this once to access the dashboard.
        </Text>

        <TextInput
          label="Name *"
          value={user.name}
          onChangeText={(text) => setUser({ ...user, name: text })}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="account" />}
        />

        <TextInput
          label="Register Number *"
          value={user.registerNumber}
          onChangeText={(text) => setUser({ ...user, registerNumber: text })}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="badge-account" />}
        />

        <TextInput
          label="Phone *"
          value={user.phone}
          onChangeText={(text) => setUser({ ...user, phone: text })}
          mode="outlined"
          style={styles.input}
          keyboardType="phone-pad"
          left={<TextInput.Icon icon="phone" />}
        />

        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Degree *</Text>
        <RadioButton.Group
          onValueChange={(value) => {
            const firstDept = (DEPARTMENTS_BY_DEGREE[value] || [])[0] || '';
            setUser((prev) => ({
              ...prev,
              degree: value,
              department: firstDept,
            }));
            setDeptOther('');
          }}
          value={user.degree}
        >
          <View style={styles.degreeRow}>
            {DEGREE_OPTIONS.map((opt) => (
              <View key={opt.value} style={styles.degreeOption}>
                <RadioButton value={opt.value} />
                <Text style={{ color: theme.colors.onSurface }}>{opt.label}</Text>
              </View>
            ))}
          </View>
        </RadioButton.Group>

        <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Department *</Text>
        <TextInput
          mode="outlined"
          value={
            DEPARTMENTS_BY_DEGREE[user.degree]?.includes(user.department)
              ? user.department
              : deptOther
          }
          onFocus={() => {}}
          style={styles.input}
          placeholder="Select from below"
          left={<TextInput.Icon icon="school" />}
          editable={false}
        />
        <View style={styles.deptList}>
          {(DEPARTMENTS_BY_DEGREE[user.degree] || []).map((dept) => (
            <Button
              key={dept}
              mode={user.department === dept ? 'contained' : 'outlined'}
              style={styles.deptChip}
              onPress={() => {
                setUser((prev) => ({ ...prev, department: dept }));
                setDeptOther('');
              }}
              compact
            >
              {dept}
            </Button>
          ))}
        </View>
        <TextInput
          label="Other Department"
          value={deptOther}
          onChangeText={(text) => {
            setDeptOther(text);
            setUser((prev) => ({ ...prev, department: text }));
          }}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="plus" />}
          placeholder="If not listed above"
        />

        <TextInput
          label="Batch *"
          value={user.batch}
          onChangeText={(text) => setUser({ ...user, batch: text })}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="calendar" />}
          placeholder="e.g., 2021-2025"
        />

        <TextInput
          label="CGPA *"
          value={user.cgpa}
          onChangeText={(text) => setUser({ ...user, cgpa: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          left={<TextInput.Icon icon="chart-line" />}
          placeholder="0.00 - 10.00"
        />

        <TextInput
          label="Number of Backlogs *"
          value={user.backlogs}
          onChangeText={(text) => setUser({ ...user, backlogs: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          left={<TextInput.Icon icon="alert-circle" />}
          placeholder="0"
        />

        <TextInput
          label="History of Arrears"
          value={user.historyOfArrears}
          onChangeText={(text) => setUser({ ...user, historyOfArrears: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          left={<TextInput.Icon icon="alert" />}
          placeholder="0"
        />

        <TextInput
          label="10th Percentage *"
          value={user.tenthPercentage}
          onChangeText={(text) => setUser({ ...user, tenthPercentage: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          left={<TextInput.Icon icon="chart-line" />}
          placeholder="0 - 100"
        />

        <TextInput
          label="12th Percentage *"
          value={user.twelfthPercentage}
          onChangeText={(text) => setUser({ ...user, twelfthPercentage: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          left={<TextInput.Icon icon="chart-line" />}
          placeholder="0 - 100"
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Save Profile
        </Button>

        <Button
          mode="outlined"
          onPress={() => setLogoutOpen(true)}
          style={[styles.logoutButton, { borderColor: theme.colors.error }]}
          textColor={theme.colors.error}
          icon="logout"
        >
          Logout
        </Button>
      </View>
    </ScrollView>
  );
}

  const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 15,
    padding: 20,
    borderRadius: 15,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    marginBottom: 15,
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: 6,
    marginTop: 6,
    fontWeight: '600',
  },
  degreeRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 10,
  },
  degreeOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deptList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  deptChip: {
    marginRight: 6,
    marginBottom: 6,
    borderRadius: 8,
  },
  button: {
    marginTop: 20,
    borderRadius: 10,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  logoutButton: {
    marginTop: 12,
    borderRadius: 10,
  },
});
