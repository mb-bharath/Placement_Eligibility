import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { Card, Button, Dialog, Portal, Avatar, IconButton, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminToolsScreen({ navigation }) {
  const theme = useTheme();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [admin, setAdmin] = useState({ name: 'Admin', email: '' });

  useEffect(() => {
    const load = async () => {
      const userData = await AsyncStorage.getItem('user');
      const u = userData ? JSON.parse(userData) : {};
      setAdmin({ name: u.name || 'Admin', email: u.email || '' });
    };
    load();
  }, []);

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

      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.headerRow}>
          <Avatar.Icon
            size={56}
            icon="account-tie"
            style={[styles.headerAvatar, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
            color={theme.colors.onPrimary}
          />

          <View style={styles.headerTextBox}>
            <Text style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>
              Hi {String(admin.name || 'Admin').toUpperCase()},
            </Text>
            <Text style={[styles.headerSub, { color: theme.colors.onPrimary }]}>
              Manage tools and profile
            </Text>
          </View>

          <IconButton
            icon="bell-outline"
            iconColor={theme.colors.onPrimary}
            size={24}
            style={styles.headerBell}
            onPress={() => navigation.navigate('AdminNotifications')}
          />
        </View>
      </View>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Admin Profile</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {admin.name}{admin.email ? ` (${admin.email})` : ''}
          </Text>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.section, { color: theme.colors.onSurface }]}>Tools</Text>

          <Button
            mode="contained"
            onPress={() => navigation.navigate('AdminNotifications')}
            style={styles.button}
            icon="bell"
          >
            Notifications
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Excel')}
            style={styles.button}
            icon="file-excel"
          >
            Excel Import/Export
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.spacer} />

      <Button
        mode="outlined"
        onPress={() => setLogoutOpen(true)}
        icon="logout"
        textColor={theme.colors.error}
        style={[styles.logoutButton, { borderColor: theme.colors.error }]}
      >
        Logout
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    marginRight: 14,
  },
  headerTextBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 14,
    opacity: 0.92,
    marginTop: 2,
  },
  headerBell: {
    marginLeft: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  card: {
    margin: 15,
    borderRadius: 14,
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  section: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  button: { borderRadius: 10, marginBottom: 10 },
  spacer: { height: 8 },
  logoutButton: { marginHorizontal: 15, marginBottom: 20, borderRadius: 12 },
});
