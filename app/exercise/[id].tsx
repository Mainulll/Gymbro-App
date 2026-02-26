import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { Colors, Spacing } from '../../src/constants/theme';
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
    return (
      <View className="flex-1 bg-background">
        <Text className="text-text-secondary text-center mt-10">Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: template.name }} />
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        {/* Info card */}
        <View
          className="bg-surface px-4 py-4 gap-1"
          style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.border }}
        >
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-[24px] font-bold text-text-primary" numberOfLines={2}>
              {template.name}
            </Text>
            <Badge label={MUSCLE_GROUP_LABELS[template.muscleGroup]} variant="accent" />
          </View>
          <Text className="text-[13px] text-text-secondary">{template.equipment}</Text>
        </View>

        {/* Tab bar */}
        <View
          className="flex-row bg-surface px-4 gap-4"
          style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.border }}
        >
          {(['overview', 'history', 'insights'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`py-3 px-2 border-b-2${activeTab === tab ? ' border-accent' : ' border-transparent'}`}
              onPress={() => setActiveTab(tab)}
            >
              <Text className={`text-[13px] font-semibold${activeTab === tab ? ' text-accent' : ' text-text-muted'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <>
              {history.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingRight: 8 }}
                >
                  <PRCard label="Max Weight" value={`${toDisplayWeightNumber(maxWeight, unit) ?? 0}`} unit={unit} color={Colors.accent} icon="barbell" />
                  {best1RM > 0 && <PRCard label="Best 1RM Est." value={`${toDisplayWeightNumber(best1RM, unit) ?? 0}`} unit={unit} color={Colors.teal} icon="trophy" />}
                  <PRCard label="Sessions" value={String(totalSessions)} unit="logged" color={Colors.amber} icon="calendar" />
                  <PRCard label="Total Volume" value={unit === 'lbs' ? String(Math.round(totalVolume * 2.20462)) : String(Math.round(totalVolume))} unit={unit} color={Colors.pink} icon="stats-chart" />
                </ScrollView>
              )}

              {chartData.length >= 2 && (
                <>
                  <View className="flex-row gap-2">
                    {(['weight', 'volume', '1rm'] as ChartMetric[]).map((m) => (
                      <TouchableOpacity
                        key={m}
                        className={`flex-1 py-2 rounded-xl items-center border${
                          chartMetric === m
                            ? ' bg-accent/[0.18] border-accent'
                            : ' bg-surface-elevated border-border'
                        }`}
                        onPress={() => setChartMetric(m)}
                      >
                        <Text
                          className={`text-[11px] font-semibold${
                            chartMetric === m ? ' text-accent' : ' text-text-secondary'
                          }`}
                        >
                          {m === '1rm' ? '1RM Est.' : m.charAt(0).toUpperCase() + m.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Card style={{ gap: 8 }}>
                    <Text className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.8px]">
                      {chartMetric === 'weight' ? `Max Weight (${unit})` :
                       chartMetric === 'volume' ? `Volume (${unit})` : `Estimated 1RM (${unit})`}
                    </Text>
                    <ExerciseLineChart data={chartData} color={Colors.accent} unit={unit} />
                  </Card>
                </>
              )}

              {history.length === 0 && (
                <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
                  <Ionicons name="barbell-outline" size={40} color={Colors.textMuted} />
                  <Text className="text-[15px] font-bold text-text-secondary">No history yet</Text>
                  <Text className="text-[13px] text-text-muted text-center leading-5">
                    Complete a workout with this exercise to see progress charts.
                  </Text>
                </Card>
              )}

              {videos.length > 0 && (
                <Card style={{ gap: 12 }}>
                  <Text className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.8px]">
                    Videos ({videos.length})
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {videos.map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        style={{ width: '48%', gap: 4 }}
                        onLongPress={() => handleDeleteVideo(v)}
                      >
                        {v.thumbnailUri ? (
                          <Image
                            source={{ uri: v.thumbnailUri }}
                            style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: Colors.surfaceElevated }}
                          />
                        ) : (
                          <View
                            className="items-center justify-center bg-surface-elevated rounded-lg"
                            style={{ width: '100%', aspectRatio: 16 / 9 }}
                          >
                            <Ionicons name="videocam" size={24} color={Colors.accent} />
                          </View>
                        )}
                        <Text className="text-[11px] text-text-muted">
                          {format(new Date(v.recordedAt), 'MMM d')}
                        </Text>
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
                <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
                  <Ionicons name="time-outline" size={40} color={Colors.textMuted} />
                  <Text className="text-[15px] font-bold text-text-secondary">No sessions yet</Text>
                  <Text className="text-[13px] text-text-muted text-center leading-5">
                    Your last 5 sessions will appear here once you've logged this exercise.
                  </Text>
                </Card>
              ) : (
                sessHistory.map((sess) => {
                  const isExpanded = expandedSession === sess.sessionId;
                  return (
                    <Card key={sess.sessionId} style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
                      <TouchableOpacity
                        className="flex-row items-center p-3 gap-2"
                        onPress={() => setExpandedSession(isExpanded ? null : sess.sessionId)}
                        activeOpacity={0.7}
                      >
                        <View className="flex-1">
                          <Text className="text-[11px] text-text-muted">
                            {format(new Date(sess.sessionDate), 'EEE, MMM d yyyy')}
                          </Text>
                          <Text className="text-[15px] font-semibold text-text-primary" numberOfLines={1}>
                            {sess.sessionName}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-[13px] font-semibold text-accent-light">
                            {unit === 'lbs' ? Math.round(sess.totalVolumeKg * 2.20462) : Math.round(sess.totalVolumeKg)} {unit}
                          </Text>
                          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View
                          className="px-3 pb-3 pt-2 gap-1.5"
                          style={{ borderTopWidth: 0.5, borderTopColor: Colors.border }}
                        >
                          {sess.sets.map((s) => (
                            <View key={s.setId} className="flex-row items-center gap-2">
                              <Text className="text-[11px] font-bold text-text-muted w-5">
                                {s.isWarmup ? 'W' : `S${s.setNumber}`}
                              </Text>
                              <Text className="text-[13px] font-semibold text-text-primary">
                                {toDisplayWeightNumber(s.weightKg, unit) ?? 0} {unit}
                              </Text>
                              <Text className="text-[13px] text-text-secondary">× {s.reps}</Text>
                              {s.estimated1RM !== null && !s.isWarmup && (
                                <Text className="text-[11px] text-teal ml-auto">
                                  ~{toDisplayWeightNumber(s.estimated1RM, unit) ?? 0} 1RM
                                </Text>
                              )}
                              {s.rpe !== null && (
                                <View
                                  className="rounded px-1 py-0.5"
                                  style={{ backgroundColor: Colors.amberMuted }}
                                >
                                  <Text className="text-[10px] font-semibold text-amber">RPE {s.rpe}</Text>
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
              <Card style={{ gap: 12 }}>
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: trendColor + '22' }}
                  >
                    <Ionicons name={trendIcon} size={20} color={trendColor} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.8px]">
                      Trend Analysis
                    </Text>
                    <Text className="text-[15px] font-bold" style={{ color: trendColor }}>
                      {trend === 'progressing' ? 'Progressing' :
                       trend === 'declining' ? 'Declining' :
                       trend === 'stalling' ? 'Plateau' : 'More data needed'}
                    </Text>
                  </View>
                </View>
                <Text className="text-[13px] text-text-secondary leading-5">{advice}</Text>
              </Card>

              <Card style={{ gap: 8 }}>
                <Text className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.8px]">
                  Personal Records
                </Text>
                {repRecords.map((rec) => (
                  <View
                    key={rec.repTarget}
                    className="flex-row items-center py-1"
                    style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.border }}
                  >
                    <Text className="text-[13px] font-semibold text-text-primary w-20">{rec.label}</Text>
                    <View className="flex-1" />
                    {rec.value !== null ? (
                      <>
                        <Text className="text-[15px] font-bold text-accent">
                          {toDisplayWeightNumber(rec.value, unit) ?? 0} {unit}
                        </Text>
                        {rec.sessionDate && (
                          <Text className="text-[11px] text-text-muted ml-2">
                            {format(new Date(rec.sessionDate), 'MMM d')}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text className="text-[15px] text-text-muted">—</Text>
                    )}
                  </View>
                ))}
              </Card>

              {trend === 'progressing' && maxWeight > 0 && (
                <Card style={{ gap: 8 }}>
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="flag" size={16} color={Colors.accent} />
                    <Text className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.8px]">
                      Next Session Target
                    </Text>
                  </View>
                  <Text className="text-[28px] font-extrabold text-text-primary">
                    {toDisplayWeightNumber(maxWeight + (unit === 'lbs' ? 5 : 2.5), unit)} {unit}
                  </Text>
                  <Text className="text-[13px] text-text-muted">
                    Add 2.5kg/5lbs when all reps are completed with clean form
                  </Text>
                </Card>
              )}

              {coachingTips.length > 0 && (
                <Card style={{ gap: 12 }}>
                  <Text className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.8px]">
                    Coaching Tips · {MUSCLE_GROUP_LABELS[template.muscleGroup]}
                  </Text>
                  {coachingTips.map((tip, i) => (
                    <View key={i} className="flex-row gap-2 items-start">
                      <View className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" style={{ marginTop: 6 }} />
                      <Text className="flex-1 text-[13px] text-text-secondary leading-5">{tip}</Text>
                    </View>
                  ))}
                </Card>
              )}

              {totalSessions < 4 && (
                <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
                  <Ionicons name="analytics-outline" size={40} color={Colors.textMuted} />
                  <Text className="text-[15px] font-bold text-text-secondary">Keep logging!</Text>
                  <Text className="text-[13px] text-text-muted text-center leading-5">
                    Log {4 - totalSessions} more session{4 - totalSessions !== 1 ? 's' : ''} to unlock full trend analysis.
                  </Text>
                </Card>
              )}
            </>
          )}

          <View className="h-10" />
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
    <View
      className="bg-surface-elevated rounded-2xl p-3 items-center gap-0.5 w-[110px] border-t-[3px]"
      style={{ borderTopColor: color }}
    >
      <Ionicons name={icon} size={14} color={color} />
      <Text className="text-[24px] font-extrabold text-text-primary">{value}</Text>
      <Text className="text-[11px] text-text-secondary">{unit}</Text>
      <Text className="text-[11px] text-text-muted text-center">{label}</Text>
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
      <View className="h-[60px] items-center justify-center">
        <Text className="text-[13px] text-text-muted">Not enough data</Text>
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
        <Polygon points={areaPoints} fill={color + '22'} />
        <Polyline
          points={linePoints}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={color} />
        ))}
        <SvgText x={0} y={pad - 2} fontSize={9} fill={Colors.textMuted}>{maxY}</SvgText>
        <SvgText x={0} y={CHART_HEIGHT - 2} fontSize={9} fill={Colors.textMuted}>{minY}</SvgText>
      </Svg>
      <View className="flex-row justify-between mt-0.5">
        <Text className="text-[11px] text-text-muted">{format(new Date(data[0].x), 'MMM d')}</Text>
        <Text className="text-[11px] text-text-muted">{format(new Date(data[data.length - 1].x), 'MMM d')}</Text>
      </View>
    </View>
  );
}
