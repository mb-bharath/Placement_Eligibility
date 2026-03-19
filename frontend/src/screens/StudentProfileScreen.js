import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { TextInput, Button, Dialog, Portal, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, apiJson } from '../config/api';
import { demoStudent } from '../data/demoData';

export default function StudentProfileScreen({ navigation }) {
  const theme = useTheme();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [user, setUser] = useState({
    name: '',
    registerNumber: '',
    phone: '',
    department: '',
    batch: '',
    cgpa: '',
    backlogs: '',
    historyOfArrears: '',
    tenthPercentage: '',
    twelfthPercentage: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { response, data } = await apiFetch('/students/profile');
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load profile');
      }

      const student = data.student || {};
      setUser({
        name: student.name || '',
        registerNumber: student.registerNumber || '',
        phone: student.phone || '',
        department: student.department || '',
        batch: student.batch || '',
        cgpa: student.cgpa !== null && student.cgpa !== undefined ? String(student.cgpa) : '',
        backlogs: student.backlogs !== null && student.backlogs !== undefined ? String(student.backlogs) : '',
        historyOfArrears: student.historyOfArrears !== null && student.historyOfArrears !== undefined ? String(student.historyOfArrears) : '',
        tenthPercentage: student.tenthPercentage !== null && student.tenthPercentage !== undefined ? String(student.tenthPercentage) : '',
        twelfthPercentage: student.twelfthPercentage !== null && student.twelfthPercentage !== undefined ? String(student.twelfthPercentage) : '',
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      setUser({
        name: demoStudent.name,
        registerNumber: demoStudent.registerNumber,
        phone: '',
        department: demoStudent.department,
        batch: '',
        cgpa: String(demoStudent.cgpa),
        backlogs: String(demoStudent.backlogs),
        historyOfArrears: '0',
        tenthPercentage: String(demoStudent.tenthPercentage),
        twelfthPercentage: String(demoStudent.twelfthPercentage),
      });
    }
  };

  const handleSave = async () => {
    if (!user.name || !user.registerNumber || !user.department) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const cgpa = parseFloat(user.cgpa);
    const backlogs = parseInt(user.backlogs, 10);
    const historyOfArrears = parseInt(user.historyOfArrears || '0', 10);
    const tenthPercentage = parseFloat(user.tenthPercentage);
    const twelfthPercentage = parseFloat(user.twelfthPercentage);

    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
      Alert.alert('Error', 'Please enter valid CGPA (0-10)');
      return;
    }

    if (isNaN(backlogs) || backlogs < 0) {
      Alert.alert('Error', 'Please enter valid number of backlogs');
      return;
    }

    if (isNaN(tenthPercentage) || tenthPercentage < 0 || tenthPercentage > 100) {
      Alert.alert('Error', 'Please enter valid 10th % (0-100)');
      return;
    }

    if (isNaN(twelfthPercentage) || twelfthPercentage < 0 || twelfthPercentage > 100) {
      Alert.alert('Error', 'Please enter valid 12th % (0-100)');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: user.name,
        registerNumber: user.registerNumber,
        phone: user.phone,
        department: user.department,
        batch: user.batch,
        cgpa,
        backlogs,
        historyOfArrears,
        tenthPercentage,
        twelfthPercentage,
      };

      const { response, data } = await apiJson('/students/profile', 'PUT', payload);
      if (!response.ok || !data.success) {
        Alert.alert('Error', data.message || 'Failed to save profile');
        setLoading(false);
        return;
      }

      const userData = await AsyncStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : {};
      await AsyncStorage.setItem('user', JSON.stringify({ ...currentUser, ...data.student }));

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const confirmLogout = async () => {
    setLogoutOpen(false);
    await AsyncStorage.multiRemove(['user', 'token']);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login', params: { toast: 'Logged out successfully' } }],
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Portal>
        <Dialog visible={logoutOpen} onDismiss={() => setLogoutOpen(false)}>
          <Dialog.Title>Logout</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>Are you sure you want to logout?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutOpen(false)}>Cancel</Button>
            <Button onPress={confirmLogout} textColor={theme.colors.error}>
              Logout
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>Student Profile</Text>

        <TextInput
          label="Name *"
          value={user.name}
          onChangeText={(text) => setUser({ ...user, name: text })}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="account" />}
        />

        <TextInput
          label="Register Number *"
          value={user.registerNumber}
          onChangeText={(text) => setUser({ ...user, registerNumber: text })}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="badge-account" />}
        />

        <TextInput
          label="Phone"
          value={user.phone}
          onChangeText={(text) => setUser({ ...user, phone: text })}
          mode="outlined"
          style={styles.input}
          keyboardType="phone-pad"
          left={<TextInput.Icon icon="phone" />}
        />

        <TextInput
          label="Department *"
          value={user.department}
          onChangeText={(text) => setUser({ ...user, department: text })}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="school" />}
          placeholder="e.g., CSE, AI&DS, IT"
        />

        <TextInput
          label="Batch"
          value={user.batch}
          onChangeText={(text) => setUser({ ...user, batch: text })}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="calendar" />}
          placeholder="e.g., 2021-2025"
        />

        <TextInput
          label="CGPA *"
          value={user.cgpa}
          onChangeText={(text) => setUser({ ...user, cgpa: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          left={<TextInput.Icon icon="chart-line" />}
          placeholder="0.00 - 10.00"
        />

        <TextInput
          label="Number of Backlogs *"
          value={user.backlogs}
          onChangeText={(text) => setUser({ ...user, backlogs: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          left={<TextInput.Icon icon="alert-circle" />}
          placeholder="0"
        />

        <TextInput
          label="History of Arrears"
          value={user.historyOfArrears}
          onChangeText={(text) => setUser({ ...user, historyOfArrears: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          left={<TextInput.Icon icon="alert" />}
          placeholder="0"
        />

        <TextInput
          label="10th Percentage *"
          value={user.tenthPercentage}
          onChangeText={(text) => setUser({ ...user, tenthPercentage: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          left={<TextInput.Icon icon="chart-line" />}
          placeholder="0 - 100"
        />

        <TextInput
          label="12th Percentage *"
          value={user.twelfthPercentage}
          onChangeText={(text) => setUser({ ...user, twelfthPercentage: text })}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          left={<TextInput.Icon icon="chart-line" />}
          placeholder="0 - 100"
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Save Profile
        </Button>

        <Button
          mode="outlined"
          onPress={() => setLogoutOpen(true)}
          style={[styles.logoutButton, { borderColor: theme.colors.error }]}
          textColor={theme.colors.error}
          icon="logout"
        >
          Logout
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 15,
    padding: 20,
    borderRadius: 15,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 20,
    borderRadius: 10,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  logoutButton: {
    marginTop: 12,
    borderRadius: 10,
  },
});
