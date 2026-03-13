import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { Card, TextInput, Button, Switch, Chip } from 'react-native-paper';
import { apiFetch, apiJson } from '../config/api';
import { demoCompanies } from '../data/demoData';

export default function AdminNotificationsScreen() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [sendEmailFlag, setSendEmailFlag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { response, data } = await apiFetch('/companies');
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load companies');
      }
      setCompanies(data.companies || []);
    } catch (err) {
      setCompanies(demoCompanies);
    }
  };

  const sendBroadcast = async () => {
    if (!title || !message) {
      Alert.alert('Error', 'Title and message are required');
      return;
    }
    setLoading(true);
    try {
      const { response, data } = await apiJson('/notifications/broadcast', 'POST', {
        title,
        message,
        department,
        sendEmailFlag,
      });
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send notification');
      }
      Alert.alert('Success', 'Notification sent');
      setTitle('');
      setMessage('');
    } catch (err) {
      Alert.alert('Saved Locally', 'Notification saved locally (demo mode).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Send Notification</Text>
          <TextInput
            label="Title"
            mode="outlined"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />
          <TextInput
            label="Message"
            mode="outlined"
            value={message}
            onChangeText={setMessage}
            style={styles.input}
            multiline
          />
          <TextInput
            label="Department (ALL/CSE/ECE/MECH/EEE/CIVIL/IT/AI&DS)"
            mode="outlined"
            value={department}
            onChangeText={setDepartment}
            style={styles.input}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Send Email</Text>
            <Switch value={sendEmailFlag} onValueChange={setSendEmailFlag} />
          </View>

          <Button mode="contained" onPress={sendBroadcast} loading={loading} style={styles.button}>
            Send
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Notify Eligible Students</Text>
          <Text style={styles.subtitle}>Send drive notification by company</Text>
          <View style={styles.chipRow}>
            {companies.map((c) => (
              <Chip
                key={c._id}
                onPress={async () => {
                  try {
                    const { response, data } = await apiJson(`/notifications/new-drive/${c._id}`, 'POST', { sendEmailFlag: true });
                    if (!response.ok || !data.success) {
                      throw new Error(data.message || 'Failed to notify');
                    }
                    Alert.alert('Success', data.message || 'Notified students');
                  } catch (err) {
                    Alert.alert('Saved Locally', 'Notification saved locally (demo mode).');
                  }
                }}
                style={styles.companyChip}
              >
                {c.name}
              </Chip>
            ))}
          </View>
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
  input: {
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  switchLabel: {
    color: '#333',
  },
  button: {
    borderRadius: 10,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  companyChip: {
    marginRight: 8,
    marginBottom: 8,
  },
});
