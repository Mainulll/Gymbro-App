import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { BlurView } from 'expo-blur';
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
import { Colors, Typography, Spacing, Radius, SCROLL_BOTTOM_PADDING } from '../../src/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { getDatabase } from '../../src/db';
import { getLastSetDataForExercise } from '../../src/db/queries/sets';
import { getVideosForExercise } from '../../src/db/queries/videos';
import { ExerciseVideo } from '../../src/types';
import { generateId } from '../../src/utils/uuid';
import { createProgressPhoto } from '../../src/db/queries/photos';
import { formatDateISO } from '../../src/utils/date';
import * as ImagePicker from 'expo-image-picker';

export default function WorkoutScreen() {
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const { finishWorkout, discardWorkout, renameWorkout } = useWorkoutStore();
  const restTimerSeconds = useSettingsStore((s) => s.settings.restTimerSeconds);

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [prevSetsMap, setPrevSetsMap] = useState<Record<string, { weightKg: number | null; reps: number | null }[]>>({});
  const [videosMap, setVideosMap] = useState<Record<string, ExerciseVideo[]>>({});

  // Always keep a ref to the latest loadPreviousData to avoid stale closures
  const loadDataRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!activeWorkout) return;
    loadDataRef.current();
  }, [activeWorkout?.exercises.length]);

  // Reload videos when returning from camera — uses ref so it always sees latest exercises
  useFocusEffect(
    useCallback(() => {
      loadDataRef.current();
    }, []),
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

  // Update ref whenever loadPreviousData is redefined (every render)
  loadDataRef.current = loadPreviousData;

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
        <View style={{ paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl }}>
          <TouchableOpacity
            onPress={() => router.push('/workout/new')}
            style={{ borderRadius: Radius.lg, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bigStartBtn}
            >
              <Ionicons name="barbell" size={22} color="white" />
              <Text style={styles.bigStartBtnText}>Start New Workout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  async function promptProgressPhoto(workoutId: string) {
    Alert.alert(
      '📸 Progress Photo',
      'Want to snap a progress photo to track your physique?',
      [
        {
          text: 'Skip',
          style: 'cancel',
          onPress: () => router.push(`/workout/${workoutId}`),
        },
        {
          text: 'Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera access is required for progress photos.');
              router.push(`/workout/${workoutId}`);
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: 'images',
              quality: 0.8,
              allowsEditing: false,
            });
            if (!result.canceled && result.assets[0]) {
              const db = await getDatabase();
              await createProgressPhoto(db, {
                id: generateId(),
                date: formatDateISO(new Date()),
                localUri: result.assets[0].uri,
                workoutSessionId: workoutId,
                notes: '',
                createdAt: new Date().toISOString(),
              });
            }
            router.push(`/workout/${workoutId}`);
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Photo library access is required.');
              router.push(`/workout/${workoutId}`);
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: 'images',
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const db = await getDatabase();
              await createProgressPhoto(db, {
                id: generateId(),
                date: formatDateISO(new Date()),
                localUri: result.assets[0].uri,
                workoutSessionId: workoutId,
                notes: '',
                createdAt: new Date().toISOString(),
              });
            }
            router.push(`/workout/${workoutId}`);
          },
        },
      ],
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
            if (id) promptProgressPhoto(id);
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
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.bottomBarInner}>
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
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.finishGrad}
            >
              <Text style={styles.finishText}>Finish</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  bottomBarInner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.base,
    paddingBottom: Spacing.lg,
  },
  addExerciseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  addExerciseText: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  finishBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  finishGrad: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishText: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bigStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
  },
  bigStartBtnText: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: 'white',
  },
});
