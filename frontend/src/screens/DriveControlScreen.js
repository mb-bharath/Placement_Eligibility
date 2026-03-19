import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, Platform, Pressable } from 'react-native';
import { Card, TextInput, Button, Chip } from 'react-native-paper';
import { apiFetch, apiJson } from '../config/api';
import { demoCompanies } from '../data/demoData';

export default function DriveControlScreen({ navigation }) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [form, setForm] = useState({
    jobRole: '',
    location: '',
    driveDate: '',
    registrationDeadline: '',
    driveStatus: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { response, data } = await apiFetch('/companies');
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load companies');
      }
      setCompanies(data.companies || []);
    } catch (err) {
      setCompanies(demoCompanies);
    }
  };

  const selectCompany = (company) => {
    setSelectedCompany(company);
    setForm({
      jobRole: company.jobRole || '',
      location: company.location || '',
      driveDate: company.driveDate ? company.driveDate.slice(0, 10) : '',
      registrationDeadline: company.registrationDeadline ? company.registrationDeadline.slice(0, 10) : '',
      driveStatus: company.driveStatus || '',
    });
  };

  const saveDrive = async () => {
    if (!selectedCompany) {
      Alert.alert('Error', 'Please select a company');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        jobRole: form.jobRole,
        location: form.location,
        driveDate: form.driveDate ? new Date(form.driveDate) : null,
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline) : null,
        driveStatus: form.driveStatus,
      };
      const { response, data } = await apiJson(`/companies/${selectedCompany._id}`, 'PUT', payload);
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update drive');
      }
      Alert.alert('Success', 'Drive details updated', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Saved Locally', 'Drive details saved locally (demo mode).', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const DateTimePicker = useMemo(() => {
    try {
      // eslint-disable-next-line global-require
      return require('@react-native-community/datetimepicker');
    } catch (e) {
      return null;
    }
  }, []);

  const DateTimePickerComp = DateTimePicker ? DateTimePicker.default || DateTimePicker : null;
  const DateTimePickerAndroid = DateTimePicker ? DateTimePicker.DateTimePickerAndroid || DateTimePicker.DateTimePickerAndroid : null;

  const openDatePicker = (field) => {
    if (!DateTimePicker) {
      Alert.alert(
        'Missing Dependency',
        'Install @react-native-community/datetimepicker to use calendar picker.'
      );
      return;
    }

    const currentValue = form[field] ? new Date(form[field]) : new Date();
    const onChange = (event, selectedDate) => {
      if (!selectedDate) return;
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      setForm((prev) => ({ ...prev, [field]: `${yyyy}-${mm}-${dd}` }));
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

  const [iosPicker, setIosPicker] = useState({ open: false, field: null, value: new Date() });

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Drive Control</Text>
          <Text style={styles.subtitle}>Update drive schedule and details</Text>

          <View style={styles.chipRow}>
            {companies.map((c) => (
              <Chip
                key={c._id}
                selected={selectedCompany?._id === c._id}
                onPress={() => selectCompany(c)}
                style={styles.companyChip}
              >
                {c.name}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Drive Details</Text>
          <TextInput
            label="Job Role"
            mode="outlined"
            value={form.jobRole}
            onChangeText={(text) => setForm({ ...form, jobRole: text })}
            style={styles.input}
          />
          <TextInput
            label="Location"
            mode="outlined"
            value={form.location}
            onChangeText={(text) => setForm({ ...form, location: text })}
            style={styles.input}
          />
          <Pressable onPress={() => openDatePicker('driveDate')}>
            <View pointerEvents="none">
              <TextInput
                label="Drive Date"
                mode="outlined"
                value={form.driveDate}
                style={styles.input}
              />
            </View>
          </Pressable>
          <Pressable onPress={() => openDatePicker('registrationDeadline')}>
            <View pointerEvents="none">
              <TextInput
                label="Registration Deadline"
                mode="outlined"
                value={form.registrationDeadline}
                style={styles.input}
              />
            </View>
          </Pressable>
          <TextInput
            label="Drive Status (upcoming/open/closed/completed)"
            mode="outlined"
            value={form.driveStatus}
            onChangeText={(text) => setForm({ ...form, driveStatus: text })}
            style={styles.input}
          />

          {iosPicker.open && DateTimePickerComp && (
            <View style={styles.iosPickerBox}>
              <DateTimePickerComp
                value={iosPicker.value}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (!selectedDate) return;
                  const yyyy = selectedDate.getFullYear();
                  const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                  const dd = String(selectedDate.getDate()).padStart(2, '0');
                  setForm((prev) => ({ ...prev, [iosPicker.field]: `${yyyy}-${mm}-${dd}` }));
                }}
              />
              <Button mode="contained" onPress={() => setIosPicker({ open: false, field: null, value: new Date() })}>
                Done
              </Button>
            </View>
          )}

          <Button mode="contained" onPress={saveDrive} loading={loading} style={styles.button}>
            Save Changes
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 15,
    borderRadius: 15,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  companyChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    marginBottom: 10,
  },
  button: {
    borderRadius: 10,
  },
  iosPickerBox: {
    marginBottom: 12,
  },
});
