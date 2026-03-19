import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { LightTheme, ThemeContext } from './src/theme';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

import StudentHomeScreen from './src/screens/StudentHomeScreen';
import StudentProfileScreen from './src/screens/StudentProfileScreen';
import AcademicDataScreen from './src/screens/AcademicDataScreen';
import ResumeUploadScreen from './src/screens/ResumeUploadScreen';
import ResumeStrengthScreen from './src/screens/ResumeStrengthScreen';
import ResumeTemplateScreen from './src/screens/ResumeTemplateScreen';
import StudentDocumentsScreen from './src/screens/StudentDocumentsScreen';
import CompanyListScreen from './src/screens/CompanyListScreen';
import CompanyDetailsScreen from './src/screens/CompanyDetailsScreen';
import EligibilityResultScreen from './src/screens/EligibilityResultScreen';
import EligibilityStatusScreen from './src/screens/EligibilityStatusScreen';
import StudentNotificationsScreen from './src/screens/StudentNotificationsScreen';

import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import CompanyManagementScreen from './src/screens/CompanyManagementScreen';
import StudentManagementScreen from './src/screens/StudentManagementScreen';
import EligibleStudentsScreen from './src/screens/EligibleStudentsScreen';
import AdminStudentDetailsScreen from './src/screens/AdminStudentDetailsScreen';
import PlacementStatsScreen from './src/screens/PlacementStatsScreen';
import AdminNotificationsScreen from './src/screens/AdminNotificationsScreen';
import DriveControlScreen from './src/screens/DriveControlScreen';
import ExcelScreen from './src/screens/ExcelScreen';
import AdminToolsScreen from './src/screens/AdminToolsScreen';

const RootStack = createStackNavigator();
const StudentDashboardStack = createStackNavigator();
const StudentProfileStack = createStackNavigator();
const StudentResumeStack = createStackNavigator();
const StudentCompaniesStack = createStackNavigator();
const AdminDashboardStack = createStackNavigator();
const AdminStudentsStack = createStackNavigator();
const AdminDriveStack = createStackNavigator();
const AdminReportsStack = createStackNavigator();
const AdminProfileStack = createStackNavigator();
const StudentTabs = createBottomTabNavigator();
const AdminTabs = createBottomTabNavigator();

function HeaderActions({ navigation, role }) {
  const paperTheme = useTheme();
  const notificationsRoute = role === 'admin' ? 'AdminNotifications' : 'StudentNotifications';

  return (
    <View style={{ flexDirection: 'row' }}>
      <IconButton
        icon="bell"
        iconColor={paperTheme.colors.onPrimary}
        size={22}
        onPress={() => navigation.navigate(notificationsRoute)}
      />
    </View>
  );
}

const makeStackScreenOptions = (paperTheme, role) => ({ navigation }) => ({
  headerStyle: { backgroundColor: paperTheme.colors.primary },
  headerTintColor: paperTheme.colors.onPrimary,
  headerTitleStyle: { fontWeight: 'bold' },
  headerRight: () => <HeaderActions navigation={navigation} role={role} />,
});

function StudentDashboardStackScreen({ role, paperTheme }) {
  return (
    <StudentDashboardStack.Navigator screenOptions={makeStackScreenOptions(paperTheme, role)}>
      <StudentDashboardStack.Screen
        name="StudentHome"
        component={StudentHomeScreen}
        options={{ headerShown: false }}
      />
    </StudentDashboardStack.Navigator>
  );
}

function StudentProfileStackScreen({ role, paperTheme }) {
  return (
    <StudentProfileStack.Navigator screenOptions={makeStackScreenOptions(paperTheme, role)}>
      <StudentProfileStack.Screen name="StudentProfile" component={StudentProfileScreen} options={{ title: 'My Profile' }} />
      <StudentProfileStack.Screen name="AcademicData" component={AcademicDataScreen} options={{ title: 'Academic Details' }} />
    </StudentProfileStack.Navigator>
  );
}

function StudentResumeStackScreen({ role, paperTheme }) {
  return (
    <StudentResumeStack.Navigator screenOptions={makeStackScreenOptions(paperTheme, role)}>
      <StudentResumeStack.Screen name="StudentDocuments" component={StudentDocumentsScreen} options={{ title: 'My Documents' }} />
      <StudentResumeStack.Screen name="ResumeTemplate" component={ResumeTemplateScreen} options={{ title: 'Resume Template' }} />
      <StudentResumeStack.Screen name="ResumeUpload" component={ResumeUploadScreen} options={{ title: 'Resume Upload' }} />
      <StudentResumeStack.Screen name="ResumeStrength" component={ResumeStrengthScreen} options={{ title: 'Resume Strength' }} />
    </StudentResumeStack.Navigator>
  );
}

function StudentCompaniesStackScreen({ role, paperTheme }) {
  return (
    <StudentCompaniesStack.Navigator screenOptions={makeStackScreenOptions(paperTheme, role)}>
      <StudentCompaniesStack.Screen name="CompanyList" component={CompanyListScreen} options={{ title: 'Companies' }} />
      <StudentCompaniesStack.Screen name="CompanyDetails" component={CompanyDetailsScreen} options={{ title: 'Company Details' }} />
      <StudentCompaniesStack.Screen name="EligibilityResult" component={EligibilityResultScreen} options={{ title: 'Check Eligibility' }} />
      <StudentCompaniesStack.Screen name="EligibilityStatus" component={EligibilityStatusScreen} options={{ title: 'Check Status' }} />
    </StudentCompaniesStack.Navigator>
  );
}

function StudentTabsScreen({ role, paperTheme }) {
  return (
    <StudentTabs.Navigator
      initialRouteName="DashboardTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const map = {
            DashboardTab: 'view-dashboard',
            ProfileTab: 'account',
            ResumeTab: 'file-document',
            CompaniesTab: 'office-building',
          };
          return <MaterialCommunityIcons name={map[route.name] || 'circle'} color={color} size={size} />;
        },
        tabBarActiveTintColor: paperTheme.colors.primary,
      })}
    >
      <StudentTabs.Screen
        name="DashboardTab"
        options={{ title: 'Home' }}
      >
        {() => <StudentDashboardStackScreen role={role} paperTheme={paperTheme} />}
      </StudentTabs.Screen>
      <StudentTabs.Screen
        name="ResumeTab"
        options={{ title: 'Resume' }}
      >
        {() => <StudentResumeStackScreen role={role} paperTheme={paperTheme} />}
      </StudentTabs.Screen>
      <StudentTabs.Screen
        name="CompaniesTab"
        options={{ title: 'Companies' }}
      >
        {() => <StudentCompaniesStackScreen role={role} paperTheme={paperTheme} />}
      </StudentTabs.Screen>
      <StudentTabs.Screen
        name="ProfileTab"
        options={{ title: 'Profile' }}
      >
        {() => <StudentProfileStackScreen role={role} paperTheme={paperTheme} />}
      </StudentTabs.Screen>
    </StudentTabs.Navigator>
  );
}

function AdminDashboardStackScreen({ role, paperTheme }) {
  return (
    <AdminDashboardStack.Navigator screenOptions={makeStackScreenOptions(paperTheme, role)}>
      <AdminDashboardStack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ headerShown: false }}
      />
    </AdminDashboardStack.Navigator>
  );
}

function AdminStudentsStackScreen({ role, paperTheme }) {
  return (
    <AdminStudentsStack.Navigator screenOptions={makeStackScreenOptions(paperTheme, role)}>
      <AdminStudentsStack.Screen name="StudentManagement" component={StudentManagementScreen} options={{ title: 'Student Management' }} />
      <AdminStudentsStack.Screen name="EligibleStudents" component={EligibleStudentsScreen} options={{ title: 'Eligible Students' }} />
      <AdminStudentsStack.Screen name="AdminStudentDetails" component={AdminStudentDetailsScreen} options={{ title: 'Student Details' }} />
    </AdminStudentsStack.Navigator>
  );
}

function AdminDriveStackScreen({ role, paperTheme }) {
  return (
    <AdminDriveStack.Navigator screenOptions={makeStackScreenOptions(paperTheme, role)}>
      <AdminDriveStack.Screen name="DriveControl" component={DriveControlScreen} options={{ title: 'Drive Control' }} />
      <AdminDriveStack.Screen name="CompanyManagement" component={CompanyManagementScreen} options={{ title: 'Manage Companies' }} />
    </AdminDriveStack.Navigator>
  );
}

function AdminReportsStackScreen({ role, paperTheme }) {
  return (
    <AdminReportsStack.Navigator screenOptions={makeStackScreenOptions(paperTheme, role)}>
      <AdminReportsStack.Screen name="PlacementStats" component={PlacementStatsScreen} options={{ title: 'Placement Statistics' }} />
      <AdminReportsStack.Screen name="Excel" component={ExcelScreen} options={{ title: 'Excel Import/Export' }} />
    </AdminReportsStack.Navigator>
  );
}

function AdminProfileStackScreen({ role, paperTheme }) {
  return (
    <AdminProfileStack.Navigator screenOptions={makeStackScreenOptions(paperTheme, role)}>
      <AdminProfileStack.Screen name="AdminProfile" component={AdminToolsScreen} options={{ title: 'Profile' }} />
    </AdminProfileStack.Navigator>
  );
}

function AdminTabsScreen({ role, paperTheme }) {
  return (
    <AdminTabs.Navigator
      initialRouteName="AdminDashboardTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const map = {
            AdminDashboardTab: 'view-dashboard',
            AdminStudentsTab: 'account-group',
            AdminDriveTab: 'calendar-clock',
            AdminReportsTab: 'chart-bar',
            AdminProfileTab: 'account-circle',
          };
          return <MaterialCommunityIcons name={map[route.name] || 'circle'} color={color} size={size} />;
        },
        tabBarActiveTintColor: paperTheme.colors.primary,
      })}
    >
      <AdminTabs.Screen name="AdminDashboardTab" options={{ title: 'Dashboard' }}>
        {() => <AdminDashboardStackScreen role={role} paperTheme={paperTheme} />}
      </AdminTabs.Screen>
      <AdminTabs.Screen name="AdminStudentsTab" options={{ title: 'Students' }}>
        {() => <AdminStudentsStackScreen role={role} paperTheme={paperTheme} />}
      </AdminTabs.Screen>
      <AdminTabs.Screen name="AdminDriveTab" options={{ title: 'Drive' }}>
        {() => <AdminDriveStackScreen role={role} paperTheme={paperTheme} />}
      </AdminTabs.Screen>
      <AdminTabs.Screen name="AdminReportsTab" options={{ title: 'Reports' }}>
        {() => <AdminReportsStackScreen role={role} paperTheme={paperTheme} />}
      </AdminTabs.Screen>
      <AdminTabs.Screen name="AdminProfileTab" options={{ title: 'Profile' }}>
        {() => <AdminProfileStackScreen role={role} paperTheme={paperTheme} />}
      </AdminTabs.Screen>
    </AdminTabs.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const checkLoginStatus = async () => {
    try {
      const user = await AsyncStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        setIsLoggedIn(true);
        setUserRole(userData.role);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error checking login status:', error);
    } finally {
      setBooting(false);
    }
  };

  const isDark = false;
  const toggleTheme = () => {};
  const paperTheme = LightTheme;
  const navigationTheme = useMemo(() => {
    const baseTheme = NavigationDefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: paperTheme.colors.background,
      },
    };
  }, [paperTheme.colors.background]);

  if (booting) return null;

  const initialRoute = isLoggedIn
    ? userRole === 'admin'
      ? 'AdminApp'
      : 'StudentApp'
    : 'Login';

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navigationTheme}>
          <RootStack.Navigator key={initialRoute} initialRouteName={initialRoute}>
            <RootStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />

            <RootStack.Screen name="StudentApp" options={{ headerShown: false }}>
              {() => <StudentTabsScreen role="student" paperTheme={paperTheme} />}
            </RootStack.Screen>
            <RootStack.Screen name="AdminApp" options={{ headerShown: false }}>
              {() => <AdminTabsScreen role="admin" paperTheme={paperTheme} />}
            </RootStack.Screen>

            <RootStack.Screen name="StudentNotifications" component={StudentNotificationsScreen} options={{ title: 'Notifications' }} />
            <RootStack.Screen name="AdminNotifications" component={AdminNotificationsScreen} options={{ title: 'Notifications' }} />
          </RootStack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </ThemeContext.Provider>
  );
}

