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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiFetch } from '../config/api';
import {
  demoStudent,
  demoCompanies,
  computeEligibility,
} from '../data/demoData';

const DEPT_ALIAS_MAP = {
  CSE: 'Computer Science & Engineering',
  ECE: 'Electronics & Communication Engineering',
  MECH: 'Mechanical Engineering',
  EEE: 'Electrical & Electronics Engineering',
  CIVIL: 'Civil Engineering',
  IT: 'Information Technology',
  'AI&DS': 'Artificial Intelligence and Data Science',
};

export default function EligibilityResultScreen({ route }) {
  const eligibleOnly = route?.params?.eligibleOnly || false;
  const notEligibleOnly = route?.params?.notEligibleOnly || false;
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

      const eligibilityResults = (data.results || []).map((r) => mapResult(r, data.studentProfile));
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
      setResults(demoResults.map((r) => mapResult(r, demoStudent)));
    }
  };

  const mapResult = (r, profile) => {
    const company = r.company || r;
    const eligibleDepartments = Array.isArray(company.eligibleDepartments)
      ? company.eligibleDepartments.map((d) => DEPT_ALIAS_MAP[d] || d)
      : [];
    const normalizedCompany = { ...company, eligibleDepartments };
    const derivedReasons = deriveReasons(r.reasons || [], normalizedCompany, profile || user);
    return {
      company: normalizedCompany,
      isEligible: r.isEligible,
      reasons: derivedReasons,
      passedChecks: r.passedChecks || {},
    };
  };

  const deriveReasons = (reasonsFromApi, company, profile) => {
    const reasons = [...(reasonsFromApi || [])];
    if (!profile || reasons.length > 0) return reasons;
    if (profile.cgpa < company.minCGPA) reasons.push('Low CGPA');
    if ((profile.backlogs || 0) > (company.maxBacklogs || 0)) reasons.push('Backlogs exceed limit');
    if (
      Array.isArray(company.eligibleDepartments) &&
      !company.eligibleDepartments.includes(profile.department)
    ) {
      reasons.push('Not eligible department');
    }
    return reasons.length ? reasons : ['Not eligible'];
  };

  const filteredResults = results.filter((r) => {
    if (eligibleOnly) return r.isEligible;
    if (notEligibleOnly) return !r.isEligible;
    return true;
  });

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
        <Text style={styles.resultsTitle}>
          {eligibleOnly
            ? 'Eligible Companies'
            : notEligibleOnly
              ? 'Not Eligible Companies'
              : 'Eligibility Results'}
        </Text>
      </View>

      {filteredResults.length === 0 && (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons
            name={
              eligibleOnly
                ? 'check-circle-outline'
                : notEligibleOnly
                  ? 'close-circle-outline'
                  : 'playlist-remove'
            }
            size={40}
            color="#888"
          />
          <Text style={styles.emptyText}>
            {eligibleOnly
              ? 'No eligible companies yet.'
              : notEligibleOnly
                ? 'No not-eligible companies.'
                : 'No results to show.'}
          </Text>
        </View>
      )}

      {filteredResults.map((result, index) => (
        <Card
          key={index}
          style={[
            styles.card,
            result.isEligible ? styles.eligibleCard : styles.notEligibleCard,
          ]}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.companyName}>{result.company.name}</Text>
                <Text style={styles.packageText}>
                  {result.company.jobRole || 'Role'} | {result.company.package}
                </Text>
                <Text style={styles.deptLine}>
                  {(result.company.eligibleDepartments || []).join(', ')}
                </Text>
              </View>
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

            {!result.isEligible && result.reasons.length > 0 && (
              <View style={styles.reasonsContainer}>
                {result.reasons.map((reason, idx) => (
                  <Text key={idx} style={styles.reasonText}>
                    {reason}
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
  deptLine: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
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
    color: '#d32f2f',
    marginBottom: 2,
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
