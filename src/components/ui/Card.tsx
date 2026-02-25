import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing } from '../../constants/theme';

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
      <View
        className="rounded-2xl border border-[rgba(255,255,255,0.12)] overflow-hidden"
        style={[
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 5,
          },
          accent ? { borderLeftColor: accent, borderLeftWidth: 2 } : null,
          style,
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.03)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1.5 }}
          style={{ borderRadius: 16, padding }}
        >
          {children}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      className={[
        'rounded-2xl border',
        elevated ? 'bg-surface-elevated border-[rgba(255,255,255,0.07)]' : 'bg-surface border-border',
      ].join(' ')}
      style={[accent ? { borderLeftColor: accent, borderLeftWidth: 2 } : null, { padding }, style]}
    >
      {children}
    </View>
  );
}
