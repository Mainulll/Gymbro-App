import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { getDatabase } from '../../src/db';
import { getWorkoutSession, getWorkoutExercises } from '../../src/db/queries/workouts';
import { getSetsForExercise } from '../../src/db/queries/sets';
import { getVideosForExercise } from '../../src/db/queries/videos';
import { getProgressPhotosForWorkout } from '../../src/db/queries/photos';
import { WorkoutSession, WorkoutExercise, WorkoutSet, ExerciseVideo, ProgressPhoto } from '../../src/types';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Divider } from '../../src/components/ui/Divider';
import { Colors } from '../../src/constants/theme';
import { formatDisplayDate, formatDurationMinutes, formatTime } from '../../src/utils/date';
import { formatVolume } from '../../src/constants/units';
import { useSettingsStore } from '../../src/store/settingsStore';
import { toDisplayWeightNumber } from '../../src/constants/units';

const SCREEN_WIDTH = Dimensions.get('window').width;

type ExerciseWithSets = WorkoutExercise & { sets: WorkoutSet[]; videos: ExerciseVideo[] };

/** Separate component so useVideoPlayer hook is called at top level per video */
function VideoPlayerModal({ uri, onClose }: { uri: string; onClose: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
      >
        <TouchableOpacity className="absolute inset-0" onPress={onClose} activeOpacity={1} />
        <VideoView
          player={player}
          style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * (9 / 16) }}
          allowsFullscreen
          allowsPictureInPicture={false}
          contentFit="contain"
        />
        <TouchableOpacity
          className="absolute"
          style={{ top: 60, right: 20 }}
          onPress={onClose}
        >
          <Ionicons name="close-circle" size={36} color="white" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useSettingsStore((s) => s.settings.weightUnit);

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [playingVideoUri, setPlayingVideoUri] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadWorkout(id);
  }, [id]);

  async function loadWorkout(workoutId: string) {
    const db = await getDatabase();
    const [sess, exs, p] = await Promise.all([
      getWorkoutSession(db, workoutId),
      getWorkoutExercises(db, workoutId),
      getProgressPhotosForWorkout(db, workoutId),
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
    setPhotos(p);
  }

  if (!session) {
    return (
      <View className="flex-1 bg-background">
        <Text className="text-text-secondary text-center mt-10">Loading...</Text>
      </View>
    );
  }

  const completedSets = exercises.flatMap((e) => e.sets.filter((s) => s.isCompleted));

  return (
    <>
      <Stack.Screen
        options={{
          title: session.name || 'Workout',
          headerBackTitle: '',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
        }}
      />
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
          {/* Summary card */}
          <Card style={{ gap: 12 }}>
            <Text className="text-[24px] font-bold text-text-primary">
              {session.name || 'Workout'}
            </Text>
            <Text className="text-[13px] text-text-secondary -mt-2">
              {formatDisplayDate(session.startedAt)} · {formatTime(session.startedAt)}
            </Text>

            <View className="flex-row gap-2">
              <StatBox label="Duration" value={formatDurationMinutes(session.durationSeconds)} />
              <StatBox label="Exercises" value={String(exercises.length)} />
              <StatBox label="Sets" value={String(completedSets.length)} />
              <StatBox label="Volume" value={formatVolume(session.totalVolumeKg, unit)} />
            </View>
          </Card>

          {/* Notes */}
          {session.notes ? (
            <Card style={{ gap: 8 }}>
              <View className="flex-row items-center gap-1">
                <Ionicons name="document-text-outline" size={16} color={Colors.textMuted} />
                <Text
                  className="text-[11px] font-bold text-text-muted uppercase"
                  style={{ letterSpacing: 0.5 }}
                >
                  Notes
                </Text>
              </View>
              <Text className="text-[15px] text-text-secondary" style={{ lineHeight: 22 }}>
                {session.notes}
              </Text>
            </Card>
          ) : null}

          {/* Progress photos */}
          {photos.length > 0 && (
            <View className="gap-2">
              <Text
                className="text-[11px] font-bold text-text-muted uppercase"
                style={{ letterSpacing: 0.5 }}
              >
                Progress Photos
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {photos.map((p) => (
                  <Image
                    key={p.id}
                    source={{ uri: p.localUri }}
                    style={{ width: 130, height: 170, borderRadius: 16, backgroundColor: Colors.surfaceElevated }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Exercises */}
          {exercises.map((ex) => (
            <Card key={ex.id} style={{ gap: 12 }}>
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-[17px] font-bold text-text-primary">
                  {ex.exerciseName}
                </Text>
                <Badge label={ex.muscleGroup.replace('_', ' ')} variant="accent" />
              </View>

              {/* Set table */}
              <View className="gap-0.5">
                <View className="flex-row gap-2 pb-0.5">
                  <Text
                    className="text-[13px] font-bold text-text-muted text-center"
                    style={{ width: 28 }}
                  >
                    Set
                  </Text>
                  <Text className="flex-1 text-[13px] text-text-secondary">Weight</Text>
                  <Text className="flex-1 text-[13px] text-text-secondary">Reps</Text>
                  <Text className="flex-1 text-[13px] text-text-secondary">Volume</Text>
                </View>
                <Divider />
                {ex.sets.map((s) => {
                  const displayW = toDisplayWeightNumber(s.weightKg, unit);
                  const volume =
                    s.weightKg && s.reps
                      ? toDisplayWeightNumber(s.weightKg * s.reps, unit)
                      : null;
                  return (
                    <View key={s.id} className="flex-row gap-2 py-1">
                      <Text
                        className={`text-[13px] font-bold text-center ${s.isWarmup ? 'text-warning' : 'text-text-muted'}`}
                        style={{ width: 28 }}
                      >
                        {s.isWarmup ? 'W' : s.setNumber}
                      </Text>
                      <Text className="flex-1 text-[13px] text-text-secondary">
                        {displayW != null ? `${displayW} ${unit}` : '—'}
                      </Text>
                      <Text className="flex-1 text-[13px] text-text-secondary">
                        {s.reps ?? '—'}
                      </Text>
                      <Text className="flex-1 text-[13px] text-text-secondary">
                        {volume != null ? `${volume} ${unit}` : '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Exercise videos */}
              {ex.videos.length > 0 && (
                <View className="gap-2">
                  <Text
                    className="text-[11px] font-bold text-text-muted uppercase"
                    style={{ letterSpacing: 0.5 }}
                  >
                    Recordings
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {ex.videos.map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        className="rounded-xl overflow-hidden"
                        style={{ width: 120, height: 90, backgroundColor: Colors.surfaceElevated }}
                        onPress={() => setPlayingVideoUri(v.localUri)}
                        activeOpacity={0.85}
                      >
                        {v.thumbnailUri ? (
                          <Image source={{ uri: v.thumbnailUri }} className="w-full h-full" />
                        ) : (
                          <View
                            className="w-full h-full"
                            style={{ backgroundColor: Colors.surfaceElevated }}
                          />
                        )}
                        <View
                          className="absolute inset-0 items-center justify-center"
                          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
                        >
                          <Ionicons name="play-circle" size={36} color="white" />
                        </View>
                        {v.durationSeconds > 0 && (
                          <View
                            className="absolute rounded"
                            style={{
                              bottom: 4,
                              right: 6,
                              backgroundColor: 'rgba(0,0,0,0.6)',
                              paddingHorizontal: 4,
                              paddingVertical: 1,
                            }}
                          >
                            <Text className="text-[11px] text-white font-semibold">
                              {Math.round(v.durationSeconds)}s
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Video player modal — only mounts when a video is selected */}
      {playingVideoUri && (
        <VideoPlayerModal uri={playingVideoUri} onClose={() => setPlayingVideoUri(null)} />
      )}
    </>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-surface-elevated rounded-xl p-3 items-center">
      <Text className="text-[20px] font-bold text-text-primary">{value}</Text>
      <Text className="text-[11px] text-text-muted mt-0.5">{label}</Text>
    </View>
  );
}
