import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../src/db';
import { getWorkoutSession, getWorkoutExercises } from '../../src/db/queries/workouts';
import { getSetsForExercise } from '../../src/db/queries/sets';
import { getVideosForExercise } from '../../src/db/queries/videos';
import { WorkoutSession, WorkoutExercise, WorkoutSet, ExerciseVideo } from '../../src/types';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Divider } from '../../src/components/ui/Divider';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { formatDisplayDate, formatDurationMinutes, formatTime } from '../../src/utils/date';
import { formatVolume } from '../../src/constants/units';
import { useSettingsStore } from '../../src/store/settingsStore';
import { toDisplayWeightNumber } from '../../src/constants/units';

type ExerciseWithSets = WorkoutExercise & { sets: WorkoutSet[]; videos: ExerciseVideo[] };

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useSettingsStore((s) => s.settings.weightUnit);

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);

  useEffect(() => {
    if (id) loadWorkout(id);
  }, [id]);

  async function loadWorkout(workoutId: string) {
    const db = await getDatabase();
    const [sess, exs] = await Promise.all([
      getWorkoutSession(db, workoutId),
      getWorkoutExercises(db, workoutId),
    ]);
    if (!sess) return;

    const enriched = await Promise.all(
      exs.map(async (ex) => {
        const sets = await getSetsForExercise(db, ex.id);
        const videos = await getVideosForExercise(db, ex.id);
        return { ...ex, sets, videos };
      }),
    );

    setSession(sess);
    setExercises(enriched);
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  const completedSets = exercises.flatMap((e) => e.sets.filter((s) => s.isCompleted));
  const totalReps = completedSets.reduce((acc, s) => acc + (s.reps ?? 0), 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: session.name || 'Workout',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Summary card */}
          <Card style={styles.summaryCard}>
            <Text style={styles.workoutTitle}>{session.name || 'Workout'}</Text>
            <Text style={styles.workoutDate}>
              {formatDisplayDate(session.startedAt)} · {formatTime(session.startedAt)}
            </Text>

            <View style={styles.statsGrid}>
              <StatBox label="Duration" value={formatDurationMinutes(session.durationSeconds)} />
              <StatBox label="Exercises" value={String(exercises.length)} />
              <StatBox label="Sets" value={String(completedSets.length)} />
              <StatBox label="Volume" value={formatVolume(session.totalVolumeKg, unit)} />
            </View>
          </Card>

          {/* Exercises */}
          {exercises.map((ex) => {
            const workingSets = ex.sets.filter((s) => !s.isWarmup && s.isCompleted);
            return (
              <Card key={ex.id} style={styles.exerciseCard}>
                <View style={styles.exHeader}>
                  <Text style={styles.exName}>{ex.exerciseName}</Text>
                  <Badge label={ex.muscleGroup.replace('_', ' ')} variant="accent" />
                </View>

                {/* Set table */}
                <View style={styles.setTable}>
                  <View style={styles.setHeaderRow}>
                    <Text style={[styles.setCell, styles.setColNum]}>Set</Text>
                    <Text style={[styles.setCell, { flex: 1 }]}>Weight</Text>
                    <Text style={[styles.setCell, { flex: 1 }]}>Reps</Text>
                    <Text style={[styles.setCell, { flex: 1 }]}>Volume</Text>
                  </View>
                  <Divider />
                  {ex.sets.map((s) => {
                    const displayW = toDisplayWeightNumber(s.weightKg, unit);
                    const volume = s.weightKg && s.reps
                      ? toDisplayWeightNumber(s.weightKg * s.reps, unit)
                      : null;
                    return (
                      <View key={s.id} style={styles.setRow}>
                        <Text style={[styles.setCell, styles.setColNum, s.isWarmup && styles.warmupLabel]}>
                          {s.isWarmup ? 'W' : s.setNumber}
                        </Text>
                        <Text style={[styles.setCell, { flex: 1 }]}>
                          {displayW != null ? `${displayW} ${unit}` : '—'}
                        </Text>
                        <Text style={[styles.setCell, { flex: 1 }]}>
                          {s.reps ?? '—'}
                        </Text>
                        <Text style={[styles.setCell, { flex: 1 }]}>
                          {volume != null ? `${volume} ${unit}` : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  summaryCard: { gap: Spacing.md },
  workoutTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  workoutDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: -Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  exerciseCard: { gap: Spacing.md },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  exName: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  setTable: { gap: 2 },
  setHeaderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: 2,
  },
  setRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  setCell: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  setColNum: {
    width: 28,
    fontWeight: '700',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  warmupLabel: { color: Colors.warning },
});
