import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { Card, Button, TextInput, Chip, IconButton, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../config/api';

export default function CompanyManagementScreen() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [iosPicker, setIosPicker] = useState({ open: false, field: null, value: new Date() });
  const [newCompany, setNewCompany] = useState({
    name: '',
    minCGPA: '',
    maxBacklogs: '',
    package: '',
    eligibleDepartments: [],
    description: '',
    jobRole: '',
    location: '',
    driveDate: '',
    registrationDeadline: '',
    tenthPercentageMin: '',
    twelfthPercentageMin: '',
  });

  const DateTimePicker = useMemo(() => {
    try {
      // eslint-disable-next-line global-require
      return require('@react-native-community/datetimepicker');
    } catch (e) {
      return null;
    }
  }, []);

  const DateTimePickerComp = DateTimePicker ? DateTimePicker.default || DateTimePicker : null;
  const DateTimePickerAndroid = DateTimePicker
    ? DateTimePicker.DateTimePickerAndroid || DateTimePicker.DateTimePickerAndroid
    : null;

  const fmtYmd = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const openDatePicker = (field) => {
    if (!DateTimePicker) {
      Alert.alert(
        'Missing Dependency',
        'Install @react-native-community/datetimepicker to use calendar picker.'
      );
      return;
    }

    const currentValue = newCompany[field] ? new Date(newCompany[field]) : new Date();
    const onChange = (event, selectedDate) => {
      if (!selectedDate) return;
      setNewCompany((prev) => ({ ...prev, [field]: fmtYmd(selectedDate) }));
    };

    if (Platform.OS === 'android' && DateTimePickerAndroid) {
      DateTimePickerAndroid.open({
        value: currentValue,
        mode: 'date',
        is24Hour: true,
        onChange,
      });
      return;
    }

    setIosPicker({ open: true, field, value: currentValue });
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setCompanies([]);
        Alert.alert('Auth Required', 'Please login as admin to view companies.');
        return;
      }

      const response = await fetch(buildApiUrl('/companies'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load companies');
      }

      setCompanies(data.companies || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleAddCompany = () => {
    const missing = [];
    if (!String(newCompany.name || '').trim()) missing.push('Company Name');
    if (!String(newCompany.minCGPA || '').trim()) missing.push('Minimum CGPA');
    if (!String(newCompany.maxBacklogs || '').trim()) missing.push('Maximum Backlogs');
    if (!String(newCompany.package || '').trim()) missing.push('Package');
    if (!String(newCompany.description || '').trim()) missing.push('Description');
    if (!String(newCompany.jobRole || '').trim()) missing.push('Job Role');
    if (!String(newCompany.location || '').trim()) missing.push('Location');
    if (!String(newCompany.driveDate || '').trim()) missing.push('Drive Date');
    if (!String(newCompany.registrationDeadline || '').trim()) missing.push('Registration Deadline');
    if (!String(newCompany.tenthPercentageMin || '').trim()) missing.push('10th % Minimum');
    if (!String(newCompany.twelfthPercentageMin || '').trim()) missing.push('12th % Minimum');
    if (!Array.isArray(newCompany.eligibleDepartments) || newCompany.eligibleDepartments.length === 0) {
      missing.push('Eligible Departments');
    }

    if (missing.length) {
      Alert.alert('Missing Fields', `Please fill all fields:\n\n- ${missing.join('\n- ')}`);
      return;
    }

    const parsedMinCgpa = parseFloat(newCompany.minCGPA);
    const parsedMaxBacklogs = parseInt(newCompany.maxBacklogs, 10);
    const parsedTenth = parseFloat(newCompany.tenthPercentageMin);
    const parsedTwelfth = parseFloat(newCompany.twelfthPercentageMin);

    if (Number.isNaN(parsedMinCgpa) || parsedMinCgpa < 0 || parsedMinCgpa > 10) {
      Alert.alert('Error', 'Minimum CGPA must be a number between 0 and 10');
      return;
    }
    if (Number.isNaN(parsedMaxBacklogs) || parsedMaxBacklogs < 0) {
      Alert.alert('Error', 'Maximum Backlogs must be a number 0 or greater');
      return;
    }
    if (Number.isNaN(parsedTenth) || parsedTenth < 0 || parsedTenth > 100) {
      Alert.alert('Error', '10th % Minimum must be a number between 0 and 100');
      return;
    }
    if (Number.isNaN(parsedTwelfth) || parsedTwelfth < 0 || parsedTwelfth > 100) {
      Alert.alert('Error', '12th % Minimum must be a number between 0 and 100');
      return;
    }

    const driveDate = new Date(newCompany.driveDate);
    const registrationDeadline = new Date(newCompany.registrationDeadline);
    if (Number.isNaN(driveDate.getTime())) {
      Alert.alert('Error', 'Drive Date must be a valid date (YYYY-MM-DD)');
      return;
    }
    if (Number.isNaN(registrationDeadline.getTime())) {
      Alert.alert('Error', 'Registration Deadline must be a valid date (YYYY-MM-DD)');
      return;
    }

    const payload = {
      name: newCompany.name.trim(),
      minCGPA: parsedMinCgpa,
      maxBacklogs: parsedMaxBacklogs,
      package: newCompany.package.trim(),
      eligibleDepartments: newCompany.eligibleDepartments,
      description: newCompany.description.trim(),
      jobRole: newCompany.jobRole.trim(),
      location: newCompany.location.trim(),
      driveDate,
      registrationDeadline,
      tenthPercentageMin: parsedTenth,
      twelfthPercentageMin: parsedTwelfth,
    };

    const submit = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          Alert.alert('Auth Required', 'Please login as admin to add companies.');
          return;
        }

        const response = await fetch(buildApiUrl('/companies'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to add company');
        }

        setCompanies((prev) => [data.company, ...prev]);
        setShowAddForm(false);
        setNewCompany({
          name: '',
          minCGPA: '',
          maxBacklogs: '',
          package: '',
          eligibleDepartments: [],
          description: '',
          jobRole: '',
          location: '',
          driveDate: '',
          registrationDeadline: '',
          tenthPercentageMin: '',
          twelfthPercentageMin: '',
        });
        Alert.alert('Success', 'Company added successfully');
      } catch (err) {
        Alert.alert('Error', err.message || 'Unable to add company');
      }
    };

    submit();
  };

  const deleteCompany = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Auth Required', 'Please login as admin to delete companies.');
        return;
      }

      const response = await fetch(buildApiUrl(`/companies/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete company');
      }

      setCompanies((prev) => prev.filter((c) => c._id !== id && c.id !== id));
      Alert.alert('Success', 'Company deleted successfully');
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to delete company');
    }
  };

  const handleDeleteCompany = (id) => {
    Alert.alert(
      'Delete Company',
      'Are you sure you want to delete this company?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCompany(id),
        },
      ]
    );
  };

  const toggleDepartment = (dept) => {
    const depts = newCompany.eligibleDepartments.includes(dept)
      ? newCompany.eligibleDepartments.filter((d) => d !== dept)
      : [...newCompany.eligibleDepartments, dept];
    
    setNewCompany({ ...newCompany, eligibleDepartments: depts });
  };

  const departments = ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL', 'IT', 'AI&DS'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {companies.length} Companies Listed
        </Text>
        <Button
          mode="contained"
          onPress={() => setShowAddForm(!showAddForm)}
          icon={showAddForm ? 'close' : 'plus'}
          style={styles.addButton}
        >
          {showAddForm ? 'Cancel' : 'Add Company'}
        </Button>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size="large" />
          <Text style={styles.loadingText}>Loading companies...</Text>
        </View>
      )}

      {showAddForm && (
        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={styles.formTitle}>Add New Company</Text>

            <TextInput
              label="Company Name *"
              value={newCompany.name}
              onChangeText={(text) => setNewCompany({ ...newCompany, name: text })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Minimum CGPA *"
              value={newCompany.minCGPA}
              onChangeText={(text) => setNewCompany({ ...newCompany, minCGPA: text })}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              placeholder="e.g., 7.0"
            />

            <TextInput
              label="Maximum Backlogs *"
              value={newCompany.maxBacklogs}
              onChangeText={(text) => setNewCompany({ ...newCompany, maxBacklogs: text })}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              placeholder="e.g., 0"
            />

            <TextInput
              label="Package *"
              value={newCompany.package}
              onChangeText={(text) => setNewCompany({ ...newCompany, package: text })}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., 8-10 LPA"
            />

            <TextInput
              label="Description *"
              value={newCompany.description}
              onChangeText={(text) => setNewCompany({ ...newCompany, description: text })}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <TextInput
              label="Job Role *"
              value={newCompany.jobRole}
              onChangeText={(text) => setNewCompany({ ...newCompany, jobRole: text })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Location *"
              value={newCompany.location}
              onChangeText={(text) => setNewCompany({ ...newCompany, location: text })}
              mode="outlined"
              style={styles.input}
            />

            <Pressable onPress={() => openDatePicker('driveDate')}>
              <View pointerEvents="none">
                <TextInput
                  label="Drive Date *"
                  value={newCompany.driveDate}
                  mode="outlined"
                  style={styles.input}
                />
              </View>
            </Pressable>

            <Pressable onPress={() => openDatePicker('registrationDeadline')}>
              <View pointerEvents="none">
                <TextInput
                  label="Registration Deadline *"
                  value={newCompany.registrationDeadline}
                  mode="outlined"
                  style={styles.input}
                />
              </View>
            </Pressable>

            {iosPicker.open && DateTimePickerComp && (
              <View style={styles.iosPickerBox}>
                <DateTimePickerComp
                  value={iosPicker.value}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (!selectedDate) return;
                    setNewCompany((prev) => ({ ...prev, [iosPicker.field]: fmtYmd(selectedDate) }));
                  }}
                />
                <Button
                  mode="contained"
                  onPress={() => setIosPicker({ open: false, field: null, value: new Date() })}
                  style={styles.iosPickerDone}
                >
                  Done
                </Button>
              </View>
            )}

            <TextInput
              label="10th % Minimum *"
              value={newCompany.tenthPercentageMin}
              onChangeText={(text) => setNewCompany({ ...newCompany, tenthPercentageMin: text })}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />

            <TextInput
              label="12th % Minimum *"
              value={newCompany.twelfthPercentageMin}
              onChangeText={(text) => setNewCompany({ ...newCompany, twelfthPercentageMin: text })}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.label}>Eligible Departments: *</Text>
            <View style={styles.departmentContainer}>
              {departments.map((dept) => (
                <Chip
                  key={dept}
                  selected={newCompany.eligibleDepartments.includes(dept)}
                  onPress={() => toggleDepartment(dept)}
                  style={styles.deptChip}
                >
                  {dept}
                </Chip>
              ))}
            </View>

            <Button
              mode="contained"
              onPress={handleAddCompany}
              style={styles.submitButton}
            >
              Add Company
            </Button>
          </Card.Content>
        </Card>
      )}

      {companies.map((company) => (
        <Card key={company._id || company.id} style={styles.companyCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.companyName}>{company.name}</Text>
                <Chip style={styles.packageChip}>{company.package}</Chip>
              </View>
              <IconButton
                icon="delete"
                iconColor="#c62828"
                size={24}
                onPress={() => handleDeleteCompany(company._id || company.id)}
              />
            </View>

            <View style={styles.criteriaContainer}>
              <View style={styles.criteriaRow}>
                <Text style={styles.criteriaLabel}>Min CGPA:</Text>
                <Text style={styles.criteriaValue}>{company.minCGPA}</Text>
              </View>

              <View style={styles.criteriaRow}>
                <Text style={styles.criteriaLabel}>Max Backlogs:</Text>
                <Text style={styles.criteriaValue}>{company.maxBacklogs}</Text>
              </View>

              <View style={styles.departmentRow}>
                <Text style={styles.criteriaLabel}>Departments:</Text>
                <View style={styles.deptChipsContainer}>
                  {company.eligibleDepartments.map((dept, index) => (
                    <Chip key={index} style={styles.viewDeptChip} textStyle={styles.chipText}>
                      {dept}
                    </Chip>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.description}>{company.description}</Text>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#6200ee',
    padding: 20,
    marginBottom: 15,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  addButton: {
    borderRadius: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 13,
  },
  formCard: {
    margin: 15,
    borderRadius: 15,
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#6200ee',
  },
  input: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
    marginBottom: 8,
  },
  departmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  deptChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 10,
    borderRadius: 10,
  },
  iosPickerBox: {
    marginBottom: 12,
  },
  iosPickerDone: {
    marginTop: 8,
    borderRadius: 10,
  },
  companyCard: {
    margin: 10,
    borderRadius: 15,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  cardTitleContainer: {
    flex: 1,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  packageChip: {
    backgroundColor: '#6200ee',
    alignSelf: 'flex-start',
  },
  criteriaContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  criteriaLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  criteriaValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  departmentRow: {
    marginTop: 8,
  },
  deptChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  viewDeptChip: {
    marginRight: 5,
    marginBottom: 5,
    backgroundColor: '#e3f2fd',
  },
  chipText: {
    fontSize: 11,
  },
  description: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
});
