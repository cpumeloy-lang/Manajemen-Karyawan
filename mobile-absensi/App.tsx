import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/features/auth/AuthContext';
import { AppShell } from './src/shell/AppShell';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
