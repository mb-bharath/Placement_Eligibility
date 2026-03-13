import React from 'react';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const ThemeContext = React.createContext({
  isDark: false,
  toggleTheme: () => {},
});

export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    secondary: '#03dac6',
    background: '#f5f5f7',
    surface: '#ffffff',
    surfaceVariant: '#f1f1f1',
  },
};

export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#bb86fc',
    secondary: '#03dac6',
    background: '#0f0f12',
    surface: '#1c1c22',
    surfaceVariant: '#2a2a33',
  },
};
