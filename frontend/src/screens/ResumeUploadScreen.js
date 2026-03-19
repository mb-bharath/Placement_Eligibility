import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { Card, Button, ActivityIndicator } from 'react-native-paper';
import { apiFetch } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { demoCompanies, demoStudent, computeEligibility } from '../data/demoData';
import { useFocusEffect } from '@react-navigation/native';

export default function ResumeUploadScreen({ navigation, route }) {
  const targetCompanyId = route?.params?.companyId || null;
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resumeCompanyIds, setResumeCompanyIds] = useState(new Set());

  useEffect(() => {
    loadCompanies();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCompanies();
    }, [])
  );

  const loadCompanies = async () => {
    try {
      const [eligible, docs] = await Promise.all([
        apiFetch('/students/eligible-companies'),
        apiFetch('/documents/my-docs'),
      ]);

      if (!eligible.response.ok || !eligible.data.success) {
        throw new Error(eligible.data.message || 'Failed to load companies');
      }
      setCompanies(eligible.data.companies || []);

      if (docs.response.ok && docs.data?.success) {
        const resumeDocs = (docs.data.documents || []).filter((d) => d.documentType === 'resume');
        setResumeCompanyIds(new Set(resumeDocs.map((d) => d.companyId).filter(Boolean)));
      } else {
        setResumeCompanyIds(new Set());
      }
    } catch (err) {
      // Offline fallback: only show eligible companies
      const eligible = demoCompanies.filter((c) => computeEligibility(demoStudent, c));
      setCompanies(eligible);
      setResumeCompanyIds(new Set());
    }
  };

  const pickPdf = async () => {
    let DocumentPicker;
    try {
      DocumentPicker = require('expo-document-picker');
    } catch (e) {
      Alert.alert('Missing Dependency', 'Install expo-document-picker to select files.');
      return null;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled) return null;
    const file = result.assets && result.assets[0];
    if (!file) return null;
    return {
      uri: file.uri,
      name: file.name || 'resume.pdf',
      type: file.mimeType || 'application/pdf',
    };
  };

  const applyToCompany = async (companyId) => {
    if (resumeCompanyIds.has(companyId)) {
      Alert.alert(
        'Already Uploaded',
        'Resume already uploaded for this company. Delete the old resume to upload a new one.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Manage Resumes', onPress: () => navigation.navigate('StudentDocuments') },
        ]
      );
      return;
    }

    const file = await pickPdf();
    if (!file) return;

    const form = new FormData();
    form.append('document', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    });

    setLoading(true);
    try {
      const { response, data } = await apiFetch(`/applications/apply/${companyId}`, {
        method: 'POST',
        body: form,
      });

      if (!response.ok || !data.success) {
        const message = data.message || 'Application failed';
        if (response.status === 409) {
          Alert.alert(
            'Resume Already Uploaded',
            message,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Manage Resumes', onPress: () => navigation.navigate('StudentDocuments') },
            ]
          );
          return;
        }
        if (data.resumeScore !== undefined) {
          Alert.alert('Resume Too Weak', `${message}\nScore: ${data.resumeScore}/100`);
          return;
        }
        throw new Error(message);
      }

      Alert.alert('Success', 'Application submitted successfully');
    } catch (err) {
      // Offline demo fallback: store resume locally
      try {
        await AsyncStorage.setItem('demo_resume_url', file.uri);
      } catch (e) {}
      Alert.alert('Saved Locally', 'Application saved locally (demo mode).');
    } finally {
      setLoading(false);
    }
  };

  const visibleCompanies = useMemo(() => {
    if (!targetCompanyId) return companies;
    return companies.filter((c) => c && c._id === targetCompanyId);
  }, [companies, targetCompanyId]);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Resume Upload</Text>
          <Text style={styles.subtitle}>
            {targetCompanyId ? 'Upload your resume for the selected company' : 'Upload your resume for a specific company'}
          </Text>

          <View style={styles.ruleBox}>
            <Text style={styles.ruleTitle}>Rules</Text>
            <Text style={styles.ruleItem}>PDF only</Text>
            <Text style={styles.ruleItem}>Max size 5 MB</Text>
            <Text style={styles.ruleItem}>One resume per company</Text>
          </View>

          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator animating size="large" />
              <Text style={styles.loadingText}>Uploading...</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Apply to Company</Text>
          {visibleCompanies.map((c) => (
            <View key={c._id} style={styles.companyRow}>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{c.name}</Text>
                <Text style={styles.companyMeta}>
                  {c.package} {resumeCompanyIds.has(c._id) ? '• Resume Uploaded' : ''}
                </Text>
              </View>
              {resumeCompanyIds.has(c._id) ? (
                <Button mode="outlined" onPress={() => navigation.navigate('StudentDocuments')}>
                  Manage
                </Button>
              ) : (
                <Button mode="contained" onPress={() => applyToCompany(c._id)}>
                  Upload
                </Button>
              )}
            </View>
          ))}
          {visibleCompanies.length === 0 && (
            <Text style={styles.placeholderText}>No companies available</Text>
          )}
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
    marginBottom: 15,
  },
  ruleBox: {
    backgroundColor: '#f1f8e9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  ruleTitle: {
    fontWeight: 'bold',
    color: '#33691e',
    marginBottom: 6,
  },
  ruleItem: {
    color: '#33691e',
    fontSize: 12,
    marginBottom: 3,
  },
  placeholder: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    color: '#888',
    fontSize: 13,
  },
  button: {
    marginTop: 8,
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
  companyInfo: {
    flex: 1,
    marginRight: 10,
  },
  companyName: {
    fontWeight: 'bold',
    color: '#333',
  },
  companyMeta: {
    fontSize: 12,
    color: '#666',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 13,
  },
});
