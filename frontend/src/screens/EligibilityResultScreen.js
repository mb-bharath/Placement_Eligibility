import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { Card, Chip } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../config/api';
import {
  demoStudent,
  demoCompanies,
  computeEligibility,
} from '../data/demoData';

export default function EligibilityResultScreen() {
  const [user, setUser] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));

      const { response, data } = await apiFetch('/students/eligibility');
      if (!response.ok || !data.success) {
        Alert.alert('Error', data.message || 'Unable to check eligibility');
        return;
      }

      const eligibilityResults = (data.results || []).map((r) => ({
        company: r.company,
        isEligible: r.isEligible,
        reasons: r.reasons || [],
        passedChecks: r.passedChecks || {},
      }));

      setResults(eligibilityResults);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      const demoResults = demoCompanies.map((c) => ({
        company: c,
        isEligible: computeEligibility(demoStudent, c),
        reasons: [],
        passedChecks: {},
      }));
      setUser(demoStudent);
      setResults(demoResults);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {user && (
        <View style={styles.profileCard}>
          <Text style={styles.profileTitle}>Your Profile</Text>
          <Text style={styles.profileText}>CGPA: {user.cgpa}</Text>
          <Text style={styles.profileText}>Backlogs: {user.backlogs}</Text>
          <Text style={styles.profileText}>Department: {user.department}</Text>
        </View>
      )}

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>Eligibility Results</Text>
      </View>

      {results.map((result, index) => (
        <Card
          key={index}
          style={[
            styles.card,
            result.isEligible ? styles.eligibleCard : styles.notEligibleCard,
          ]}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.companyName}>{result.company.name}</Text>
              <Chip
                style={
                  result.isEligible
                    ? styles.eligibleChip
                    : styles.notEligibleChip
                }
                textStyle={styles.chipText}
              >
                {result.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
              </Chip>
            </View>

            <View style={styles.packageContainer}>
              <Text style={styles.packageText}>Package: {result.company.package}</Text>
            </View>

            {!result.isEligible && result.reasons.length > 0 && (
              <View style={styles.reasonsContainer}>
                <Text style={styles.reasonsTitle}>Reasons:</Text>
                {result.reasons.map((reason, idx) => (
                  <Text key={idx} style={styles.reasonText}>
                    • {reason}
                  </Text>
                ))}
              </View>
            )}

            {result.isEligible && user && (
              <View style={styles.criteriaContainer}>
                <Text style={styles.criteriaText}>
                  ✓ CGPA: {user.cgpa} ≥ {result.company.minCGPA}
                </Text>
                <Text style={styles.criteriaText}>
                  ✓ Backlogs: {user.backlogs} ≤ {result.company.maxBacklogs}
                </Text>
                <Text style={styles.criteriaText}>
                  ✓ Department: {user.department}
                </Text>
              </View>
            )}
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
  profileCard: {
    backgroundColor: '#6200ee',
    padding: 20,
    marginBottom: 10,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  profileText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
  },
  resultsHeader: {
    padding: 15,
    backgroundColor: '#fff',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    margin: 10,
    borderRadius: 15,
    elevation: 3,
    borderLeftWidth: 5,
  },
  eligibleCard: {
    borderLeftColor: '#4caf50',
    backgroundColor: '#f1f8f4',
  },
  notEligibleCard: {
    borderLeftColor: '#f44336',
    backgroundColor: '#fef5f5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  eligibleChip: {
    backgroundColor: '#4caf50',
  },
  notEligibleChip: {
    backgroundColor: '#f44336',
  },
  chipText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  packageContainer: {
    marginBottom: 10,
  },
  packageText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  reasonsContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  reasonsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 5,
  },
  reasonText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
  },
  criteriaContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  criteriaText: {
    fontSize: 13,
    color: '#4caf50',
    marginBottom: 3,
  },
});
