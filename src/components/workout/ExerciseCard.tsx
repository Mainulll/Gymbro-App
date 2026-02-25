import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors } from '../../constants/theme';
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
    <View
      className="bg-surface-elevated rounded-2xl border overflow-hidden mb-3"
      style={{
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Header */}
      <View className="flex-row items-start justify-between p-4 pb-2">
        <View className="flex-1" style={{ gap: 2 }}>
          <Text className="text-[17px] font-bold text-text-primary">{exercise.template.name}</Text>
          <Text className="text-[13px] text-accent font-medium">{muscleLabel}</Text>
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
        <View className="bg-surface-elevated border-t border-b border-border py-1">
          <TouchableOpacity
            className="flex-row items-center gap-2 px-4 py-2"
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
            <Text className="text-[15px] text-text-secondary">Record Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center gap-2 px-4 py-2"
            onPress={() => {
              setShowOptions(false);
              removeExercise(exercise.workoutExerciseId);
            }}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text className="text-[15px] text-danger">Remove Exercise</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Column headers */}
      <View className="flex-row items-center px-4 pb-1 gap-1">
        <Text
          className="text-[11px] font-semibold text-text-muted uppercase"
          style={{ letterSpacing: 0.5, width: 32 }}
        >
          Set
        </Text>
        <Text
          className="text-[11px] font-semibold text-text-muted uppercase text-center flex-1"
          style={{ letterSpacing: 0.5 }}
        >
          Previous
        </Text>
        <Text
          className="text-[11px] font-semibold text-text-muted uppercase text-center flex-1"
          style={{ letterSpacing: 0.5 }}
        >
          Weight
        </Text>
        <Text
          className="text-[11px] font-semibold text-text-muted uppercase text-center flex-1"
          style={{ letterSpacing: 0.5 }}
        >
          Reps
        </Text>
        <Text
          className="text-[11px] font-semibold text-text-muted uppercase text-center"
          style={{ letterSpacing: 0.5, width: 40 }}
        />
      </View>

      {/* Sets — each one may have an attached video */}
      {exercise.sets.map((set, i) => {
        const setVideos = videosBySet.get(set.id) ?? [];
        return (
          <View key={set.id}>
            <View className="flex-row items-center pr-2">
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
                className="items-center justify-center py-2"
                style={{ width: 28 }}
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
              <View className="flex-row flex-wrap gap-1 px-4 pb-1">
                {setVideos.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    className="rounded-lg overflow-hidden bg-surface-elevated items-center justify-center border border-border"
                    style={{ width: 56, height: 56, gap: 2 }}
                    onPress={() => setPlayingVideo(v)}
                  >
                    <View className="items-center justify-center">
                      <Ionicons name="play-circle" size={22} color={Colors.accent} />
                    </View>
                    <Text className="text-[9px] text-text-muted">{Math.round(v.durationSeconds)}s</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}

      {/* Add Set */}
      <TouchableOpacity
        className="flex-row items-center justify-center gap-1 rounded-xl border border-dashed"
        style={{
          margin: 16, marginTop: 8, paddingVertical: 8,
          backgroundColor: Colors.accentMuted, borderColor: Colors.accentMuted,
        }}
        onPress={() => addSet(exercise.workoutExerciseId)}
      >
        <Ionicons name="add" size={16} color={Colors.accent} />
        <Text className="text-[13px] font-semibold text-accent">Add Set</Text>
      </TouchableOpacity>

      {/* Unlinked exercise-level videos */}
      {unlinkedVideos.length > 0 && (
        <View className="px-4 pb-2 gap-1">
          <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
            Exercise Videos
          </Text>
          <View className="flex-row flex-wrap gap-1">
            {unlinkedVideos.map((v) => (
              <TouchableOpacity
                key={v.id}
                className="rounded-lg overflow-hidden bg-surface-elevated items-center justify-center border border-border"
                style={{ width: 56, height: 56, gap: 2 }}
                onPress={() => setPlayingVideo(v)}
              >
                <View className="items-center justify-center">
                  <Ionicons name="play-circle" size={22} color={Colors.accent} />
                </View>
                <Text className="text-[9px] text-text-muted">{Math.round(v.durationSeconds)}s</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Video player modal */}
      {playingVideo && (
        <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
      )}
    </View>
  );
}

// ─── Video Player Modal ───────────────────────────────────────────────────────

function VideoPlayerModal({ video, onClose }: { video: ExerciseVideo; onClose: () => void }) {
  const player = useVideoPlayer(video.localUri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      >
        <TouchableOpacity className="absolute inset-0" onPress={onClose} activeOpacity={1} />
        <View
          style={{
            width: SCREEN_W - 32,
            aspectRatio: 9 / 16,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#000',
          }}
        >
          <VideoView player={player} className="flex-1" contentFit="contain" nativeControls />
          <TouchableOpacity className="absolute" style={{ top: 12, right: 12 }} onPress={onClose}>
            <Ionicons name="close-circle" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
