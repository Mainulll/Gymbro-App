import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapHeight?: number | 'auto';
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  snapHeight = 400,
}: BottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Blurred backdrop */}
      <Animated.View className="absolute inset-0" style={{ opacity: opacityAnim }}>
        <BlurView intensity={25} tint="dark" className="absolute inset-0" />
        <View className="absolute inset-0 bg-[rgba(0,0,0,0.55)]" />
      </Animated.View>

      {/* Tap-to-dismiss */}
      <Animated.View className="absolute inset-0" style={{ opacity: opacityAnim }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="absolute inset-0" />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end"
        style={{ pointerEvents: 'box-none' } as any}
      >
        <Animated.View
          className="bg-surface rounded-t-3xl border border-[rgba(255,255,255,0.12)] overflow-hidden pb-10"
          style={[
            snapHeight !== 'auto' ? { height: snapHeight } : null,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Top glass highlight */}
          <LinearGradient
            colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.01)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 90,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
            pointerEvents="none"
          />

          {/* Handle */}
          <View
            className="w-10 self-center mt-3 mb-2 rounded-[2px] bg-[rgba(255,255,255,0.25)]"
            style={{ height: 4 }}
          />

          {title && (
            <View
              className="flex-row items-center justify-between px-4 pb-3"
              style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)' }}
            >
              <Text className="text-[17px] font-bold text-text-primary tracking-[-0.3px]">
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="px-2 bg-accent/18 rounded-lg"
                style={{ paddingVertical: 4 }}
              >
                <Text className="text-[13px] text-accent-light font-bold">Done</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16 }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
