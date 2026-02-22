import React, { forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

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
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        ref={ref}
        style={[
          styles.input,
          compact && styles.compact,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={Colors.textMuted}
        keyboardAppearance="dark"
        {...props}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

// Compact numeric stepper input for weight/reps
interface NumericInputProps {
  value: string;
  onChangeText: (val: string) => void;
  placeholder?: string;
  style?: ViewStyle;
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
      style={[styles.numericInput, style]}
    />
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    minHeight: 48,
  },
  compact: {
    paddingVertical: Spacing.sm,
    minHeight: 38,
  },
  inputError: { borderColor: Colors.danger },
  error: { fontSize: Typography.sizes.sm, color: Colors.danger },
  hint: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  numericInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    minWidth: 64,
    minHeight: 44,
    textAlign: 'center',
  },
});
