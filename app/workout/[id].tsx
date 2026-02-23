import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
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
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
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
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <VideoView
          player={player}
          style={modalStyles.video}
          allowsFullscreen
          allowsPictureInPicture={false}
          contentFit="contain"
        />
        <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
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
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
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

          {/* Notes */}
          {session.notes ? (
            <Card style={styles.notesCard}>
              <View style={styles.notesHeader}>
                <Ionicons name="document-text-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.notesLabel}>Notes</Text>
              </View>
              <Text style={styles.notesText}>{session.notes}</Text>
            </Card>
          ) : null}

          {/* Progress photos */}
          {photos.length > 0 && (
            <View style={styles.photosSection}>
              <Text style={styles.sectionTitle}>Progress Photos</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoCarousel}
              >
                {photos.map((p) => (
                  <Image key={p.id} source={{ uri: p.localUri }} style={styles.photoThumb} />
                ))}
              </ScrollView>
            </View>
          )}

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

                {/* Exercise videos */}
                {ex.videos.length > 0 && (
                  <View style={styles.videosSection}>
                    <Text style={styles.videosLabel}>Recordings</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.videosRow}
                    >
                      {ex.videos.map((v) => (
                        <TouchableOpacity
                          key={v.id}
                          style={styles.videoThumbContainer}
                          onPress={() => setPlayingVideoUri(v.localUri)}
                          activeOpacity={0.85}
                        >
                          {v.thumbnailUri ? (
                            <Image source={{ uri: v.thumbnailUri }} style={styles.videoThumb} />
                          ) : (
                            <View style={[styles.videoThumb, styles.videoThumbPlaceholder]} />
                          )}
                          <View style={styles.playOverlay}>
                            <Ionicons name="play-circle" size={36} color="white" />
                          </View>
                          {v.durationSeconds > 0 && (
                            <View style={styles.durationBadge}>
                              <Text style={styles.durationText}>
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
            );
          })}
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
  notesCard: { gap: Spacing.sm },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  notesLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  photosSection: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoCarousel: { gap: Spacing.sm },
  photoThumb: {
    width: 130,
    height: 170,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceElevated,
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
  videosSection: { gap: Spacing.sm },
  videosLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  videosRow: { gap: Spacing.sm },
  videoThumbContainer: {
    width: 120,
    height: 90,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  videoThumbPlaceholder: {
    backgroundColor: Colors.surfaceElevated,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  durationText: {
    fontSize: Typography.sizes.xs,
    color: 'white',
    fontWeight: '600',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (9 / 16),
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
});
