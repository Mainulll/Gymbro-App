import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../constants/theme';

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0-1
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  size = 80,
  strokeWidth = 8,
  progress,
  color = Colors.accent,
  backgroundColor = Colors.border,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
