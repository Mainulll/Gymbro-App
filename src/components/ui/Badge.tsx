import React from 'react';
import { View, Text, ViewStyle } from 'react-native';

type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const VARIANT_BG: Record<BadgeVariant, string> = {
  accent: 'bg-accent/18',
  success: 'bg-success/15',
  warning: 'bg-warning/15',
  danger: 'bg-danger/15',
  neutral: 'bg-surface-elevated',
};

const VARIANT_TEXT: Record<BadgeVariant, string> = {
  accent: 'text-accent-light',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-text-secondary',
};

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  return (
    <View
      className={`px-2 rounded-full self-start ${VARIANT_BG[variant]}`}
      style={[{ paddingVertical: 3 }, style]}
    >
      <Text className={`text-[11px] font-semibold tracking-[0.3px] ${VARIANT_TEXT[variant]}`}>
        {label}
      </Text>
    </View>
  );
}
