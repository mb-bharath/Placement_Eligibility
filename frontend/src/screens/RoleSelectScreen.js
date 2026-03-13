import React, { useContext } from 'react';
import { View, StyleSheet, Text, ImageBackground, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Switch, useTheme } from 'react-native-paper';
import { ThemeContext } from '../theme';

export default function RoleSelectScreen({ navigation }) {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800' }}
      style={styles.background}
      blurRadius={3}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.themeRow}>
            <Text style={[styles.themeLabel, { color: theme.colors.onSurface }]}>
              {isDark ? 'Dark Theme' : 'Light Theme'}
            </Text>
            <Switch value={isDark} onValueChange={toggleTheme} />
          </View>

          <Text style={[styles.title, { color: theme.colors.primary }]}>Placement Portal</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Choose your role to continue
          </Text>

          <Button
            mode="contained"
            onPress={() => navigation.navigate('StudentLogin')}
            style={styles.buttonPrimary}
            contentStyle={styles.buttonContent}
          >
            Student Login
          </Button>

          <Button
            mode="contained"
            onPress={() => navigation.navigate('AdminLogin')}
            style={styles.buttonSecondary}
            contentStyle={styles.buttonContent}
          >
            Admin Login
          </Button>

          <View style={[styles.demoContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.demoTitle, { color: theme.colors.onSurface }]}>Demo Credentials</Text>
            <Text style={[styles.demoText, { color: theme.colors.onSurfaceVariant }]}>
              Student: student12345@bitsathy.ac.in / student12345
            </Text>
            <Text style={[styles.demoText, { color: theme.colors.onSurfaceVariant }]}>
              Admin: admin12345@bitsathy.ac.in / admin12345
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  card: {
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonPrimary: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 10,
  },
  buttonSecondary: {
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  demoContainer: {
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  demoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 12,
    marginBottom: 4,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
