import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { Card, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { apiFetch } from '../config/api';
import { demoCompanies, eligibleStudentsForCompany } from '../data/demoData';

export default function EligibleStudentsScreen() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [students, setStudents] = useState([]);
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

  const loadEligibleStudents = async (companyId) => {
    setLoading(true);
    try {
      const { response, data } = await apiFetch(`/admin/eligible-students/${companyId}`);
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load eligible students');
      }
      setStudents(data.students || []);
    } catch (err) {
      const company = demoCompanies.find((c) => c.id === companyId || c._id === companyId);
      if (company) {
        setStudents(eligibleStudentsForCompany(company));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Eligible Students</Text>
          <Text style={styles.subtitle}>Select a company to view eligible students</Text>

          <View style={styles.chipRow}>
            {companies.map((c) => (
              <Chip
                key={c._id}
                selected={selectedCompany === c._id}
                onPress={() => {
                  setSelectedCompany(c._id);
                  loadEligibleStudents(c._id);
                }}
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
          <Text style={styles.sectionTitle}>Eligible List</Text>
          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator animating size="large" />
              <Text style={styles.loadingText}>Loading students...</Text>
            </View>
          )}
          {!loading && students.length === 0 && (
            <Text style={styles.placeholder}>No students found</Text>
          )}
          {students.map((s) => (
            <View key={s._id} style={styles.studentRow}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{s.name}</Text>
                <Text style={styles.studentMeta}>
                  {s.registerNumber} • {s.department} • CGPA {s.cgpa}
                </Text>
              </View>
              <Button mode="text">View</Button>
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
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 13,
  },
  placeholder: {
    color: '#888',
    fontSize: 12,
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  studentInfo: {
    flex: 1,
    marginRight: 10,
  },
  studentName: {
    fontWeight: 'bold',
    color: '#333',
  },
  studentMeta: {
    fontSize: 12,
    color: '#666',
  },
});
