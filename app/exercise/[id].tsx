import React, { useState, useEffect, useMemo } from 'react';
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
import Svg, { Polyline, Polygon, Circle, Text as SvgText } from 'react-native-svg';
import { getDatabase } from '../../src/db';
import { getExerciseTemplate, getExerciseHistory } from '../../src/db/queries/exercises';
import { getSetHistoryForExercise } from '../../src/db/queries/sets';
import { getVideosForExerciseTemplate, deleteExerciseVideo } from '../../src/db/queries/videos';
import { ExerciseTemplate, ExerciseVideo } from '../../src/types';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { MUSCLE_GROUP_LABELS } from '../../src/constants/exercises';
import { useSettingsStore } from '../../src/store/settingsStore';
import { toDisplayWeightNumber } from '../../src/constants/units';
import {
  SessionSetHistory,
  analyzeTrend,
  getProgressionAdvice,
  calcRepRecords,
  COACHING_TIPS,
} from '../../src/constants/progressionInsights';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system/legacy';

const CHART_WIDTH = Dimensions.get('window').width - Spacing.base * 4;
const CHART_HEIGHT = 90;

type Tab = 'overview' | 'history' | 'insights';
type ChartMetric = 'weight' | 'volume' | '1rm';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useSettingsStore((s) => s.settings.weightUnit);

  const [template, setTemplate] = useState<ExerciseTemplate | null>(null);
  const [history, setHistory] = useState<{
    sessionDate: string; maxWeightKg: number; totalVolumeKg: number;
    totalReps: number; setCount: number; best1RMEstimate: number | null;
  }[]>([]);
  const [sessHistory, setSessHistory] = useState<SessionSetHistory[]>([]);
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('weight');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  async function loadData(exerciseId: string) {
    const db = await getDatabase();
    const [tmpl, hist, sessHist, vids] = await Promise.all([
      getExerciseTemplate(db, exerciseId),
      getExerciseHistory(db, exerciseId, 20),
      getSetHistoryForExercise(db, exerciseId, 5),
      getVideosForExerciseTemplate(db, exerciseId),
    ]);
    setTemplate(tmpl);
    setSessHistory(sessHist);
    setVideos(vids);

    // Merge best1RM from set history back into history entries
    const histWithRM = hist.map((h) => {
      const matching = sessHist.find((s) => s.sessionDate.startsWith(h.sessionDate.slice(0, 10)));
      return { ...h, best1RMEstimate: matching?.best1RM ?? null };
    });
    setHistory(histWithRM);
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

  const maxWeight = history.length > 0 ? Math.max(...history.map((h) => h.maxWeightKg)) : 0;
  const best1RM = history.reduce((m, h) => h.best1RMEstimate !== null ? Math.max(m, h.best1RMEstimate) : m, 0);
  const totalSessions = history.length;
  const totalVolume = history.reduce((t, h) => t + h.totalVolumeKg, 0);

  const chartData = useMemo(() => {
    const reversed = [...history].reverse();
    if (chartMetric === 'weight') {
      return reversed.map((h) => ({ x: h.sessionDate, y: toDisplayWeightNumber(h.maxWeightKg, unit) ?? 0 }));
    }
    if (chartMetric === 'volume') {
      return reversed.map((h) => ({ x: h.sessionDate, y: Math.round(h.totalVolumeKg) }));
    }
    return reversed
      .filter((h) => h.best1RMEstimate !== null)
      .map((h) => ({ x: h.sessionDate, y: toDisplayWeightNumber(h.best1RMEstimate!, unit) ?? 0 }));
  }, [history, chartMetric, unit]);

  const trendValues = chartData.map((d) => d.y);
  const trend = analyzeTrend([...trendValues].reverse());
  const advice = getProgressionAdvice(trend, totalSessions);
  const repRecords = useMemo(() => calcRepRecords(sessHistory), [sessHistory]);
  const coachingTips = template ? COACHING_TIPS[template.muscleGroup] ?? [] : [];

  const trendIcon: React.ComponentProps<typeof Ionicons>['name'] =
    trend === 'progressing' ? 'trending-up' :
    trend === 'declining' ? 'trending-down' :
    trend === 'stalling' ? 'remove' : 'analytics-outline';
  const trendColor =
    trend === 'progressing' ? Colors.mint :
    trend === 'declining' ? Colors.coral :
    trend === 'stalling' ? Colors.amber : Colors.textSecondary;

  if (!template) {
    return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;
  }

  return (
    <>
      <Stack.Screen options={{ title: template.name }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.exerciseName} numberOfLines={2}>{template.name}</Text>
            <Badge label={MUSCLE_GROUP_LABELS[template.muscleGroup]} variant="accent" />
          </View>
          <Text style={styles.equipment}>{template.equipment}</Text>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {(['overview', 'history', 'insights'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <>
              {/* PR cards */}
              {history.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.prScroll}
                >
                  <PRCard label="Max Weight" value={`${toDisplayWeightNumber(maxWeight, unit) ?? 0}`} unit={unit} color={Colors.accent} icon="barbell" />
                  {best1RM > 0 && <PRCard label="Best 1RM Est." value={`${toDisplayWeightNumber(best1RM, unit) ?? 0}`} unit={unit} color={Colors.teal} icon="trophy" />}
                  <PRCard label="Sessions" value={String(totalSessions)} unit="logged" color={Colors.amber} icon="calendar" />
                  <PRCard label="Total Volume" value={unit === 'lbs' ? String(Math.round(totalVolume * 2.20462)) : String(Math.round(totalVolume))} unit={unit} color={Colors.pink} icon="stats-chart" />
                </ScrollView>
              )}

              {/* Chart metric selector */}
              {chartData.length >= 2 && (
                <>
                  <View style={styles.metricRow}>
                    {(['weight', 'volume', '1rm'] as ChartMetric[]).map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.metricChip, chartMetric === m && styles.metricChipActive]}
                        onPress={() => setChartMetric(m)}
                      >
                        <Text style={[styles.metricChipText, chartMetric === m && styles.metricChipTextActive]}>
                          {m === '1rm' ? '1RM Est.' : m.charAt(0).toUpperCase() + m.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Card style={styles.chartCard}>
                    <Text style={styles.cardTitle}>
                      {chartMetric === 'weight' ? `Max Weight (${unit})` :
                       chartMetric === 'volume' ? `Volume (${unit})` : `Estimated 1RM (${unit})`}
                    </Text>
                    <ExerciseLineChart data={chartData} color={Colors.accent} unit={unit} />
                  </Card>
                </>
              )}

              {history.length === 0 && (
                <Card style={styles.emptyCard}>
                  <Ionicons name="barbell-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No history yet</Text>
                  <Text style={styles.emptySub}>Complete a workout with this exercise to see progress charts.</Text>
                </Card>
              )}

              {/* Videos */}
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
                        <Text style={styles.videoDate}>{format(new Date(v.recordedAt), 'MMM d')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card>
              )}
            </>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (
            <>
              {sessHistory.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Ionicons name="time-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No sessions yet</Text>
                  <Text style={styles.emptySub}>Your last 5 sessions will appear here once you've logged this exercise.</Text>
                </Card>
              ) : (
                sessHistory.map((sess) => {
                  const isExpanded = expandedSession === sess.sessionId;
                  return (
                    <Card key={sess.sessionId} style={styles.sessionCard}>
                      <TouchableOpacity
                        style={styles.sessionHeader}
                        onPress={() => setExpandedSession(isExpanded ? null : sess.sessionId)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sessionDate}>{format(new Date(sess.sessionDate), 'EEE, MMM d yyyy')}</Text>
                          <Text style={styles.sessionName} numberOfLines={1}>{sess.sessionName}</Text>
                        </View>
                        <View style={styles.sessionMeta}>
                          <Text style={styles.sessionVolume}>
                            {unit === 'lbs' ? Math.round(sess.totalVolumeKg * 2.20462) : Math.round(sess.totalVolumeKg)} {unit}
                          </Text>
                          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.setList}>
                          {sess.sets.map((s) => (
                            <View key={s.setId} style={styles.setRow}>
                              <Text style={styles.setNum}>
                                {s.isWarmup ? 'W' : `S${s.setNumber}`}
                              </Text>
                              <Text style={styles.setWeight}>
                                {toDisplayWeightNumber(s.weightKg, unit) ?? 0} {unit}
                              </Text>
                              <Text style={styles.setReps}>× {s.reps}</Text>
                              {s.estimated1RM !== null && !s.isWarmup && (
                                <Text style={styles.set1RM}>
                                  ~{toDisplayWeightNumber(s.estimated1RM, unit) ?? 0} 1RM
                                </Text>
                              )}
                              {s.rpe !== null && (
                                <View style={styles.rpeChip}>
                                  <Text style={styles.rpeText}>RPE {s.rpe}</Text>
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </Card>
                  );
                })
              )}
            </>
          )}

          {/* ── INSIGHTS TAB ── */}
          {activeTab === 'insights' && (
            <>
              {/* Trend card */}
              <Card style={styles.trendCard}>
                <View style={styles.trendHeader}>
                  <View style={[styles.trendIconBg, { backgroundColor: trendColor + '22' }]}>
                    <Ionicons name={trendIcon} size={20} color={trendColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Trend Analysis</Text>
                    <Text style={[styles.trendLabel, { color: trendColor }]}>
                      {trend === 'progressing' ? 'Progressing' :
                       trend === 'declining' ? 'Declining' :
                       trend === 'stalling' ? 'Plateau' : 'More data needed'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.adviceText}>{advice}</Text>
              </Card>

              {/* Rep records */}
              <Card style={styles.recordsCard}>
                <Text style={styles.cardTitle}>Personal Records</Text>
                {repRecords.map((rec) => (
                  <View key={rec.repTarget} style={styles.recordRow}>
                    <Text style={styles.recordLabel}>{rec.label}</Text>
                    <View style={{ flex: 1 }} />
                    {rec.value !== null ? (
                      <>
                        <Text style={styles.recordValue}>
                          {toDisplayWeightNumber(rec.value, unit) ?? 0} {unit}
                        </Text>
                        {rec.sessionDate && (
                          <Text style={styles.recordDate}>
                            {format(new Date(rec.sessionDate), 'MMM d')}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text style={styles.recordEmpty}>—</Text>
                    )}
                  </View>
                ))}
              </Card>

              {/* Next session target */}
              {trend === 'progressing' && maxWeight > 0 && (
                <Card style={styles.nextCard}>
                  <View style={styles.nextHeader}>
                    <Ionicons name="flag" size={16} color={Colors.accent} />
                    <Text style={styles.cardTitle}>Next Session Target</Text>
                  </View>
                  <Text style={styles.nextValue}>
                    {toDisplayWeightNumber(maxWeight + (unit === 'lbs' ? 5 : 2.5), unit)} {unit}
                  </Text>
                  <Text style={styles.nextSub}>Add 2.5kg/5lbs when all reps are completed with clean form</Text>
                </Card>
              )}

              {/* Coaching tips */}
              {coachingTips.length > 0 && (
                <Card style={styles.coachCard}>
                  <Text style={styles.cardTitle}>Coaching Tips · {MUSCLE_GROUP_LABELS[template.muscleGroup]}</Text>
                  {coachingTips.map((tip, i) => (
                    <View key={i} style={styles.tipRow}>
                      <View style={styles.tipDot} />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </Card>
              )}

              {totalSessions < 4 && (
                <Card style={styles.emptyCard}>
                  <Ionicons name="analytics-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>Keep logging!</Text>
                  <Text style={styles.emptySub}>Log {4 - totalSessions} more session{4 - totalSessions !== 1 ? 's' : ''} to unlock full trend analysis.</Text>
                </Card>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function PRCard({ label, value, unit, color, icon }: {
  label: string; value: string; unit: string;
  color: string; icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={[prStyles.card, { borderTopColor: color }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={prStyles.value}>{value}</Text>
      <Text style={prStyles.unit}>{unit}</Text>
      <Text style={prStyles.label}>{label}</Text>
    </View>
  );
}

function ExerciseLineChart({ data, color, unit }: {
  data: { x: string; y: number }[];
  color: string;
  unit: string;
}) {
  if (data.length < 2) {
    return (
      <View style={chartStyles.empty}>
        <Text style={chartStyles.emptyText}>Not enough data</Text>
      </View>
    );
  }

  const ys = data.map((d) => d.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const pad = 16;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - pad - ((d.y - minY) / range) * (CHART_HEIGHT - pad * 2) + pad;
    return { x, y };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = [
    `0,${CHART_HEIGHT}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${CHART_WIDTH},${CHART_HEIGHT}`,
  ].join(' ');

  return (
    <View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 4}>
        {/* Area fill */}
        <Polygon points={areaPoints} fill={color + '22'} />
        {/* Line */}
        <Polyline
          points={linePoints}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={color} />
        ))}
        {/* Y-axis labels */}
        <SvgText x={0} y={pad - 2} fontSize={9} fill={Colors.textMuted}>{maxY}</SvgText>
        <SvgText x={0} y={CHART_HEIGHT - 2} fontSize={9} fill={Colors.textMuted}>{minY}</SvgText>
      </Svg>
      {/* X-axis dates */}
      <View style={chartStyles.xAxis}>
        <Text style={chartStyles.axisLabel}>{format(new Date(data[0].x), 'MMM d')}</Text>
        <Text style={chartStyles.axisLabel}>{format(new Date(data[data.length - 1].x), 'MMM d')}</Text>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const prStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderTopWidth: 3,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
    width: 110,
  },
  value: { fontSize: Typography.sizes.xl, fontWeight: '800', color: Colors.textPrimary },
  unit: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  label: { fontSize: Typography.sizes.xs, color: Colors.textMuted, textAlign: 'center' },
});

const chartStyles = StyleSheet.create({
  empty: { height: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  axisLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
  infoCard: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  exerciseName: { flex: 1, fontSize: Typography.sizes.xl, fontWeight: '700', color: Colors.textPrimary },
  equipment: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  tab: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.accent },
  tabText: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.accent },

  content: { padding: Spacing.base, gap: Spacing.md },

  // PR scroll
  prScroll: { gap: Spacing.sm, paddingRight: Spacing.sm },

  // Metric chips
  metricRow: { flexDirection: 'row', gap: Spacing.sm },
  metricChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricChipActive: { backgroundColor: Colors.accentMuted, borderColor: Colors.accent },
  metricChipText: { fontSize: Typography.sizes.xs, fontWeight: '600', color: Colors.textSecondary },
  metricChipTextActive: { color: Colors.accent },

  // Chart
  chartCard: { gap: Spacing.sm },
  cardTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Empty state
  emptyCard: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  emptyTitle: { fontSize: Typography.sizes.base, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: Typography.sizes.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },

  // Session history
  sessionCard: { gap: 0, padding: 0, overflow: 'hidden' },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sessionDate: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  sessionName: { fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.textPrimary },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sessionVolume: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.accentLight },
  setList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  setNum: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    width: 20,
  },
  setWeight: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.textPrimary },
  setReps: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  set1RM: { fontSize: Typography.sizes.xs, color: Colors.teal, marginLeft: 'auto' as any },
  rpeChip: {
    backgroundColor: Colors.amberMuted,
    borderRadius: Radius.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  rpeText: { fontSize: 10, fontWeight: '600', color: Colors.amber },

  // Insights
  trendCard: { gap: Spacing.md },
  trendHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  trendIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendLabel: { fontSize: Typography.sizes.base, fontWeight: '700' },
  adviceText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20 },

  recordsCard: { gap: Spacing.sm },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  recordLabel: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.textPrimary, width: 80 },
  recordValue: { fontSize: Typography.sizes.base, fontWeight: '700', color: Colors.accent },
  recordDate: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginLeft: Spacing.sm },
  recordEmpty: { fontSize: Typography.sizes.base, color: Colors.textMuted },

  nextCard: { gap: Spacing.sm },
  nextHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nextValue: { fontSize: Typography.sizes.xxl, fontWeight: '800', color: Colors.textPrimary },
  nextSub: { fontSize: Typography.sizes.sm, color: Colors.textMuted },

  coachCard: { gap: Spacing.md },
  tipRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  tipDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.accent,
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20 },

  videosCard: { gap: Spacing.md },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  videoCell: { width: '48%', gap: 4 },
  videoThumb: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.sm, backgroundColor: Colors.surfaceElevated },
  videoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  videoDate: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
});
