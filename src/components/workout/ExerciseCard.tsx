import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { ActiveExercise, ExerciseVideo } from '../../types';
import { SetRow } from './SetRow';
import { useWorkoutStore } from '../../store/workoutStore';
import { MUSCLE_GROUP_LABELS } from '../../constants/exercises';

interface ExerciseCardProps {
  exercise: ActiveExercise;
  sessionId: string;
  previousSets?: { weightKg: number | null; reps: number | null }[];
  videos?: ExerciseVideo[];
  onShowRestTimer: () => void;
}

export function ExerciseCard({
  exercise,
  sessionId,
  previousSets = [],
  videos = [],
  onShowRestTimer,
}: ExerciseCardProps) {
  const { addSet, updateSet, completeSet, uncompleteSet, removeSet, removeExercise } =
    useWorkoutStore();
  const [showOptions, setShowOptions] = useState(false);

  const muscleLabel = MUSCLE_GROUP_LABELS[exercise.template.muscleGroup];

  async function handleComplete(setId: string) {
    const s = exercise.sets.find((st) => st.id === setId);
    if (!s) return;
    await completeSet(exercise.workoutExerciseId, setId);
    onShowRestTimer();
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.exerciseName}>{exercise.template.name}</Text>
          <Text style={styles.muscleLabel}>{muscleLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowOptions((v) => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Options dropdown */}
      {showOptions && (
        <View style={styles.optionsMenu}>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
              setShowOptions(false);
              router.push({
                pathname: '/camera/record',
                params: {
                  workoutExerciseId: exercise.workoutExerciseId,
                  exerciseName: exercise.template.name,
                },
              });
            }}
          >
            <Ionicons name="videocam-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.optionText}>Record Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionItem, styles.optionDanger]}
            onPress={() => {
              setShowOptions(false);
              removeExercise(exercise.workoutExerciseId);
            }}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text style={[styles.optionText, styles.optionDangerText]}>Remove Exercise</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Column headers */}
      <View style={styles.columnHeaders}>
        <Text style={[styles.colHeader, { width: 32 }]}>Set</Text>
        <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>Previous</Text>
        <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>Weight</Text>
        <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>Reps</Text>
        <Text style={[styles.colHeader, { width: 40, textAlign: 'center' }]}></Text>
      </View>

      {/* Sets */}
      {exercise.sets.map((set, i) => (
        <SetRow
          key={set.id}
          set={set}
          previousWeight={previousSets[i]?.weightKg}
          previousReps={previousSets[i]?.reps}
          onWeightChange={(val) =>
            updateSet(exercise.workoutExerciseId, set.id, { weightKg: val })
          }
          onRepsChange={(val) =>
            updateSet(exercise.workoutExerciseId, set.id, { reps: val })
          }
          onComplete={() => handleComplete(set.id)}
          onUncomplete={() => uncompleteSet(exercise.workoutExerciseId, set.id)}
          onDelete={() => removeSet(exercise.workoutExerciseId, set.id)}
          onToggleWarmup={() =>
            updateSet(exercise.workoutExerciseId, set.id, { isWarmup: !set.isWarmup })
          }
        />
      ))}

      {/* Add Set */}
      <TouchableOpacity
        style={styles.addSetBtn}
        onPress={() => addSet(exercise.workoutExerciseId)}
      >
        <Ionicons name="add" size={16} color={Colors.accent} />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>

      {/* Video thumbnails */}
      {videos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.videosRow}
          contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.base }}
        >
          {videos.map((v) => (
            <TouchableOpacity key={v.id} style={styles.videoThumb}>
              {v.thumbnailUri ? (
                <Image source={{ uri: v.thumbnailUri }} style={styles.thumbImage} />
              ) : (
                <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
                  <Ionicons name="play-circle" size={24} color={Colors.accent} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Record video button */}
      <TouchableOpacity
        style={styles.recordBtn}
        onPress={() =>
          router.push({
            pathname: '/camera/record',
            params: {
              workoutExerciseId: exercise.workoutExerciseId,
              exerciseName: exercise.template.name,
            },
          })
        }
      >
        <Ionicons name="videocam-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.recordText}>Record exercise</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  headerLeft: { flex: 1, gap: 2 },
  exerciseName: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  muscleLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.accent,
    fontWeight: '500',
  },
  optionsMenu: {
    backgroundColor: Colors.surfaceElevated,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.xs,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  optionDanger: {},
  optionText: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
  },
  optionDangerText: { color: Colors.danger },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  colHeader: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    margin: Spacing.base,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentMuted,
    borderWidth: 1,
    borderColor: Colors.accentMuted,
    borderStyle: 'dashed',
  },
  addSetText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  },
  videosRow: {
    marginBottom: Spacing.xs,
  },
  videoThumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
  },
  thumbPlaceholder: {
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  recordText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },
});
