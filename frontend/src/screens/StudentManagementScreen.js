import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { Card, TextInput, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { apiFetch } from '../config/api';
import { demoStudents } from '../data/demoData';

export default function StudentManagementScreen() {
  const [filters, setFilters] = useState({
    department: '',
    minCGPA: '',
    search: '',
  });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.department) params.append('department', filters.department);
      if (filters.minCGPA) params.append('minCGPA', filters.minCGPA);
      if (filters.search) params.append('search', filters.search);

      const path = params.toString()
        ? `/admin/students?${params.toString()}`
        : '/admin/students';

      const { response, data } = await apiFetch(path);
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load students');
      }
      setStudents(data.students || []);
    } catch (err) {
      setStudents(demoStudents);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Student Data Management</Text>
          <Text style={styles.subtitle}>Filter and view student academic data</Text>

          <TextInput
            label="Department"
            mode="outlined"
            style={styles.input}
            placeholder="CSE"
            value={filters.department}
            onChangeText={(text) => setFilters({ ...filters, department: text })}
          />
          <TextInput
            label="Min CGPA"
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            value={filters.minCGPA}
            onChangeText={(text) => setFilters({ ...filters, minCGPA: text })}
          />
          <TextInput
            label="Search (name/reg/email)"
            mode="outlined"
            style={styles.input}
            value={filters.search}
            onChangeText={(text) => setFilters({ ...filters, search: text })}
          />

          <Button mode="contained" style={styles.button} onPress={loadStudents}>
            Apply Filter
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Students List</Text>
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
                <Text style={styles.studentName}>{s.name || 'Unnamed Student'}</Text>
                <Text style={styles.studentMeta}>{s.registerNumber} • {s.department || '-'}</Text>
              </View>
              <Chip style={styles.cgpaChip}>{s.cgpa ?? '-'}</Chip>
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
    marginBottom: 15,
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 5,
    borderRadius: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  placeholder: {
    color: '#888',
    fontSize: 12,
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
  cgpaChip: {
    backgroundColor: '#e3f2fd',
  },
});
