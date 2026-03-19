import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, Linking } from 'react-native';
import { Card, Button, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch, API_BASE_URL } from '../config/api';

export default function StudentDocumentsScreen({ navigation }) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [resumeDocs, setResumeDocs] = useState([]);
  const [companyById, setCompanyById] = useState({});
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

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
    setLoading(true);
    try {
      const [docs, companies] = await Promise.all([apiFetch('/documents/my-docs'), apiFetch('/companies')]);

      if (!docs.response.ok || !docs.data?.success) {
        throw new Error(docs.data?.message || 'Failed to load documents');
      }

      const companiesList = companies.response.ok && companies.data?.success ? companies.data.companies || [] : [];
      const mapping = {};
      companiesList.forEach((c) => {
        if (c && c._id) mapping[c._id] = c;
      });

      const resumes = (docs.data.documents || []).filter((d) => d.documentType === 'resume');
      resumes.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));

      setCompanyById(mapping);
      setResumeDocs(resumes);
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to load documents');
      setResumeDocs([]);
      setCompanyById({});
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const openDoc = async (fileUrl) => {
    const url = normalizeFileUrl(fileUrl);
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Resume', 'Unable to open resume URL');
      return;
    }
    Linking.openURL(url);
  };

  const deleteResume = async ({ docId, companyId }) => {
    Alert.alert('Delete Resume', 'Delete the old resume for this company?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const path = docId ? `/documents/${docId}` : `/documents/resume/${companyId}`;
            const { response, data } = await apiFetch(path, { method: 'DELETE' });
            if (!response.ok || !data?.success) {
              throw new Error(data?.message || 'Failed to delete resume');
            }
            await load();
          } catch (err) {
            Alert.alert('Error', err.message || 'Unable to delete resume');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>My Resumes</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            {loading ? 'Loading…' : `Total: ${resumeDocs.length}`}
          </Text>
          {resumeDocs.length === 0 && !loading && (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                No resumes uploaded yet.
              </Text>
              <Button mode="contained" onPress={() => navigation.navigate('ResumeUpload')} style={styles.button}>
                Upload Resume
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      {resumeDocs.map((d) => {
        const company = d.companyId ? companyById[d.companyId] : null;
        const when = d.updatedAt || d.createdAt || '';
        const uploadedText = formatUploadedText(when, nowMs);
        return (
          <Card key={d._id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.docTitle, { color: theme.colors.onSurface }]}>
                {company?.name ? company.name : `Company: ${d.companyId || 'N/A'}`}
              </Text>
              <Text style={[styles.docMeta, { color: theme.colors.onSurfaceVariant }]}>
                {uploadedText}
              </Text>
              <View style={styles.row}>
                <Button mode="outlined" onPress={() => openDoc(d.fileUrl)} style={styles.buttonHalf}>
                  Open
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => deleteResume({ docId: d._id, companyId: d.companyId })}
                  style={[styles.buttonHalf, styles.deleteButton]}
                  textColor={theme.colors.error}
                >
                  Delete
                </Button>
              </View>
            </Card.Content>
          </Card>
        );
      })}

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
    borderRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
  },
  emptyBox: {
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    marginBottom: 10,
  },
  docTitle: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  docMeta: {
    marginTop: 6,
    fontSize: 12,
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    marginTop: 10,
  },
  buttonHalf: {
    flex: 1,
    borderRadius: 8,
  },
  deleteButton: {
    marginLeft: 10,
  },
});

const formatUploadedText = (iso, now) => {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return 'Uploaded: N/A';

  const local = date.toLocaleString();
  const rel = formatRelativeTime(date.getTime(), now);
  return rel ? `Uploaded: ${local} (${rel})` : `Uploaded: ${local}`;
};

const formatRelativeTime = (timeMs, nowMs) => {
  const diffMs = nowMs - timeMs;
  const isFuture = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const minutes = Math.floor(absMs / 60000);
  const hours = Math.floor(absMs / 3600000);
  const days = Math.floor(absMs / 86400000);

  if (minutes < 1) return isFuture ? 'in a moment' : 'just now';
  if (minutes < 60) return isFuture ? `in ${minutes} min` : `${minutes} min ago`;
  if (hours < 24) return isFuture ? `in ${hours} hr` : `${hours} hr ago`;
  return isFuture ? `in ${days} day` : `${days} day ago`;
};
