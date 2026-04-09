import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { Card, Button, Avatar, IconButton, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, API_BASE_URL } from '../config/api';
import { useFocusEffect } from '@react-navigation/native';
import {
  demoStudent,
  demoDashboardCounts,
  demoResumeUrl,
  eligibleCompaniesForStudent,
  demoCompanies,
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
    resumeCount: 0,
  });
  const [eligibleCompanies, setEligibleCompanies] = useState([]);
  const [notEligibleCompanies, setNotEligibleCompanies] = useState([]);

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
      const [userData, token] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token'),
      ]);

      if (!token) {
        navigation.replace('Login');
        return;
      }

      if (userData) setUser(JSON.parse(userData));

      const [dash, docs, eligible, eligibility] = await Promise.all([
        apiFetch('/students/dashboard'),
        apiFetch('/documents/my-docs'),
        apiFetch('/students/eligible-companies'),
        apiFetch('/students/eligibility'),
      ]);

      const isUnauthorized =
        dash.response.status === 401 ||
        docs.response.status === 401 ||
        eligible.response.status === 401 ||
        eligibility.response.status === 401 ||
        dash.data?.message === 'Invalid token';

      if (isUnauthorized) {
        throw new Error('unauthorized');
      }

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
        const resumeDocs = (docs.data.documents || []).filter((d) => d.documentType === 'resume');
        const hasResume = resumeDocs.length > 0;
        const resumeDoc = resumeDocs[0];
        setDocuments({
          total: docs.data.count || 0,
          resumeUploaded: hasResume,
          resumeUrl: resumeDoc ? resumeDoc.fileUrl : null,
          resumeCount: resumeDocs.length,
        });
      }

      if (eligibility.response.ok && eligibility.data && eligibility.data.success) {
        const results = eligibility.data.results || [];
        const mapCompany = (c) => ({
          ...c,
          eligibleDepartments: Array.isArray(c?.eligibleDepartments)
            ? c.eligibleDepartments.map((d) => DEPT_ALIAS_MAP[d] || d)
            : [],
        });
        setEligibleCompanies(results.filter((r) => r.isEligible).map((r) => mapCompany(r.company)));
        setNotEligibleCompanies(
          results
            .filter((r) => !r.isEligible)
            .map((r) => ({ ...mapCompany(r.company), reasons: r.reasons || [] }))
        );
      } else if (eligible.response.ok && eligible.data && eligible.data.success) {
        const mapCompany = (c) => ({
          ...c,
          eligibleDepartments: Array.isArray(c?.eligibleDepartments)
            ? c.eligibleDepartments.map((d) => DEPT_ALIAS_MAP[d] || d)
            : [],
        });
        setEligibleCompanies((eligible.data.companies || []).map(mapCompany));
        setNotEligibleCompanies([]);
      }
    } catch (error) {
      console.error('Error loading user data:', error);

      if (String(error?.message).toLowerCase().includes('unauthorized')) {
        await AsyncStorage.multiRemove(['token', 'user']);
        navigation.replace('Login');
        return;
      }

      // Offline fallback demo data
      setStats({
        total: demoDashboardCounts.total,
        eligible: demoDashboardCounts.eligible,
        notEligible: demoDashboardCounts.notEligible,
        applied: demoDashboardCounts.applied,
        shortlisted: demoDashboardCounts.shortlisted,
      });

      const mapCompany = (c) => ({
        ...c,
        eligibleDepartments: Array.isArray(c?.eligibleDepartments)
          ? c.eligibleDepartments.map((d) => DEPT_ALIAS_MAP[d] || d)
          : [],
      });
      const demoEligible = eligibleCompaniesForStudent(demoStudent).map(mapCompany);
      const demoNotEligible = demoCompanies.filter((c) => !eligibleCompaniesForStudent(demoStudent).includes(c)).map(mapCompany);
      setEligibleCompanies(demoEligible);
      setNotEligibleCompanies(demoNotEligible);

      const storedResumeUrl = await AsyncStorage.getItem('demo_resume_url');
      setDocuments({
        total: storedResumeUrl ? 1 : 0,
        resumeUploaded: !!storedResumeUrl,
        resumeUrl: storedResumeUrl || demoResumeUrl,
        resumeCount: storedResumeUrl ? 1 : 0,
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
    if (url.startsWith('/')) {
      return `${baseOrigin}${url}`;
    }
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
      navigation.navigate('ResumeTab', { screen: 'ResumeUpload' });
      return;
    }
    navigation.navigate('ResumeTab', { screen: 'StudentDocuments' });
  };

  const formatDept = (dept) => DEPT_ALIAS_MAP[dept] || dept;

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
        <View style={styles.headerTopRow}>
          <Text style={[styles.headerTopTitle, { color: theme.colors.onPrimary }]}>
            Student Dashboard
          </Text>
          <IconButton
            icon="bell-outline"
            iconColor={theme.colors.onPrimary}
            size={22}
            style={styles.headerBell}
            onPress={() => navigation.navigate('StudentNotifications')}
          />
        </View>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarCircle}>
            <Avatar.Icon size={58} icon="account" style={styles.headerAvatarIcon} color="#6A00FF" />
          </View>
          <Text style={[styles.welcomeText, { color: theme.colors.onPrimary }]}>
            Hi {String(user.name || 'Student').toUpperCase()},
          </Text>
          <Text style={[styles.subHeaderText, { color: theme.colors.onPrimary }]}>
            Here's your dashboard overview
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Avatar.Icon size={40} icon="office-building" style={styles.statIcon} color="#fff" />
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
            <Avatar.Icon size={40} icon="account-check" style={styles.statIcon} color="#fff" />
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
            <Avatar.Icon size={40} icon="account-remove" style={styles.statIcon} color="#fff" />
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
            <Avatar.Icon size={40} icon="clipboard-text" style={styles.statIcon} color="#fff" />
            <Text style={[styles.statNumber, { color: theme.colors.onSurface }]}>{stats.applied}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Applied
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Avatar.Icon size={40} icon="clipboard-check" style={styles.statIcon} color="#fff" />
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
            {documents.resumeUploaded ? `View Resumes (${documents.resumeCount})` : 'Upload Resume'}
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
                  {c.jobRole || 'Role'} | {c.package || 'Package'}
                </Text>
                {Array.isArray(c.eligibleDepartments) && c.eligibleDepartments.length ? (
                  <Text style={[styles.eligibleMeta, { color: theme.colors.onSurfaceVariant }]}>
                    {c.eligibleDepartments.map(formatDept).join(', ')}
                  </Text>
                ) : null}
              </View>
              <Button
                mode="outlined"
                onPress={() =>
                  navigation.navigate('ResumeTab', {
                    screen: 'ResumeUpload',
                    params: { companyId: c._id, company: c },
                  })
                }
                compact
              >
                Apply
              </Button>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card style={[styles.eligibleCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.eligibleTitle, { color: theme.colors.onSurface }]}>
            Not Eligible
          </Text>
          {notEligibleCompanies.length === 0 && (
            <Text style={[styles.eligibleEmpty, { color: theme.colors.onSurfaceVariant }]}>
              Great! You're eligible for all listed companies.
            </Text>
          )}
          {notEligibleCompanies.map((c) => (
            <View
              key={c._id || c.id || c.name}
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
                  {c.jobRole || 'Role'} | {c.package || 'Package'}
                </Text>
                {Array.isArray(c.eligibleDepartments) && c.eligibleDepartments.length ? (
                  <Text style={[styles.eligibleMeta, { color: theme.colors.onSurfaceVariant }]}>
                    {c.eligibleDepartments.map(formatDept).join(', ')}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.ineligibleTag, { color: theme.colors.error }]}>Not Eligible</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <View style={styles.menuContainer}>
        <Pressable
          style={styles.menuItem}
          onPress={() => navigation.navigate('ProfileTab', { screen: 'StudentProfile' })}
        >
          <Avatar.Icon size={50} icon="account" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>My Profile</Text>
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => navigation.navigate('CompaniesTab', { screen: 'CompanyList' })}
        >
          <Avatar.Icon size={50} icon="office-building" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Companies</Text>
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => navigation.navigate('CompaniesTab', { screen: 'EligibilityResult' })}
        >
          <Avatar.Icon size={50} icon="clipboard-check" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Check Eligibility</Text>
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => navigation.navigate('CompaniesTab', { screen: 'EligibilityStatus' })}
        >
          <Avatar.Icon size={50} icon="shield-check" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Eligibility Status</Text>
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => navigation.navigate('ResumeTab', { screen: 'ResumeUpload' })}
        >
          <Avatar.Icon size={50} icon="file-upload" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Resume Upload</Text>
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => navigation.navigate('ResumeTab', { screen: 'ResumeStrength' })}
        >
          <Avatar.Icon size={50} icon="file-chart" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Resume Strength</Text>
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => navigation.navigate('ProfileTab', { screen: 'AcademicData' })}
        >
          <Avatar.Icon size={50} icon="school" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Academic Data</Text>
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => navigation.navigate('StudentNotifications')}
        >
          <Avatar.Icon size={50} icon="bell" style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.menuText, { color: theme.colors.onSurface }]}>Notifications</Text>
        </Pressable>
      </View>
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
    paddingTop: 24,
    paddingHorizontal: 18,
    paddingBottom: 60,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTopTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerCenter: {
    alignItems: 'center',
    marginTop: 18,
  },
  headerAvatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 3,
  },
  headerAvatarIcon: {
    backgroundColor: 'transparent',
  },
  headerBell: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subHeaderText: {
    fontSize: 14,
    opacity: 0.92,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 20,
    marginTop: -55,
  },
  statCard: {
    width: '30%',
    marginHorizontal: 5,
    marginBottom: 10,
    borderRadius: 15,
    elevation: 4,
  },
  statIcon: {
    backgroundColor: '#6A00FF',
    alignSelf: 'center',
    marginBottom: 10,
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
  ineligibleTag: {
    fontSize: 12,
    fontWeight: '700',
  },
});
