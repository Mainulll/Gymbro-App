import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { ExerciseCard } from '../../src/components/workout/ExerciseCard';
import { WorkoutTimer } from '../../src/components/workout/WorkoutTimer';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Button } from '../../src/components/ui/Button';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { getDatabase } from '../../src/db';
import { getLastSetDataForExercise } from '../../src/db/queries/sets';
import { getVideosForExercise } from '../../src/db/queries/videos';
import { ExerciseVideo } from '../../src/types';

export default function WorkoutScreen() {
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const { finishWorkout, discardWorkout, renameWorkout } = useWorkoutStore();
  const restTimerSeconds = useSettingsStore((s) => s.settings.restTimerSeconds);

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [prevSetsMap, setPrevSetsMap] = useState<Record<string, { weightKg: number | null; reps: number | null }[]>>({});
  const [videosMap, setVideosMap] = useState<Record<string, ExerciseVideo[]>>({});

  useEffect(() => {
    if (!activeWorkout) return;
    loadPreviousData();
  }, [activeWorkout?.exercises.length]);

  // Reload videos when returning from camera screen
  useFocusEffect(
    useCallback(() => {
      if (activeWorkout) loadPreviousData();
    }, [activeWorkout?.sessionId]),
  );

  async function loadPreviousData() {
    if (!activeWorkout) return;
    const db = await getDatabase();
    const newPrevSets: typeof prevSetsMap = {};
    const newVideos: typeof videosMap = {};

    for (const ex of activeWorkout.exercises) {
      const prev = await getLastSetDataForExercise(
        db,
        ex.template.id,
        activeWorkout.sessionId,
      );
      newPrevSets[ex.workoutExerciseId] = prev;

      const vids = await getVideosForExercise(db, ex.workoutExerciseId);
      newVideos[ex.workoutExerciseId] = vids;
    }

    setPrevSetsMap(newPrevSets);
    setVideosMap(newVideos);
  }

  if (!activeWorkout) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.noWorkoutHeader}>
          <Text style={styles.headerTitle}>Workout</Text>
        </View>
        <EmptyState
          icon="barbell-outline"
          title="No Active Workout"
          subtitle="Start a workout to begin tracking your sets and reps."
          actionLabel="Start Workout"
          onAction={() => router.push('/workout/new')}
        />
      </SafeAreaView>
    );
  }

  async function handleFinish() {
    Alert.alert(
      'Finish Workout',
      'Are you done? This will save your workout.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          style: 'default',
          onPress: async () => {
            const id = await finishWorkout();
            if (id) router.push(`/workout/${id}`);
          },
        },
      ],
    );
  }

  async function handleDiscard() {
    Alert.alert(
      'Discard Workout',
      'All progress will be lost. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: discardWorkout,
        },
      ],
    );
  }

  function handleSaveName() {
    if (nameInput.trim()) renameWorkout(nameInput.trim());
    setEditingName(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDiscard} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>

        {editingName ? (
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            onBlur={handleSaveName}
            onSubmitEditing={handleSaveName}
            autoFocus
            style={styles.nameInput}
            placeholder="Workout name"
            placeholderTextColor={Colors.textMuted}
            keyboardAppearance="dark"
          />
        ) : (
          <TouchableOpacity
            onPress={() => {
              setNameInput(activeWorkout.name);
              setEditingName(true);
            }}
          >
            <Text style={styles.workoutName} numberOfLines={1}>
              {activeWorkout.name}
            </Text>
          </TouchableOpacity>
        )}

        <WorkoutTimer startedAt={activeWorkout.startedAt} />
      </View>

      {/* Exercise list */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {activeWorkout.exercises.length === 0 ? (
            <View style={styles.emptyExercises}>
              <Text style={styles.emptyText}>No exercises yet</Text>
              <Text style={styles.emptySubtext}>Tap "Add Exercise" below to get started</Text>
            </View>
          ) : (
            activeWorkout.exercises.map((ex) => (
              <ExerciseCard
                key={ex.workoutExerciseId}
                exercise={ex}
                sessionId={activeWorkout.sessionId}
                previousSets={prevSetsMap[ex.workoutExerciseId] ?? []}
                videos={videosMap[ex.workoutExerciseId] ?? []}
                onShowRestTimer={() => setShowRestTimer(true)}
              />
            ))
          )}

          {/* Bottom spacing for floating bar */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() =>
            router.push({
              pathname: '/exercise/select',
              params: { sessionId: activeWorkout.sessionId },
            })
          }
        >
          <Ionicons name="add" size={20} color={Colors.textPrimary} />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
          <Text style={styles.finishText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Rest Timer */}
      <RestTimer
        visible={showRestTimer}
        durationSeconds={restTimerSeconds}
        onDismiss={() => setShowRestTimer(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  noWorkoutHeader: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  workoutName: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  nameInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent,
    paddingBottom: 2,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.base,
  },
  emptyExercises: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: Typography.sizes.base,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.base,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  addExerciseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addExerciseText: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  finishBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishText: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
