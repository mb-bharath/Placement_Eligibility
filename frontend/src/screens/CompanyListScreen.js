import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { Card, Chip, ActivityIndicator } from 'react-native-paper';
import { apiFetch } from '../config/api';
import { useFocusEffect } from '@react-navigation/native';
import { demoCompanies } from '../data/demoData';

export default function CompanyListScreen() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCompanies();
    }, [])
  );

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { response, data } = await apiFetch('/companies');
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load companies');
      }
      setCompanies(data.companies || []);
    } catch (err) {
      setCompanies(demoCompanies);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {companies.length} Companies Hiring
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator animating size="large" />
          <Text style={styles.loadingText}>Loading companies...</Text>
        </View>
      )}

      {companies.map((company) => (
        <Card key={company._id || company.id} style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.companyName}>{company.name}</Text>
              <Chip style={styles.chip}>{company.package}</Chip>
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

              <View style={styles.departmentContainer}>
                <Text style={styles.criteriaLabel}>Departments:</Text>
                <View style={styles.departmentChips}>
                  {company.eligibleDepartments.map((dept, index) => (
                    <Chip key={index} style={styles.deptChip} textStyle={styles.deptChipText}>
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
  card: {
    margin: 10,
    borderRadius: 15,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  chip: {
    backgroundColor: '#6200ee',
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
  departmentContainer: {
    marginTop: 8,
  },
  departmentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  deptChip: {
    marginRight: 5,
    marginBottom: 5,
    backgroundColor: '#e3f2fd',
  },
  deptChipText: {
    fontSize: 11,
  },
  description: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
});
