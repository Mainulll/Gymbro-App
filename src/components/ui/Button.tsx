import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-accent',
  secondary: 'bg-surface-elevated border border-border',
  ghost: 'bg-transparent',
  danger: 'bg-danger/15 border border-danger',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'px-3 min-h-[32px]',
  md: 'px-5 min-h-[44px]',
  lg: 'px-6 min-h-[52px]',
};

const VARIANT_TEXT_CLASS: Record<ButtonVariant, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  ghost: 'text-accent',
  danger: 'text-danger',
};

const SIZE_TEXT_CLASS: Record<ButtonSize, string> = {
  sm: 'text-[13px]',
  md: 'text-[15px]',
  lg: 'text-[17px]',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      className={[
        'flex-row items-center justify-center rounded-xl',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        fullWidth ? 'w-full' : '',
        disabled || loading ? 'opacity-40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.textPrimary : Colors.accent}
          size="small"
        />
      ) : (
        <Text
          className={[
            'font-semibold tracking-[0.2px]',
            VARIANT_TEXT_CLASS[variant],
            SIZE_TEXT_CLASS[size],
          ].join(' ')}
          style={textStyle}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
