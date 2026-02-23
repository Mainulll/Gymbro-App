import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';

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
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
      </Animated.View>

      {/* Tap-to-dismiss */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavContainer}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            snapHeight !== 'auto' && { height: snapHeight },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Top glass highlight */}
          <LinearGradient
            colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.01)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.glassHighlight}
            pointerEvents="none"
          />

          <View style={styles.handle} />

          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.doneBtn}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingBottom: 40,
    overflow: 'hidden',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  doneBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.sm,
  },
  doneBtnText: {
    fontSize: Typography.sizes.sm,
    color: Colors.accentLight,
    fontWeight: '700',
  },
  content: {
    padding: Spacing.base,
  },
});
