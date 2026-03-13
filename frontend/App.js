import React, { useState, useEffect, useMemo } from 'react';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, LightTheme, ThemeContext } from './src/theme';

// Import Screens
import RoleSelectScreen from './src/screens/RoleSelectScreen';
import StudentLoginScreen from './src/screens/StudentLoginScreen';
import AdminLoginScreen from './src/screens/AdminLoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AdminRegisterScreen from './src/screens/AdminRegisterScreen';
import StudentHomeScreen from './src/screens/StudentHomeScreen';
import CompanyListScreen from './src/screens/CompanyListScreen';
import EligibilityResultScreen from './src/screens/EligibilityResultScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import CompanyManagementScreen from './src/screens/CompanyManagementScreen';
import StudentProfileScreen from './src/screens/StudentProfileScreen';
import EligibilityStatusScreen from './src/screens/EligibilityStatusScreen';
import ResumeUploadScreen from './src/screens/ResumeUploadScreen';
import ResumeStrengthScreen from './src/screens/ResumeStrengthScreen';
import AcademicDataScreen from './src/screens/AcademicDataScreen';
import StudentNotificationsScreen from './src/screens/StudentNotificationsScreen';
import StudentManagementScreen from './src/screens/StudentManagementScreen';
import EligibleStudentsScreen from './src/screens/EligibleStudentsScreen';
import PlacementStatsScreen from './src/screens/PlacementStatsScreen';
import AdminNotificationsScreen from './src/screens/AdminNotificationsScreen';
import DriveControlScreen from './src/screens/DriveControlScreen';
import ExcelScreen from './src/screens/ExcelScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [themeMode, setThemeMode] = useState('light');

  useEffect(() => {
    checkLoginStatus();
    loadThemePreference();
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
      console.error('Error checking login status:', error);
    }
  };

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
    try {
      await AsyncStorage.setItem('app_theme', nextTheme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const isDark = themeMode === 'dark';
  const paperTheme = isDark ? DarkTheme : LightTheme;
  const navigationTheme = useMemo(() => {
    const baseTheme = isDark ? NavigationDarkTheme : NavigationDefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: paperTheme.colors.background,
      },
    };
  }, [isDark, paperTheme.colors.background]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          initialRouteName="RoleSelect"
          screenOptions={{
            headerStyle: { backgroundColor: paperTheme.colors.primary },
            headerTintColor: paperTheme.colors.onPrimary,
            headerTitleStyle: { fontWeight: 'bold' },
            headerRight: () => (
              <IconButton
                icon={isDark ? 'weather-sunny' : 'moon-waning-crescent'}
                iconColor={paperTheme.colors.onPrimary}
                size={22}
                onPress={toggleTheme}
              />
            ),
          }}
        >
          <Stack.Screen
            name="RoleSelect"
            component={RoleSelectScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="StudentLogin"
            component={StudentLoginScreen}
            options={{ title: 'Student Login' }}
          />
          <Stack.Screen
            name="AdminLogin"
            component={AdminLoginScreen}
            options={{ title: 'Admin Login' }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen}
            options={{ title: 'Register' }}
          />
          <Stack.Screen 
            name="AdminRegister" 
            component={AdminRegisterScreen}
            options={{ title: 'Admin Register' }}
          />
          <Stack.Screen 
            name="StudentHome" 
            component={StudentHomeScreen}
            options={{ title: 'Home' }}
          />
          <Stack.Screen 
            name="CompanyList" 
            component={CompanyListScreen}
            options={{ title: 'Companies' }}
          />
          <Stack.Screen 
            name="EligibilityResult" 
            component={EligibilityResultScreen}
            options={{ title: 'Eligibility Status' }}
          />
          <Stack.Screen 
            name="AdminDashboard" 
            component={AdminDashboardScreen}
            options={{ title: 'Admin Dashboard' }}
          />
          <Stack.Screen 
            name="CompanyManagement" 
            component={CompanyManagementScreen}
            options={{ title: 'Manage Companies' }}
          />
          <Stack.Screen 
            name="StudentProfile" 
            component={StudentProfileScreen}
            options={{ title: 'My Profile' }}
          />
          <Stack.Screen 
            name="EligibilityStatus" 
            component={EligibilityStatusScreen}
            options={{ title: 'Eligibility Status' }}
          />
          <Stack.Screen 
            name="ResumeUpload" 
            component={ResumeUploadScreen}
            options={{ title: 'Resume Upload' }}
          />
          <Stack.Screen 
            name="ResumeStrength" 
            component={ResumeStrengthScreen}
            options={{ title: 'Resume Strength' }}
          />
          <Stack.Screen 
            name="AcademicData" 
            component={AcademicDataScreen}
            options={{ title: 'Academic Data' }}
          />
          <Stack.Screen 
            name="StudentNotifications" 
            component={StudentNotificationsScreen}
            options={{ title: 'Notifications' }}
          />
          <Stack.Screen 
            name="StudentManagement" 
            component={StudentManagementScreen}
            options={{ title: 'Student Management' }}
          />
          <Stack.Screen 
            name="EligibleStudents" 
            component={EligibleStudentsScreen}
            options={{ title: 'Eligible Students' }}
          />
          <Stack.Screen 
            name="PlacementStats" 
            component={PlacementStatsScreen}
            options={{ title: 'Placement Statistics' }}
          />
          <Stack.Screen 
            name="AdminNotifications" 
            component={AdminNotificationsScreen}
            options={{ title: 'Admin Notifications' }}
          />
          <Stack.Screen 
            name="DriveControl" 
            component={DriveControlScreen}
            options={{ title: 'Drive Control' }}
          />
          <Stack.Screen 
            name="Excel" 
            component={ExcelScreen}
            options={{ title: 'Excel Import/Export' }}
          />
        </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </ThemeContext.Provider>
  );
}
