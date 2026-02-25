import React, { forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: ViewStyle;
  compact?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, hint, error, containerStyle, compact = false, style, ...props },
  ref,
) {
  return (
    <View className="gap-1" style={containerStyle}>
      {label && (
        <Text className="text-[13px] text-text-secondary font-medium" style={{ marginBottom: 2 }}>
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
        className={[
          'bg-surface-elevated rounded-xl border px-3 text-[15px] text-text-primary',
          error ? 'border-danger' : 'border-border',
          compact ? 'min-h-[38px]' : 'min-h-[48px]',
        ].join(' ')}
        style={[{ paddingVertical: compact ? 8 : 12 }, style]}
        placeholderTextColor={Colors.textMuted}
        keyboardAppearance="dark"
        {...props}
      />
      {error ? (
        <Text className="text-[13px] text-danger">{error}</Text>
      ) : hint ? (
        <Text className="text-[13px] text-text-muted">{hint}</Text>
      ) : null}
    </View>
  );
});

// Compact numeric stepper input for weight/reps
interface NumericInputProps {
  value: string;
  onChangeText: (val: string) => void;
  placeholder?: string;
  style?: TextStyle;
}

export function NumericInput({ value, onChangeText, placeholder = '0', style }: NumericInputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      keyboardType="decimal-pad"
      keyboardAppearance="dark"
      textAlign="center"
      selectTextOnFocus
      className="bg-surface-elevated rounded-lg border border-border text-[17px] font-semibold text-text-primary text-center min-w-[64px] min-h-[44px]"
      style={[{ paddingHorizontal: 8, paddingVertical: 8 }, style]}
    />
  );
}
