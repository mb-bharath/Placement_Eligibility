import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Card, Button, Avatar, IconButton, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart } from 'react-native-chart-kit';
import { apiFetch } from '../config/api';
import { demoAdminStats, demoAppStats, demoChart } from '../data/demoData';

const screenWidth = Dimensions.get('window').width;

export default function AdminDashboardScreen({ navigation }) {
  const theme = useTheme();
  const [admin, setAdmin] = useState({ name: 'Admin' });
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalStudents: 0,
    avgCGPA: 0,
    totalDocuments: 0,
  });
  const [appStats, setAppStats] = useState({
    totalApplications: 0,
    shortlisted: 0,
    selected: 0,
    totalPlaced: 0,
  });
  const [chart, setChart] = useState({ labels: [], data: [] });

  useEffect(() => {
    calculateStats();
  }, []);

  useEffect(() => {
    const load = async () => {
      const userData = await AsyncStorage.getItem('user');
      const u = userData ? JSON.parse(userData) : {};
      setAdmin({ name: u.name || 'Admin' });
    };
    load();
  }, []);

  const calculateStats = () => {
    const load = async () => {
      try {
        const [{ response, data }, apps] = await Promise.all([
          apiFetch('/admin/stats'),
          apiFetch('/applications/stats'),
        ]);

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to load admin stats');
        }

        setStats({
          totalCompanies: data.stats.totalCompanies || 0,
          totalStudents: data.stats.totalStudents || 0,
          avgCGPA: data.stats.avgCGPA || 0,
          totalDocuments: data.stats.totalDocuments || 0,
        });
        setChart({
          labels: data.chart.labels || [],
          data: data.chart.data || [],
        });

        if (apps.response.ok && apps.data && apps.data.success) {
          setAppStats({
            totalApplications: apps.data.stats.totalApplications || 0,
            shortlisted: apps.data.stats.shortlisted || 0,
            selected: apps.data.stats.selected || 0,
            totalPlaced: apps.data.stats.totalPlaced || 0,
          });
        }
      } catch (err) {
        console.error('Stats error:', err);
        setStats({
          totalCompanies: demoAdminStats.totalCompanies,
          totalStudents: demoAdminStats.totalStudents,
          avgCGPA: demoAdminStats.avgCGPA,
          totalDocuments: demoAdminStats.totalDocuments,
        });
        setAppStats({
          totalApplications: demoAppStats.totalApplications,
          shortlisted: demoAppStats.shortlisted,
          selected: demoAppStats.selected,
          totalPlaced: demoAppStats.totalPlaced,
        });
        setChart({
          labels: demoChart.labels,
          data: demoChart.data,
        });
      }
    };
    load();
  };

  const chartData = {
    labels: chart.labels.length > 0 ? chart.labels : ['No Data'],
    datasets: [
      {
        data: chart.data.length > 0 ? chart.data : [0],
      },
    ],
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.headerTopTitle, { color: theme.colors.onPrimary }]}>
            Admin Dashboard
          </Text>
          <IconButton
            icon="bell-outline"
            iconColor={theme.colors.onPrimary}
            size={22}
            style={styles.headerBell}
            onPress={() => navigation.navigate('AdminNotifications')}
          />
        </View>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarCircle}>
            <Avatar.Icon size={58} icon="shield-account" style={styles.headerAvatarIcon} color="#6A00FF" />
          </View>
          <Text style={[styles.welcomeText, { color: theme.colors.onPrimary }]}>
            Hi {String(admin.name || 'Admin').toUpperCase()},
          </Text>
          <Text style={[styles.subText, { color: theme.colors.onPrimary }]}>
            Here's your dashboard overview
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Avatar.Icon 
              size={40} 
              icon="office-building" 
              style={styles.statIcon}
            />
            <Text style={styles.statNumber}>{stats.totalCompanies}</Text>
            <Text style={styles.statLabel}>Companies</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Avatar.Icon 
              size={40} 
              icon="account-group" 
              style={styles.statIcon}
            />
            <Text style={styles.statNumber}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Avatar.Icon 
              size={40} 
              icon="chart-line" 
              style={styles.statIcon}
            />
            <Text style={styles.statNumber}>{stats.avgCGPA}</Text>
            <Text style={styles.statLabel}>Avg CGPA</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Avatar.Icon 
              size={40} 
              icon="file-document" 
              style={styles.statIcon}
            />
            <Text style={styles.statNumber}>{stats.totalDocuments}</Text>
            <Text style={styles.statLabel}>Documents</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Avatar.Icon 
              size={40} 
              icon="clipboard-text" 
              style={styles.statIcon}
            />
            <Text style={styles.statNumber}>{appStats.totalApplications}</Text>
            <Text style={styles.statLabel}>Applications</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Avatar.Icon 
              size={40} 
              icon="account-check" 
              style={styles.statIcon}
            />
            <Text style={styles.statNumber}>{appStats.shortlisted}</Text>
            <Text style={styles.statLabel}>Shortlisted</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Avatar.Icon 
              size={40} 
              icon="trophy" 
              style={styles.statIcon}
            />
            <Text style={styles.statNumber}>{appStats.selected}</Text>
            <Text style={styles.statLabel}>Selected</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <Avatar.Icon 
              size={40} 
              icon="briefcase-check" 
              style={styles.statIcon}
            />
            <Text style={styles.statNumber}>{appStats.totalPlaced}</Text>
            <Text style={styles.statLabel}>Placed</Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Statistics Overview</Text>
          <BarChart
            data={chartData}
            width={screenWidth - 60}
            height={220}
            yAxisLabel=""
            chartConfig={{
              backgroundColor: '#6200ee',
              backgroundGradientFrom: '#6200ee',
              backgroundGradientTo: '#9c4dcc',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#ffa726',
              },
            }}
            style={styles.chart}
          />
        </Card.Content>
      </Card>

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminDriveTab', { screen: 'CompanyManagement' })}
        >
          <Card style={styles.menuCard}>
            <Card.Content style={styles.menuContent}>
              <Avatar.Icon 
                size={50} 
                icon="office-building-plus" 
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Manage Companies</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminStudentsTab', { screen: 'StudentManagement' })}
        >
          <Card style={styles.menuCard}>
            <Card.Content style={styles.menuContent}>
              <Avatar.Icon 
                size={50} 
                icon="account-multiple" 
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>View Students</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminStudentsTab', { screen: 'EligibleStudents' })}
        >
          <Card style={styles.menuCard}>
            <Card.Content style={styles.menuContent}>
              <Avatar.Icon 
                size={50} 
                icon="account-check" 
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Eligible Students</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminReportsTab', { screen: 'PlacementStats' })}
        >
          <Card style={styles.menuCard}>
            <Card.Content style={styles.menuContent}>
              <Avatar.Icon 
                size={50} 
                icon="chart-bar" 
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Placement Stats</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminNotifications')}
        >
          <Card style={styles.menuCard}>
            <Card.Content style={styles.menuContent}>
              <Avatar.Icon 
                size={50} 
                icon="bell" 
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Notifications</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminDriveTab', { screen: 'DriveControl' })}
        >
          <Card style={styles.menuCard}>
            <Card.Content style={styles.menuContent}>
              <Avatar.Icon 
                size={50} 
                icon="calendar-clock" 
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Drive Control</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminReportsTab', { screen: 'Excel' })}
        >
          <Card style={styles.menuCard}>
            <Card.Content style={styles.menuContent}>
              <Avatar.Icon 
                size={50} 
                icon="file-excel" 
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Excel Import/Export</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  welcomeText: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subText: {
    fontSize: 14,
    opacity: 0.92,
    marginTop: 2,
    textAlign: 'center',
  },
  headerBell: {
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    backgroundColor: '#fff',
  },
  statIcon: {
    backgroundColor: '#6200ee',
    alignSelf: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
    marginTop: 5,
  },
  chartCard: {
    margin: 20,
    borderRadius: 15,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  menuContainer: {
    padding: 15,
  },
  menuItem: {
    marginBottom: 15,
  },
  menuCard: {
    borderRadius: 15,
    elevation: 3,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    backgroundColor: '#6200ee',
    marginRight: 15,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
