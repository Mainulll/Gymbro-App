import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      <Text style={[styles.text, styles[`${variant}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  accent: { backgroundColor: Colors.accentMuted },
  accentText: { color: Colors.accentLight },

  success: { backgroundColor: Colors.successMuted },
  successText: { color: Colors.success },

  warning: { backgroundColor: Colors.warningMuted },
  warningText: { color: Colors.warning },

  danger: { backgroundColor: Colors.dangerMuted },
  dangerText: { color: Colors.danger },

  neutral: { backgroundColor: Colors.surfaceElevated },
  neutralText: { color: Colors.textSecondary },
});
