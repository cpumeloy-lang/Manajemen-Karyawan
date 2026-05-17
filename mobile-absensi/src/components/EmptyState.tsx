import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface EmptyStateProps {
  /** Emoji atau ikon string yang ditampilkan besar di tengah. */
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  icon: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: 16,
  },
});
