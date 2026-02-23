import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Spacing } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  glass?: boolean;
  accent?: string;   // optional left-border accent color
  padding?: number;
}

export function Card({
  children,
  style,
  elevated = false,
  glass = false,
  accent,
  padding = Spacing.base,
}: CardProps) {
  if (glass) {
    return (
      <View style={[styles.glassOuter, accent ? { borderLeftColor: accent, borderLeftWidth: 2 } : null, style]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.03)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1.5 }}
          style={[styles.glassInner, { padding }]}
        >
          {children}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        accent ? { borderLeftColor: accent, borderLeftWidth: 2 } : null,
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elevated: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  glassOuter: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  glassInner: {
    borderRadius: Radius.lg,
  },
});
