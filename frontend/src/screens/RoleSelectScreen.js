import React from 'react';
import { View, StyleSheet, Text, ImageBackground, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, useTheme } from 'react-native-paper';

export default function RoleSelectScreen({ navigation }) {
  const theme = useTheme();

  const isWeb = Platform.OS === 'web';

  const Container = isWeb ? View : KeyboardAvoidingView;
  const containerProps = isWeb
    ? { style: styles.webInner }
    : { behavior: Platform.OS === 'ios' ? 'padding' : 'height', style: styles.container };

  const content = (
    <Container {...containerProps}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
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
    </Container>
  );

  if (isWeb) {
    return (
      <ScrollView
        style={[styles.webBackground, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[
          styles.webContent,
          { backgroundColor: theme.colors.background },
        ]}
      >
        {content}
      </ScrollView>
    );
  }

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800' }}
      style={styles.background}
      blurRadius={3}
    >
      {content}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webBackground: {
    flex: 1,
    width: '100%',
  },
  webContent: {
    minHeight: '100vh',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webInner: {
    width: '100%',
    alignItems: 'center',
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
});
