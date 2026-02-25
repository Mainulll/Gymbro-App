import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { formatDuration } from '../../utils/date';
import { ProgressRing } from '../ui/ProgressRing';

interface RestTimerProps {
  visible: boolean;
  durationSeconds: number;
  onDismiss: () => void;
}

export function RestTimer({ visible, durationSeconds, onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) {
      setRemaining(durationSeconds);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setRemaining(durationSeconds);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(onDismiss, 500);
          return 0;
        }
        if ((prev - 1) % 30 === 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, durationSeconds]);

  const progress = remaining / durationSeconds;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onDismiss}
    >
      <View
        className="flex-1 justify-end px-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingBottom: 100 }}
      >
        <View className="bg-surface rounded-[20px] p-6 items-center gap-5 border border-border">
          <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-[1px]">
            Rest Timer
          </Text>

          <ProgressRing size={120} strokeWidth={8} progress={progress} color={Colors.accent}>
            <Text
              className="text-[24px] font-bold text-text-primary"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatDuration(remaining)}
            </Text>
          </ProgressRing>

          <View className="flex-row gap-3 items-center">
            <TouchableOpacity
              className="px-4 py-2 rounded-xl bg-surface-elevated border border-border"
              onPress={() => setRemaining((r) => r + 15)}
            >
              <Text className="text-[13px] font-semibold text-text-secondary">+15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center gap-1 px-4 py-2 rounded-xl bg-accent"
              onPress={onDismiss}
            >
              <Text className="text-[13px] font-semibold text-text-primary">Skip</Text>
              <Ionicons name="play-skip-forward" size={16} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
