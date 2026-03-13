import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Card, Button, Avatar, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_BASE_URL } from '../config/api';
import { useFocusEffect } from '@react-navigation/native';
import {
  demoStudent,
  demoDashboardCounts,
  demoResumeUrl,
  eligibleCompaniesForStudent,
} from '../data/demoData';

export default function StudentHomeScreen({ navigation }) {
  const theme = useTheme();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    eligible: 0,
    notEligible: 0,
    applied: 0,
    shortlisted: 0,
  });
  const [documents, setDocuments] = useState({
    total: 0,
    resumeUploaded: false,
    resumeUrl: null,
  });
  const [eligibleCompanies, setEligibleCompanies] = useState([]);

  useEffect(() => {
    loadUserData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));

      const [dash, docs, eligible] = await Promise.all([
        apiFetch('/students/dashboard'),
        apiFetch('/documents/my-docs'),
        apiFetch('/students/eligible-companies'),
      ]);

      if (!dash.response.ok || !dash.data.success) {
        throw new Error(dash.data.message || 'Failed to load dashboard');
      }

      setStats({
        total: dash.data.dashboard.totalCompanies,
        eligible: dash.data.dashboard.eligible,
        notEligible: dash.data.dashboard.notEligible,
        applied: dash.data.dashboard.applied,
        shortlisted: dash.data.dashboard.shortlisted,
      });

      if (docs.response.ok && docs.data && docs.data.success) {
        const hasResume = (docs.data.documents || []).some(
          (d) => d.documentType === 'resume'
        );
        const resumeDoc = (docs.data.documents || []).find(
          (d) => d.documentType === 'resume'
        );
        setDocuments({
          total: docs.data.count || 0,
          resumeUploaded: hasResume,
          resumeUrl: resumeDoc ? resumeDoc.fileUrl : null,
        });
      }

      if (eligible.response.ok && eligible.data && eligible.data.success) {
        setEligibleCompanies(eligible.data.companies || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Offline fallback demo data
      setStats({
        total: demoDashboardCounts.total,
        eligible: demoDashboardCounts.eligible,
        notEligible: demoDashboardCounts.notEligible,
        applied: demoDashboardCounts.applied,
        shortlisted: demoDashboardCounts.shortlisted,
      });

      setEligibleCompanies(eligibleCompaniesForStudent(demoStudent));

      const storedResumeUrl = await AsyncStorage.getItem('demo_resume_url');
      setDocuments({
        total: storedResumeUrl ? 1 : 0,
        resumeUploaded: !!storedResumeUrl,
        resumeUrl: storedResumeUrl || demoResumeUrl,
      });
    }
  };

  const getBaseOrigin = () => {
    const base = API_BASE_URL || '';
    return base.endsWith('/api') ? base.slice(0, -4) : base;
  };

  const normalizeFileUrl = (url) => {
    if (!url) return url;
    const baseOrigin = getBaseOrigin();
    if (url.includes('localhost:5000')) {
      return url.replace('http://localhost:5000', baseOrigin);
    }
    if (url.includes('127.0.0.1:5000')) {
      return url.replace('http://127.0.0.1:5000', baseOrigin);
    }
    return url;
  };

  const openResume = async () => {
    if (!documents.resumeUrl) {
      navigation.navigate('ResumeUpload');
      return;
    }
    const url = normalizeFileUrl(documents.resumeUrl);
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Resume', 'Unable to open resume URL');
      return;
    }
    Linking.openURL(url);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await AsyncStorage.multiRemove(['user', 'token']);
            setUser(null);
            navigation.reset({
              index: 0,
              routes: [{ name: 'RoleSelect' }],
            });
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.onSurface }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.containerContent}
    >
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Avatar.Text 
          size={80} 
          label={user.name ? user.name.substring(0, 2).toUpperCase() : 'ST'} 
          style={[styles.avatar, { backgroundColor: theme.colors.onPrimary }]}
        />
        <Text style={[styles.welcomeText, { color: theme.colors.onPrimary }]}>
          Welcome, {user.name}!
        </Text>
        <Text style={[styles.regText, { color: theme.colors.onPrimary }]}>
          {user.registerNumber}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.statNumber, { color: theme.colors.onSurface }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Total Companies
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={[
            styles.statCard,
            styles.eligibleStatCard,
            { backgroundColor: theme.colors.secondaryContainer },
          ]}
        >
          <Card.Content>
            <Text
              style={[
                styles.statNumber,
                { color: theme.colors.onSecondaryContainer },
              ]}
            >
              {stats.eligible}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSecondaryContainer }]}>
              Eligible
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={[
            styles.statCard,
            styles.notEligibleStatCard,
            { backgroundColor: theme.colors.errorContainer },
          ]}
        >
          <Card.Content>
            <Text
              style={[
                styles.statNumber,
                { color: theme.colors.onErrorContainer },
              ]}
            >
              {stats.notEligible}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onErrorContainer }]}>
              Not Eligible
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.statNumber, { color: theme.colors.onSurface }]}>{stats.applied}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Applied
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.statNumber, { color: theme.colors.onSurface }]}>{stats.shortlisted}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Shortlisted
            </Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={[styles.resumeCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.resumeTitle, { color: theme.colors.onSurface }]}>Documents</Text>
          <Text style={[styles.resumeText, { color: theme.colors.onSurfaceVariant }]}>
            Total Uploaded: {documents.total}
          </Text>
          <Text style={[styles.resumeText, { color: theme.colors.onSurfaceVariant }]}>
            Resume: {documents.resumeUploaded ? 'Uploaded' : 'Not Uploaded'}
          </Text>
          <Button
            mode="contained"
            onPress={openResume}
            style={styles.resumeButton}
          >
            {documents.resumeUploaded ? 'Open Resume' : 'Upload Resume'}
          </Button>
        </Card.Content>
      </Card>

      <Card style={[styles.eligibleCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.eligibleTitle, { color: theme.colors.onSurface }]}>
            Eligible Companies
          </Text>
          {eligibleCompanies.length === 0 && (
            <Text style={[styles.eligibleEmpty, { color: theme.colors.onSurfaceVariant }]}>
              No eligible companies
            </Text>
          )}
          {eligibleCompanies.map((c) => (
            <View
              key={c._id || c.id}
              style={[
                styles.eligibleRow,
                { borderBottomColor: theme.colors.outlineVariant },
              ]}
            >
              <View style={styles.eligibleInfo}>
                <Text style={[styles.eligibleName, { color: theme.colors.onSurface }]}>
                  {c.name}
                </Text>
                <Text style={[styles.eligibleMeta, { color: theme.colors.onSurfaceVariant }]}>
                  {c.jobRole || 'Role'} • {c.package || 'Package'}
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('ResumeUpload')}
                compact
              >
                Apply
              </Button>
            </View>
          ))}
        </Card.Content>
      </Card>

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('StudentProfile')}
        >
          <Avatar.Icon size={50} icon="account" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>My Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('CompanyList')}
        >
          <Avatar.Icon size={50} icon="office-building" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Companies</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('EligibilityResult')}
        >
          <Avatar.Icon size={50} icon="clipboard-check" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Check Eligibility</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('EligibilityStatus')}
        >
          <Avatar.Icon size={50} icon="shield-check" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Eligibility Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ResumeUpload')}
        >
          <Avatar.Icon size={50} icon="file-upload" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Resume Upload</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ResumeStrength')}
        >
          <Avatar.Icon size={50} icon="file-chart" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Resume Strength</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AcademicData')}
        >
          <Avatar.Icon size={50} icon="school" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Academic Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('StudentNotifications')}
        >
          <Avatar.Icon size={50} icon="bell" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Notifications</Text>
        </TouchableOpacity>
      </View>

      <Button
        mode="outlined"
        onPress={handleLogout}
        style={[styles.logoutButton, { borderColor: theme.colors.error }]}
        icon="logout"
      >
        Logout
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerContent: {
    paddingBottom: 30,
  },
  header: {
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  regText: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 20,
    marginTop: -40,
  },
  statCard: {
    width: '30%',
    marginHorizontal: 5,
    marginBottom: 10,
    borderRadius: 15,
    elevation: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  menuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-around',
  },
  menuItem: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 20,
  },
  menuIcon: {
    marginBottom: 10,
  },
  menuText: {
    fontSize: 12,
    textAlign: 'center',
  },
  logoutButton: {
    margin: 20,
    borderRadius: 10,
  },
  resumeCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    elevation: 3,
  },
  resumeTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  resumeText: {
    fontSize: 13,
  },
  resumeButton: {
    marginTop: 10,
    borderRadius: 8,
  },
  eligibleCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    elevation: 3,
  },
  eligibleTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  eligibleEmpty: {
    fontSize: 13,
  },
  eligibleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  eligibleInfo: {
    flex: 1,
    marginRight: 10,
  },
  eligibleName: {
    fontWeight: 'bold',
  },
  eligibleMeta: {
    fontSize: 12,
  },
  eligibleStatCard: {},
  notEligibleStatCard: {},
});
