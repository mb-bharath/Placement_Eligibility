import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { Card, Chip, ActivityIndicator, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../config/api';

export default function CompanyDetailsScreen({ route }) {
  const theme = useTheme();
  const companyId = route?.params?.companyId;
  const initialCompany = route?.params?.company || null;
  const [company, setCompany] = useState(initialCompany);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { response, data } = await apiFetch('/companies');
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to load company');
      }
      const found = (data.companies || []).find((c) => c._id === companyId);
      if (!found) throw new Error('Company not found');
      setCompany(found);
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to load company');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [companyId])
  );

  const driveDate = useMemo(() => (company?.driveDate ? String(company.driveDate).slice(0, 10) : 'N/A'), [company]);
  const deadline = useMemo(
    () => (company?.registrationDeadline ? String(company.registrationDeadline).slice(0, 10) : 'N/A'),
    [company]
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              {company?.name || 'Company'}
            </Text>
            {company?.package ? <Chip style={styles.packageChip}>{company.package}</Chip> : null}
          </View>

          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator animating />
              <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
                Loading…
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Drive Details</Text>
            <Row label="Job Role" value={company?.jobRole || 'N/A'} />
            <Row label="Location" value={company?.location || 'N/A'} />
            <Row label="Drive Date" value={driveDate} />
            <Row label="Registration Deadline" value={deadline} />
            <Row label="Drive Status" value={company?.driveStatus || 'N/A'} />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Eligibility</Text>
            <Row label="Min CGPA" value={company?.minCGPA ?? 'N/A'} />
            <Row label="Max Backlogs" value={company?.maxBacklogs ?? 'N/A'} />
            {company?.tenthPercentageMin != null ? (
              <Row label="10th %" value={company.tenthPercentageMin} />
            ) : null}
            {company?.twelfthPercentageMin != null ? (
              <Row label="12th %" value={company.twelfthPercentageMin} />
            ) : null}

            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant, marginTop: 8 }]}>
              Eligible Departments
            </Text>
            <View style={styles.deptRow}>
              {(company?.eligibleDepartments || []).map((d) => (
                <Chip key={d} style={styles.deptChip}>
                  {d}
                </Chip>
              ))}
              {(company?.eligibleDepartments || []).length === 0 ? (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>N/A</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Description</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {company?.description || 'No description available.'}
            </Text>
          </View>
        </Card.Content>
      </Card>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function Row({ label, value }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}:</Text>
      <Text style={[styles.value, { color: theme.colors.onSurface }]}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 15,
    borderRadius: 14,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  packageChip: {
    backgroundColor: '#6200ee',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
  },
  deptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  deptChip: {
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#e3f2fd',
  },
});

