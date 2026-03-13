import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { Card, ActivityIndicator } from 'react-native-paper';
import { apiFetch } from '../config/api';
import { demoAppStats, demoAdminStats, demoDeptStats } from '../data/demoData';

export default function PlacementStatsScreen() {
  const [stats, setStats] = useState(null);
  const [deptStats, setDeptStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { response, data } = await apiFetch('/applications/stats');
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load stats');
      }
      setStats(data.stats);
      setDeptStats(data.deptStats || []);
    } catch (err) {
      setStats({
        totalStudents: demoAdminStats.totalStudents,
        totalCompanies: demoAdminStats.totalCompanies,
        totalApplications: demoAppStats.totalApplications,
        shortlisted: demoAppStats.shortlisted,
        selected: demoAppStats.selected,
        totalPlaced: demoAppStats.totalPlaced,
        placementRate: ((demoAppStats.totalPlaced / demoAdminStats.totalStudents) * 100).toFixed(1),
      });
      setDeptStats(demoDeptStats);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Placement Statistics</Text>
          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator animating size="large" />
              <Text style={styles.loadingText}>Loading stats...</Text>
            </View>
          )}
          {!loading && stats && (
            <View>
              <Text style={styles.row}>Total Students: {stats.totalStudents}</Text>
              <Text style={styles.row}>Total Companies: {stats.totalCompanies}</Text>
              <Text style={styles.row}>Total Applications: {stats.totalApplications}</Text>
              <Text style={styles.row}>Shortlisted: {stats.shortlisted}</Text>
              <Text style={styles.row}>Selected: {stats.selected}</Text>
              <Text style={styles.row}>Placed Students: {stats.totalPlaced}</Text>
              <Text style={styles.row}>Placement Rate: {stats.placementRate}%</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Department Breakdown</Text>
          {deptStats.length === 0 && !loading && (
            <Text style={styles.placeholder}>No department stats available</Text>
          )}
          {deptStats.map((d) => (
            <View key={d._id} style={styles.deptRow}>
              <Text style={styles.deptName}>{d._id || 'N/A'}</Text>
              <Text style={styles.deptMeta}>
                Total {d.total} • Placed {d.placed} • Avg CGPA {d.avgCGPA?.toFixed ? d.avgCGPA.toFixed(2) : d.avgCGPA}
              </Text>
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
    marginBottom: 10,
  },
  row: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  placeholder: {
    color: '#888',
    fontSize: 12,
  },
  deptRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deptName: {
    fontWeight: 'bold',
    color: '#333',
  },
  deptMeta: {
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
