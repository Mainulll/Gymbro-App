import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { Colors } from '../../src/constants/theme';

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
      <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
        <View className="flex-1 p-4 gap-3">
          <View className="items-center gap-2 pt-6">
            <Ionicons name="barbell" size={40} color={Colors.accent} />
            <Text className="text-[20px] font-bold text-text-primary">Workout In Progress</Text>
            <Text className="text-[15px] text-accent font-medium">{activeWorkout.name}</Text>
          </View>
          <TouchableOpacity
            className="bg-accent rounded-xl py-4 items-center mt-6"
            onPress={() => router.back()}
          >
            <Text className="text-[15px] font-bold text-text-primary">Resume Workout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      <View className="flex-1 p-4 gap-3">
        {/* Name input */}
        <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-[0.8px] mt-2">
          Workout Name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push Day, Leg Day..."
          placeholderTextColor={Colors.textMuted}
          className="bg-surface-elevated rounded-xl border border-border px-4 text-[17px] text-text-primary min-h-[50px]"
          style={{ paddingVertical: 12 }}
          keyboardAppearance="dark"
          returnKeyType="done"
        />

        {/* Quick names */}
        <Text className="text-[13px] font-semibold text-text-secondary uppercase tracking-[0.8px] mt-2">
          Quick Start
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {QUICK_NAMES.map((n) => (
            <TouchableOpacity
              key={n}
              className="px-3 py-2 rounded-xl bg-surface-elevated border border-border"
              onPress={() => handleStart(n)}
            >
              <Text className="text-[13px] font-semibold text-text-secondary">{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Start empty */}
        <TouchableOpacity
          className="flex-row items-center justify-center gap-2 bg-accent rounded-xl py-4 mt-auto"
          onPress={() => handleStart()}
          disabled={loading}
        >
          <Ionicons name="add-circle" size={20} color={Colors.textPrimary} />
          <Text className="text-[15px] font-bold text-text-primary">Start Empty Workout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
