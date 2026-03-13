import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { Card, Button, ActivityIndicator } from 'react-native-paper';
import { apiFetch, apiJson } from '../config/api';
import { demoNotifications } from '../data/demoData';

export default function StudentNotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { response, data } = await apiFetch('/notifications/my');
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load notifications');
      }
      setNotifications(data.notifications || []);
    } catch (err) {
      setNotifications(demoNotifications);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      const { response, data } = await apiJson('/notifications/read-all', 'PUT');
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to mark read');
      }
      loadNotifications();
    } catch (err) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Notifications</Text>
          <Button mode="outlined" onPress={markAllRead} style={styles.button}>
            Mark All Read
          </Button>
        </Card.Content>
      </Card>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator animating size="large" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      )}

      {!loading && notifications.length === 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.placeholder}>No notifications</Text>
          </Card.Content>
        </Card>
      )}

      {notifications.map((n) => (
        <Card key={n._id} style={styles.card}>
          <Card.Content>
            <Text style={styles.notifTitle}>{n.title}</Text>
            <Text style={styles.notifMessage}>{n.message}</Text>
            <Text style={styles.notifTime}>
              {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
            </Text>
            {!n.isRead && (
              <Button
                mode="text"
                onPress={async () => {
                  try {
                    const { response, data } = await apiJson(`/notifications/${n._id}/read`, 'PUT');
                    if (!response.ok || !data.success) {
                      throw new Error(data.message || 'Failed to mark read');
                    }
                    loadNotifications();
                  } catch (err) {
                    setNotifications((prev) =>
                      prev.map((x) => (x._id === n._id || x.id === n.id ? { ...x, isRead: true } : x))
                    );
                  }
                }}
              >
                Mark Read
              </Button>
            )}
          </Card.Content>
        </Card>
      ))}
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
  },
  button: {
    marginTop: 10,
    borderRadius: 10,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 13,
  },
  placeholder: {
    color: '#888',
    fontSize: 12,
  },
  notifTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  notifMessage: {
    color: '#666',
    marginTop: 6,
  },
  notifTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
});
