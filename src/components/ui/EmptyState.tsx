import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-3" style={style}>
      <Ionicons name={icon} size={56} color={Colors.textMuted} />
      <Text className="text-[20px] font-semibold text-text-primary text-center">{title}</Text>
      {subtitle && (
        <Text className="text-[15px] text-text-secondary text-center leading-6">{subtitle}</Text>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} variant="primary" style={{ marginTop: 8 }} />
      )}
    </View>
  );
}
