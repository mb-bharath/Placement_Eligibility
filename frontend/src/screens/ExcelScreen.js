import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, Linking } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { apiFetch, buildApiUrl, getAuthToken } from '../config/api';
import { demoCompanies } from '../data/demoData';

export default function ExcelScreen() {
  const [companies, setCompanies] = useState([]);
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

  const pickExcel = async () => {
    let DocumentPicker;
    try {
      DocumentPicker = require('expo-document-picker');
    } catch (e) {
      Alert.alert('Missing Dependency', 'Install expo-document-picker to select files.');
      return null;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: ['.xlsx', '.xls', '.csv'] });
    if (result.canceled) return null;
    const file = result.assets && result.assets[0];
    if (!file) return null;
    return {
      uri: file.uri,
      name: file.name || 'students.xlsx',
      type:
        file.mimeType ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  };

  const importStudents = async () => {
    const file = await pickExcel();
    if (!file) return;

    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    });

    setLoading(true);
    try {
      const { response, data } = await apiFetch('/excel/import-students', {
        method: 'POST',
        body: form,
      });
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Import failed');
      }
      Alert.alert('Success', data.message || 'Import complete');
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to import');
    } finally {
      setLoading(false);
    }
  };

  const openLink = async (path) => {
    const token = await getAuthToken();
    const url = token
      ? `${buildApiUrl(path)}${path.includes('?') ? '&' : '?'}token=${token}`
      : buildApiUrl(path);
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Download', `Open this in browser: ${url}`);
      return;
    }
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Excel</Text>
          <Text style={styles.subtitle}>Bulk import students and export lists</Text>

          <Button
            mode="outlined"
            style={styles.button}
            onPress={() => openLink('/excel/template')}
          >
            Download Template
          </Button>
          <Button
            mode="contained"
            style={styles.button}
            onPress={importStudents}
            loading={loading}
          >
            Import Students
          </Button>
          <Button
            mode="outlined"
            style={styles.button}
            onPress={() => openLink('/excel/export-students')}
          >
            Export All Students
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Export Eligible Students</Text>
          {companies.map((c) => (
            <View key={c._id} style={styles.companyRow}>
              <Text style={styles.companyName}>{c.name}</Text>
              <Button
                mode="text"
                onPress={() => openLink(`/excel/export-eligible/${c._id}`)}
              >
                Export
              </Button>
            </View>
          ))}
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
  button: {
    marginBottom: 10,
    borderRadius: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  companyName: {
    color: '#333',
    fontWeight: 'bold',
  },
});

