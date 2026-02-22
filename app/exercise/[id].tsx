import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { getDatabase } from '../../src/db';
import { getExerciseTemplate, getExerciseHistory } from '../../src/db/queries/exercises';
import { getVideosForExerciseTemplate } from '../../src/db/queries/videos';
import { deleteExerciseVideo } from '../../src/db/queries/videos';
import { ExerciseTemplate, ExerciseVideo } from '../../src/types';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { MUSCLE_GROUP_LABELS } from '../../src/constants/exercises';
import { useSettingsStore } from '../../src/store/settingsStore';
import { toDisplayWeightNumber } from '../../src/constants/units';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system/legacy';

const CHART_WIDTH = Dimensions.get('window').width - Spacing.base * 4;
const CHART_HEIGHT = 80;

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useSettingsStore((s) => s.settings.weightUnit);

  const [template, setTemplate] = useState<ExerciseTemplate | null>(null);
  const [history, setHistory] = useState<{ sessionDate: string; maxWeightKg: number; totalVolumeKg: number }[]>([]);
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  async function loadData(exerciseId: string) {
    const db = await getDatabase();
    const [tmpl, hist, vids] = await Promise.all([
      getExerciseTemplate(db, exerciseId),
      getExerciseHistory(db, exerciseId, 10),
      getVideosForExerciseTemplate(db, exerciseId),
    ]);
    setTemplate(tmpl);
    setHistory(hist);
    setVideos(vids);
  }

  async function handleDeleteVideo(video: ExerciseVideo) {
    Alert.alert('Delete Video', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const db = await getDatabase();
          await deleteExerciseVideo(db, video.id);
          try { await FileSystem.deleteAsync(video.localUri, { idempotent: true }); } catch {}
          setVideos((v) => v.filter((x) => x.id !== video.id));
        },
      },
    ]);
  }

  if (!template) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  const maxWeight = history.length > 0 ? Math.max(...history.map((h) => h.maxWeightKg)) : 0;
  const displayMax = toDisplayWeightNumber(maxWeight, unit);

  return (
    <>
      <Stack.Screen options={{ title: template.name }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Exercise info */}
          <Card style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Text style={styles.exerciseName}>{template.name}</Text>
              <Badge label={MUSCLE_GROUP_LABELS[template.muscleGroup]} variant="accent" />
            </View>
            <Text style={styles.equipment}>{template.equipment}</Text>
          </Card>

          {/* PRs */}
          {history.length > 0 && (
            <Card style={styles.prCard}>
              <Text style={styles.cardTitle}>Personal Records</Text>
              <View style={styles.prRow}>
                <View style={styles.pr}>
                  <Text style={styles.prValue}>
                    {displayMax} {unit}
                  </Text>
                  <Text style={styles.prLabel}>Max Weight</Text>
                </View>
                <View style={styles.pr}>
                  <Text style={styles.prValue}>{history.length}</Text>
                  <Text style={styles.prLabel}>Sessions</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Progress chart */}
          {history.length >= 2 && (
            <Card style={styles.chartCard}>
              <Text style={styles.cardTitle}>Progress (Max Weight)</Text>
              <ProgressChart data={history} unit={unit} />
            </Card>
          )}

          {/* Video gallery */}
          {videos.length > 0 && (
            <Card style={styles.videosCard}>
              <Text style={styles.cardTitle}>Videos ({videos.length})</Text>
              <View style={styles.videoGrid}>
                {videos.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.videoCell}
                    onLongPress={() => handleDeleteVideo(v)}
                  >
                    {v.thumbnailUri ? (
                      <Image source={{ uri: v.thumbnailUri }} style={styles.videoThumb} />
                    ) : (
                      <View style={[styles.videoThumb, styles.videoPlaceholder]}>
                        <Ionicons name="videocam" size={24} color={Colors.accent} />
                      </View>
                    )}
                    <Text style={styles.videoDate}>
                      {format(new Date(v.recordedAt), 'MMM d')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function ProgressChart({
  data,
  unit,
}: {
  data: { sessionDate: string; maxWeightKg: number }[];
  unit: 'kg' | 'lbs';
}) {
  const reversed = [...data].reverse();
  const weights = reversed.map((d) => d.maxWeightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const points = reversed.map((d, i) => {
    const x = (i / (reversed.length - 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - ((d.maxWeightKg - min) / range) * (CHART_HEIGHT - 16) - 8;
    return { x, y, weight: d.maxWeightKg };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 8}>
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={Colors.accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={Colors.accent} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.chartAxisLabel}>{format(new Date(reversed[0].sessionDate), 'MMM d')}</Text>
        <Text style={styles.chartAxisLabel}>{format(new Date(reversed[reversed.length - 1].sessionDate), 'MMM d')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  infoCard: { gap: Spacing.sm },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  exerciseName: { flex: 1, fontSize: Typography.sizes.xl, fontWeight: '700', color: Colors.textPrimary },
  equipment: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  prCard: { gap: Spacing.md },
  cardTitle: { fontSize: Typography.sizes.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  prRow: { flexDirection: 'row', gap: Spacing.base },
  pr: { alignItems: 'center', flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.md },
  prValue: { fontSize: Typography.sizes.xl, fontWeight: '800', color: Colors.textPrimary },
  prLabel: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  chartCard: { gap: Spacing.md },
  chartAxisLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  videosCard: { gap: Spacing.md },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  videoCell: { width: '48%', gap: 4 },
  videoThumb: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.sm, backgroundColor: Colors.surfaceElevated },
  videoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  videoDate: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
});
