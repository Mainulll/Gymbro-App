import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { ActiveExercise, ExerciseVideo } from '../../types';
import { SetRow } from './SetRow';
import { useWorkoutStore } from '../../store/workoutStore';
import { MUSCLE_GROUP_LABELS } from '../../constants/exercises';

const { width: SCREEN_W } = Dimensions.get('window');

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
  const [playingVideo, setPlayingVideo] = useState<ExerciseVideo | null>(null);

  const muscleLabel = MUSCLE_GROUP_LABELS[exercise.template.muscleGroup];

  // Group videos by setId for per-set display
  const videosBySet = new Map<string, ExerciseVideo[]>();
  const unlinkedVideos: ExerciseVideo[] = [];
  for (const v of videos) {
    if (v.setId) {
      const list = videosBySet.get(v.setId) ?? [];
      list.push(v);
      videosBySet.set(v.setId, list);
    } else {
      unlinkedVideos.push(v);
    }
  }

  async function handleComplete(setId: string) {
    await completeSet(exercise.workoutExerciseId, setId);
    onShowRestTimer();
  }

  function openCameraForSet(setId: string) {
    router.push({
      pathname: '/camera/record',
      params: {
        workoutExerciseId: exercise.workoutExerciseId,
        exerciseName: exercise.template.name,
        setId,
      },
    });
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

      {/* Sets — each one may have an attached video */}
      {exercise.sets.map((set, i) => {
        const setVideos = videosBySet.get(set.id) ?? [];
        return (
          <View key={set.id}>
            <View style={styles.setRowWrapper}>
              <View style={{ flex: 1 }}>
                <SetRow
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
              </View>
              {/* Per-set camera icon */}
              <TouchableOpacity
                style={styles.setVideoBtn}
                onPress={() => openCameraForSet(set.id)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Ionicons
                  name={setVideos.length > 0 ? 'videocam' : 'videocam-outline'}
                  size={16}
                  color={setVideos.length > 0 ? Colors.accent : Colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Inline video thumbnails for this set */}
            {setVideos.length > 0 && (
              <View style={styles.setVideosRow}>
                {setVideos.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.setVideoThumb}
                    onPress={() => setPlayingVideo(v)}
                  >
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="play-circle" size={22} color={Colors.accent} />
                    </View>
                    <Text style={styles.thumbDuration}>{Math.round(v.durationSeconds)}s</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}

      {/* Add Set */}
      <TouchableOpacity
        style={styles.addSetBtn}
        onPress={() => addSet(exercise.workoutExerciseId)}
      >
        <Ionicons name="add" size={16} color={Colors.accent} />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>

      {/* Unlinked exercise-level videos */}
      {unlinkedVideos.length > 0 && (
        <View style={styles.unlinkedVideos}>
          <Text style={styles.unlinkedLabel}>Exercise Videos</Text>
          <View style={styles.videoRow}>
            {unlinkedVideos.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={styles.setVideoThumb}
                onPress={() => setPlayingVideo(v)}
              >
                <View style={styles.thumbPlaceholder}>
                  <Ionicons name="play-circle" size={22} color={Colors.accent} />
                </View>
                <Text style={styles.thumbDuration}>{Math.round(v.durationSeconds)}s</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Video player modal */}
      {playingVideo && (
        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </View>
  );
}

// ─── Video Player Modal ───────────────────────────────────────────────────────

function VideoPlayerModal({
  video,
  onClose,
}: {
  video: ExerciseVideo;
  onClose: () => void;
}) {
  const player = useVideoPlayer(video.localUri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={modalStyles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={modalStyles.container}>
          <VideoView
            player={player}
            style={modalStyles.video}
            contentFit="contain"
            nativeControls
          />
          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
            <Ionicons name="close-circle" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
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
  setRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.sm,
  },
  setVideoBtn: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  setVideosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xs,
  },
  setVideoThumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbDuration: {
    fontSize: 9,
    color: Colors.textMuted,
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
  unlinkedVideos: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  unlinkedLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  videoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: SCREEN_W - Spacing.base * 2,
    aspectRatio: 9 / 16,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
});
