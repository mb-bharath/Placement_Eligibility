import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { Card, Button, ProgressBar } from 'react-native-paper';
import { apiFetch } from '../config/api';

export default function ResumeStrengthScreen() {
  const [score, setScore] = useState(null);
  const [minScore, setMinScore] = useState(60);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const pickPdf = async () => {
    let DocumentPicker;
    try {
      DocumentPicker = require('expo-document-picker');
    } catch (e) {
      Alert.alert('Missing Dependency', 'Install expo-document-picker to select files.');
      return null;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled) return null;
    const file = result.assets && result.assets[0];
    if (!file) return null;
    return {
      uri: file.uri,
      name: file.name || 'resume.pdf',
      type: file.mimeType || 'application/pdf',
    };
  };

  const checkResume = async () => {
    const file = await pickPdf();
    if (!file) return;

    const form = new FormData();
    form.append('document', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    });

    setLoading(true);
    try {
      const { response, data } = await apiFetch('/applications/check-resume', {
        method: 'POST',
        body: form,
      });

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Resume analysis failed');
      }

      setScore(data.resumeScore);
      setMinScore(data.minRequiredScore);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to analyze resume');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Resume Strength</Text>
          <Text style={styles.subtitle}>Score must be 60% or higher</Text>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>
              {score === null ? '--' : `${score}%`}
            </Text>
            <ProgressBar
              progress={score === null ? 0 : score / 100}
              color={score !== null && score >= minScore ? '#2e7d32' : '#c62828'}
              style={styles.bar}
            />
            <Text style={styles.scoreNote}>
              Minimum required: {minScore}%
            </Text>
          </View>

          <View style={styles.suggestions}>
            <Text style={styles.suggestTitle}>Suggestions</Text>
            {suggestions.length === 0 && (
              <Text style={styles.suggestItem}>Upload a resume to see suggestions</Text>
            )}
            {suggestions.map((s, i) => (
              <Text key={i} style={styles.suggestItem}>{s}</Text>
            ))}
          </View>

          <Button mode="contained" style={styles.button} onPress={checkResume} loading={loading}>
            Check Resume
          </Button>
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
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    marginBottom: 15,
  },
  scoreBox: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  bar: {
    marginTop: 8,
    height: 8,
    borderRadius: 6,
  },
  scoreNote: {
    marginTop: 8,
    color: '#2e7d32',
    fontSize: 12,
  },
  suggestions: {
    marginTop: 15,
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 12,
  },
  suggestTitle: {
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 6,
  },
  suggestItem: {
    color: '#e65100',
    fontSize: 12,
    marginBottom: 4,
  },
  button: {
    marginTop: 12,
    borderRadius: 10,
  },
});
