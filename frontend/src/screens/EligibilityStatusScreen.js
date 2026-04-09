import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { Card, Button, ActivityIndicator } from 'react-native-paper';
import { apiFetch } from '../config/api';

export default function EligibilityStatusScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEligibility();
  }, []);

  const loadEligibility = async () => {
    setLoading(true);
    try {
      const { response, data } = await apiFetch('/students/eligibility');
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load eligibility');
      }
      setSummary(data.summary);
      setProfile(data.studentProfile);
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to load eligibility');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Eligibility Status</Text>
          <Text style={styles.subtitle}>Criteria checked against company rules</Text>

          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator animating size="large" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}

          {!loading && profile && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>CGPA</Text>
                <Text style={styles.value}>{profile.cgpa}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>10th %</Text>
                <Text style={styles.value}>{profile.tenthPercentage}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>12th %</Text>
                <Text style={styles.value}>{profile.twelfthPercentage}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Arrears</Text>
                <Text style={styles.value}>{profile.backlogs}</Text>
              </View>
            </>
          )}

          <Card style={styles.statusCard}>
            <Card.Content>
              <Text style={styles.statusTitle}>Overall Status</Text>
              <Text style={styles.statusValue}>
                {summary ? `${summary.eligible} Eligible` : '--'}
              </Text>
              <Text style={styles.statusNote}>
                {summary
                  ? `Out of ${summary.total} companies, ${summary.eligible} are eligible.`
                  : 'Complete your profile to check eligibility.'}
              </Text>
            </Card.Content>
          </Card>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={() => navigation.navigate('EligibilityResult', { eligibleOnly: true })}
        style={styles.button}
      >
        View Eligible Companies
      </Button>

      <Button
        mode="outlined"
        onPress={() => navigation.navigate('EligibilityResult', { notEligibleOnly: true })}
        style={[styles.button, { marginTop: 8 }]}
      >
        View Not Eligible Companies
      </Button>
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    color: '#666',
    fontSize: 14,
  },
  value: {
    color: '#333',
    fontWeight: 'bold',
  },
  statusCard: {
    marginTop: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
  },
  statusTitle: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginTop: 4,
  },
  statusNote: {
    fontSize: 12,
    color: '#2e7d32',
    marginTop: 6,
  },
  button: {
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 10,
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
