import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { Card, ActivityIndicator } from 'react-native-paper';
import { apiFetch } from '../config/api';

export default function AcademicDataScreen() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { response, data } = await apiFetch('/students/profile');
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load profile');
      }
      setProfile(data.student);
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to load profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Academic Data</Text>
          <Text style={styles.subtitle}>Overview of your academic performance</Text>

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
              <View style={styles.row}>
                <Text style={styles.label}>Department</Text>
                <Text style={styles.value}>{profile.department}</Text>
              </View>
            </>
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
