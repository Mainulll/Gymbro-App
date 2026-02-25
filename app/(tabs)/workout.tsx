import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { ExerciseCard } from '../../src/components/workout/ExerciseCard';
import { WorkoutTimer } from '../../src/components/workout/WorkoutTimer';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Colors, TAB_BAR_HEIGHT, TAB_BAR_HEIGHT_ANDROID } from '../../src/constants/theme';
import { getDatabase } from '../../src/db';
import { getLastSetDataForExercise } from '../../src/db/queries/sets';
import { getVideosForExercise } from '../../src/db/queries/videos';
import { ExerciseVideo } from '../../src/types';

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const bottomBarBottom = Platform.OS === 'ios'
    ? TAB_BAR_HEIGHT
    : TAB_BAR_HEIGHT_ANDROID + insets.bottom;

  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const { finishWorkout, discardWorkout, renameWorkout } = useWorkoutStore();
  const restTimerSeconds = useSettingsStore((s) => s.settings.restTimerSeconds);

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [prevSetsMap, setPrevSetsMap] = useState<Record<string, { weightKg: number | null; reps: number | null }[]>>({});
  const [videosMap, setVideosMap] = useState<Record<string, ExerciseVideo[]>>({});

  const loadDataRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!activeWorkout) return;
    loadDataRef.current();
  }, [activeWorkout?.exercises.length]);

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
      const prev = await getLastSetDataForExercise(db, ex.template.id, activeWorkout.sessionId);
      newPrevSets[ex.workoutExerciseId] = prev;
      const vids = await getVideosForExercise(db, ex.workoutExerciseId);
      newVideos[ex.workoutExerciseId] = vids;
    }

    setPrevSetsMap(newPrevSets);
    setVideosMap(newVideos);
  }

  loadDataRef.current = loadPreviousData;

  if (!activeWorkout) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View
          className="px-4 py-3"
          style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.border }}
        >
          <Text className="text-[24px] font-bold text-text-primary">Workout</Text>
        </View>
        <EmptyState
          icon="barbell-outline"
          title="No Active Workout"
          subtitle="Start a workout to begin tracking your sets and reps."
        />
        <View
          className="px-4"
          style={{
            paddingBottom:
              Platform.OS === 'ios' ? TAB_BAR_HEIGHT + 16 : TAB_BAR_HEIGHT_ANDROID + 16,
          }}
        >
          <TouchableOpacity
            className="rounded-2xl overflow-hidden"
            onPress={() => router.push('/workout/new')}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20, borderRadius: 16 }}
            >
              <Ionicons name="barbell" size={22} color="white" />
              <Text className="text-[17px] font-bold text-white">Start New Workout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
            if (id) router.push(`/workout/complete?id=${id}`);
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
        { text: 'Discard', style: 'destructive', onPress: discardWorkout },
      ],
    );
  }

  function handleSaveName() {
    if (nameInput.trim()) renameWorkout(nameInput.trim());
    setEditingName(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4 py-3 gap-2"
        style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.border }}
      >
        <TouchableOpacity
          onPress={handleDiscard}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>

        {editingName ? (
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            onBlur={handleSaveName}
            onSubmitEditing={handleSaveName}
            autoFocus
            className="flex-1 text-[17px] font-bold text-text-primary text-center"
            style={{ borderBottomWidth: 1, borderBottomColor: Colors.accent, paddingBottom: 2 }}
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
            <Text className="text-[17px] font-bold text-text-primary text-center" numberOfLines={1}>
              {activeWorkout.name}
            </Text>
          </TouchableOpacity>
        )}

        <WorkoutTimer startedAt={activeWorkout.startedAt} />
      </View>

      {/* Exercise list */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={100}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {activeWorkout.exercises.length === 0 ? (
            <View className="items-center pt-12 gap-2">
              <Text className="text-[20px] font-semibold text-text-secondary">No exercises yet</Text>
              <Text className="text-[15px] text-text-muted text-center">
                Tap "Add Exercise" below to get started
              </Text>
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
          <View style={{ height: bottomBarBottom + 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating bottom bar */}
      <View
        className="absolute left-0 right-0 overflow-hidden"
        style={{
          bottom: bottomBarBottom,
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(255,255,255,0.10)',
          zIndex: 50,
        }}
      >
        <BlurView
          intensity={40}
          tint="dark"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="flex-row gap-2 p-4 pb-5">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-1 rounded-xl py-3 border border-[rgba(255,255,255,0.10)]"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            onPress={() =>
              router.push({
                pathname: '/exercise/select',
                params: { sessionId: activeWorkout.sessionId },
              })
            }
          >
            <Ionicons name="add" size={20} color={Colors.textPrimary} />
            <Text className="text-[15px] font-semibold text-text-primary">Add Exercise</Text>
          </TouchableOpacity>

          <TouchableOpacity className="rounded-xl overflow-hidden" onPress={handleFinish}>
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className="text-[15px] font-bold text-text-primary">Finish</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <RestTimer
        visible={showRestTimer}
        durationSeconds={restTimerSeconds}
        onDismiss={() => setShowRestTimer(false)}
      />
    </SafeAreaView>
  );
}
