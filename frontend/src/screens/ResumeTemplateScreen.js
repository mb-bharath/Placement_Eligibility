import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { Card, Button, useTheme } from 'react-native-paper';

export default function ResumeTemplateScreen({ navigation }) {
  const theme = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Resume Template</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Use this simple template to create your resume, or upload your own PDF.
          </Text>

          <View style={styles.box}>
            <Text style={[styles.template, { color: theme.colors.onSurface }]}>
              {`NAME\nEmail | Phone | LinkedIn | GitHub\n\nSUMMARY\n1-2 lines about you.\n\nEDUCATION\nCollege • Degree • Year\nCGPA: X.XX\n\nSKILLS\nLanguages: ...\nFrameworks: ...\nTools: ...\n\nPROJECTS\nProject Name\n- What you built\n- Tech used\n- Result/impact\n\nACHIEVEMENTS\n- ...\n\nCERTIFICATIONS\n- ...`}
            </Text>
          </View>

          <Button mode="contained" onPress={() => navigation.navigate('ResumeUpload')} style={styles.button}>
            Upload Resume (PDF)
          </Button>
        </Card.Content>
      </Card>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 15,
    borderRadius: 14,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
  },
  box: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  template: {
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    marginTop: 14,
    borderRadius: 10,
  },
});

