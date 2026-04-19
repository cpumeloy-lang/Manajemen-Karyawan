import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}

export function AppButton({ title, onPress, loading, variant = 'primary', style }: AppButtonProps) {
  const backgroundColor = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : colors.surface;
  const textColor = variant === 'secondary' ? colors.primary : '#fff';

  return (
    <Pressable onPress={onPress} style={[styles.button, { backgroundColor }, style]}>
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.text, { color: textColor }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
});
