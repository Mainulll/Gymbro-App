import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';

const QUICK_NAMES = [
  'Push Day', 'Pull Day', 'Leg Day', 'Upper Body',
  'Lower Body', 'Full Body', 'Chest & Triceps', 'Back & Biceps',
];

export default function NewWorkoutScreen() {
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleStart(workoutName?: string) {
    if (loading) return;
    setLoading(true);
    const finalName = workoutName ?? (name.trim() || 'Workout');
    await startWorkout(finalName);
    router.back();
    setLoading(false);
  }

  if (activeWorkout) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.activeInfo}>
            <Ionicons name="barbell" size={40} color={Colors.accent} />
            <Text style={styles.activeTitle}>Workout In Progress</Text>
            <Text style={styles.activeName}>{activeWorkout.name}</Text>
          </View>
          <TouchableOpacity style={styles.resumeBtn} onPress={() => router.back()}>
            <Text style={styles.resumeBtnText}>Resume Workout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* Name input */}
        <Text style={styles.sectionTitle}>Workout Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push Day, Leg Day..."
          placeholderTextColor={Colors.textMuted}
          style={styles.nameInput}
          keyboardAppearance="dark"
          returnKeyType="done"
        />

        {/* Quick names */}
        <Text style={styles.sectionTitle}>Quick Start</Text>
        <View style={styles.quickGrid}>
          {QUICK_NAMES.map((n) => (
            <TouchableOpacity
              key={n}
              style={styles.quickBtn}
              onPress={() => handleStart(n)}
            >
              <Text style={styles.quickBtnText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Start empty */}
        <TouchableOpacity
          style={styles.startEmptyBtn}
          onPress={() => handleStart()}
          disabled={loading}
        >
          <Ionicons name="add-circle" size={20} color={Colors.textPrimary} />
          <Text style={styles.startEmptyText}>Start Empty Workout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: {
    padding: Spacing.base,
    gap: Spacing.md,
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.sm,
  },
  nameInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.textPrimary,
    minHeight: 50,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  startEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    marginTop: 'auto',
  },
  startEmptyText: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  activeInfo: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xl,
  },
  activeTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  activeName: {
    fontSize: Typography.sizes.base,
    color: Colors.accent,
    fontWeight: '500',
  },
  resumeBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  resumeBtnText: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
