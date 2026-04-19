import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/features/auth/AuthContext';
import { AppShell } from './src/shell/AppShell';

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppShell />
    </AuthProvider>
  );
}
