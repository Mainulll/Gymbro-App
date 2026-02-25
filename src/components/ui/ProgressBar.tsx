import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Colors } from '../../constants/theme';

interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  backgroundColor?: string;
  height?: number;
  label?: string;
  valueLabel?: string;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  color = Colors.accent,
  backgroundColor = Colors.border,
  height = 6,
  label,
  valueLabel,
  style,
}: ProgressBarProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View style={style}>
      {(label || valueLabel) && (
        <View className="flex-row justify-between mb-1">
          {label && <Text className="text-[13px] text-text-secondary font-medium">{label}</Text>}
          {valueLabel && <Text className="text-[13px] text-text-secondary">{valueLabel}</Text>}
        </View>
      )}
      <View
        style={{
          backgroundColor,
          height,
          borderRadius: height / 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            backgroundColor: color,
            width: `${clampedProgress * 100}%`,
            height,
            borderRadius: height / 2,
          }}
        />
      </View>
    </View>
  );
}
