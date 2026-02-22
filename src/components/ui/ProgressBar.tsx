import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Typography } from '../../constants/theme';

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
        <View style={styles.labelRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          {valueLabel && <Text style={styles.valueLabel}>{valueLabel}</Text>}
        </View>
      )}
      <View style={[styles.track, { backgroundColor, height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: `${clampedProgress * 100}%`,
              height,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  valueLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  track: { overflow: 'hidden' },
  fill: {},
});
