import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Skeleton placeholder dengan animasi pulse.
 * Pakai untuk indikasi loading list/card sebelum data tersedia.
 */
export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

/** Variasi yang sering dipakai: skeleton untuk satu baris history. */
export function SkeletonHistoryItem() {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width={120} height={14} />
        <Skeleton width={180} height={12} />
        <Skeleton width="60%" height={11} />
      </View>
      <Skeleton width={70} height={26} borderRadius={999} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#f7fcfb',
    marginBottom: 12,
  },
});
