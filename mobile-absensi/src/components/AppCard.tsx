import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface AppCardProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function AppCard({ title, children, style }: AppCardProps) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
});
