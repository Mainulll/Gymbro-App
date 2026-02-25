import React from 'react';
import { View, ViewStyle } from 'react-native';

interface DividerProps {
  style?: ViewStyle;
  inset?: number;
}

export function Divider({ style, inset = 0 }: DividerProps) {
  return (
    <View
      className="bg-border my-1"
      style={[{ height: 0.5 }, inset > 0 && { marginLeft: inset }, style]}
    />
  );
}
