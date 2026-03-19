import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, Linking } from 'react-native';
import { Card, Button, Chip, ActivityIndicator, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch, API_BASE_URL } from '../config/api';

export default function AdminStudentDetailsScreen({ route, navigation }) {
  const theme = useTheme();
  const studentId = route?.params?.studentId;
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [companyById, setCompanyById] = useState({});

  const getBaseOrigin = () => {
    const base = API_BASE_URL || '';
    return base.endsWith('/api') ? base.slice(0, -4) : base;
  };

  const normalizeFileUrl = (url) => {
    if (!url) return url;
    const baseOrigin = getBaseOrigin();
    if (url.startsWith('/')) return `${baseOrigin}${url}`;
    if (url.includes('localhost:5000')) return url.replace('http://localhost:5000', baseOrigin);
    if (url.includes('127.0.0.1:5000')) return url.replace('http://127.0.0.1:5000', baseOrigin);
    return url;
  };

  const load = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const [details, companies] = await Promise.all([
        apiFetch(`/admin/student/${studentId}`),
        apiFetch('/companies'),
      ]);

      if (!details.response.ok || !details.data?.success) {
        throw new Error(details.data?.message || 'Failed to load student');
      }

      const companiesList = companies.response.ok && companies.data?.success ? companies.data.companies || [] : [];
      const mapping = {};
      companiesList.forEach((c) => {
        if (c && c._id) mapping[c._id] = c;
      });

      setCompanyById(mapping);
      setStudent(details.data.student || null);
      setUser(details.data.user || null);
      setDocuments(details.data.documents || []);
      setApplications(details.data.applications || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to load student details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [studentId])
  );

  const resumeDocs = useMemo(() => documents.filter((d) => d.documentType === 'resume'), [documents]);

  const openDoc = async (fileUrl) => {
    const url = normalizeFileUrl(fileUrl);
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Document', 'Unable to open document URL');
      return;
    }
    Linking.openURL(url);
  };

  const fmt = (iso) => {
    const date = new Date(iso);
    if (!iso || Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Student Details</Text>
          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator animating />
              <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading…</Text>
            </View>
          )}

          {student && (
            <>
              <Text style={[styles.name, { color: theme.colors.onSurface }]}>{student.name}</Text>
              <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
                {student.registerNumber} • {student.department} • CGPA {student.cgpa}
              </Text>
              {user?.email ? (
                <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>{user.email}</Text>
              ) : null}

              <View style={styles.chipsRow}>
                <Chip style={styles.chip}>Backlogs: {student.backlogs}</Chip>
                <Chip style={styles.chip}>10th: {student.tenthPercentage ?? 0}%</Chip>
                <Chip style={styles.chip}>12th: {student.twelfthPercentage ?? 0}%</Chip>
              </View>

              <Text style={[styles.small, { color: theme.colors.onSurfaceVariant }]}>
                Phone: {student.phone || '-'} • Batch: {student.batch || '-'}
              </Text>
            </>
          )}
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Uploaded Documents ({documents.length})
          </Text>
          {documents.length === 0 && (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>No documents uploaded.</Text>
          )}
          {documents.map((d) => {
            const company = d.companyId ? companyById[d.companyId] : null;
            return (
              <View key={d._id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemTitle, { color: theme.colors.onSurface }]}>
                    {d.documentType?.toUpperCase() || 'DOCUMENT'}
                  </Text>
                  <Text style={[styles.itemMeta, { color: theme.colors.onSurfaceVariant }]}>
                    {company?.name ? company.name : `Company: ${d.companyId || 'N/A'}`}
                  </Text>
                  <Text style={[styles.itemMeta, { color: theme.colors.onSurfaceVariant }]}>
                    Uploaded: {fmt(d.updatedAt || d.createdAt)}
                  </Text>
                </View>
                <Button mode="outlined" onPress={() => openDoc(d.fileUrl)}>
                  Open
                </Button>
              </View>
            );
          })}
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Applications ({applications.length})
          </Text>
          {applications.length === 0 && (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>No applications found.</Text>
          )}
          {applications.map((a) => {
            const company = a.companyId ? companyById[a.companyId] : null;
            return (
              <View key={a._id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemTitle, { color: theme.colors.onSurface }]}>
                    {company?.name || `Company: ${a.companyId || 'N/A'}`}
                  </Text>
                  <Text style={[styles.itemMeta, { color: theme.colors.onSurfaceVariant }]}>
                    Status: {a.status} • Applied: {fmt(a.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card.Content>
      </Card>

      {resumeDocs.length > 0 ? <View style={{ height: 10 }} /> : null}
      <View style={{ height: 20 }} />
    </ScrollView>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  name: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
  },
  small: {
    marginTop: 10,
    fontSize: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#e3f2fd',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontWeight: 'bold',
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 12,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
  },
});

