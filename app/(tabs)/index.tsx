import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline, Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { getDatabase } from '../../src/db';
import { getTodayCheckinCount, buildGymId } from '../../src/utils/gymCommunity';
import { getAllWorkoutSessions, getWeeklyStats } from '../../src/db/queries/workouts';
import { getDailyNutritionSummary } from '../../src/db/queries/calories';
import { WorkoutSession, BodyWeightLog, SleepLog } from '../../src/types';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useHealthStore } from '../../src/store/healthStore';
import { ProgressRing } from '../../src/components/ui/ProgressRing';
import { Colors, SCROLL_BOTTOM_PADDING } from '../../src/constants/theme';
import {
  formatDateISO,
  getWeekStart,
  getWeekEnd,
  getWeekDates,
  getShortDayName,
  formatDisplayDate,
  formatDurationMinutes,
} from '../../src/utils/date';
import { formatVolume } from '../../src/constants/units';
import { AppLogo } from '../../src/components/ui/AppLogo';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HomeScreen() {
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const settings = useSettingsStore((s) => s.settings);
  const { weightLogs, sleepLogs, moodLogs, isLoaded: healthLoaded, load: loadHealth, logMood, removeMoodLog } = useHealthStore();

  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [weekStats, setWeekStats] = useState({ workoutCount: 0, totalVolumeKg: 0, streak: 0 });
  const [todayCalories, setTodayCalories] = useState({ totalCalories: 0 });
  const [weekDayVolumes, setWeekDayVolumes] = useState<number[]>(Array(7).fill(0));
  const [homeGymCount, setHomeGymCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function loadData() {
    const db = await getDatabase();
    const today = formatDateISO(new Date());
    const weekStart = formatDateISO(getWeekStart()) + 'T00:00:00.000Z';
    const weekEnd = formatDateISO(getWeekEnd()) + 'T23:59:59.999Z';

    const [sessions, stats, calories] = await Promise.all([
      getAllWorkoutSessions(db, 5),
      getWeeklyStats(db, weekStart, weekEnd),
      getDailyNutritionSummary(db, today),
    ]);

    setRecentSessions(sessions);
    setWeekStats(stats);
    setTodayCalories({ totalCalories: calories.totalCalories });

    // Load home gym community count
    const { homeGymId } = settings;
    if (homeGymId) {
      getTodayCheckinCount(buildGymId(homeGymId))
        .then(setHomeGymCount)
        .catch((err) => console.error('[home] Failed to load gym check-in count:', err));
    } else {
      setHomeGymCount(null);
    }

    const weekDates = getWeekDates(getWeekStart());
    const volumes = await Promise.all(
      weekDates.map(async (d) => {
        const dStart = formatDateISO(d) + 'T00:00:00.000Z';
        const dEnd = formatDateISO(d) + 'T23:59:59.999Z';
        const s = await getWeeklyStats(db, dStart, dEnd);
        return s.totalVolumeKg;
      }),
    );
    setWeekDayVolumes(volumes);

    // Load health data non-blocking
    if (!healthLoaded) loadHealth();
  }

  const calorieProgress = todayCalories.totalCalories / settings.dailyCalorieGoal;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between pt-1 mb-1">
          <View>
            <Text className="text-[13px] font-medium text-text-secondary">{greeting} 👋</Text>
            <View className="flex-row items-center gap-2" style={{ marginTop: 2 }}>
              <AppLogo size={26} />
              <Text className="text-[34px] font-extrabold text-text-primary" style={{ letterSpacing: -1 }}>
                GymBro
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/export')}
            className="w-10 h-10 rounded-full bg-accent/15 items-center justify-center border"
            style={{ borderColor: 'rgba(124,111,255,0.3)' }}
          >
            <Ionicons name="share-outline" size={20} color={Colors.accentLight} />
          </TouchableOpacity>
        </View>

        {/* Active workout banner */}
        {activeWorkout && (
          <TouchableOpacity
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: 'rgba(124,111,255,0.4)' }}
            onPress={() => router.push('/(tabs)/workout')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['rgba(124,111,255,0.25)', 'rgba(0,217,192,0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}
            >
              <View
                style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: Colors.mint,
                  shadowColor: Colors.mint,
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 0 },
                }}
              />
              <Text className="flex-1 text-[15px] font-semibold text-text-primary">
                {activeWorkout.name} in progress
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.accentLight} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Stats row */}
        <View className="flex-row gap-2">
          <StatCard
            label="This Week"
            value={String(weekStats.workoutCount)}
            unit="workouts"
            icon="barbell"
            color={Colors.accent}
            gradFrom="rgba(124,111,255,0.20)"
            gradTo="rgba(124,111,255,0.05)"
          />
          <StatCard
            label="Volume"
            value={formatVolume(weekStats.totalVolumeKg, settings.weightUnit).split(' ')[0]}
            unit={formatVolume(weekStats.totalVolumeKg, settings.weightUnit).split(' ')[1] || settings.weightUnit}
            icon="trending-up"
            color={Colors.teal}
            gradFrom="rgba(0,217,192,0.20)"
            gradTo="rgba(0,217,192,0.05)"
          />
          <StatCard
            label="Streak"
            value={String(weekStats.streak)}
            unit="days"
            icon="flame"
            color={Colors.amber}
            gradFrom="rgba(255,179,71,0.20)"
            gradTo="rgba(255,179,71,0.05)"
          />
        </View>

        {/* Calories widget */}
        <TouchableOpacity
          className="rounded-2xl overflow-hidden border"
          style={{ borderColor: 'rgba(255,107,157,0.25)' }}
          onPress={() => router.push('/(tabs)/calories')}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['rgba(255,107,157,0.18)', 'rgba(124,111,255,0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 12 }}
          >
            <View className="flex-1 gap-1">
              <View className="flex-row items-center" style={{ gap: 5 }}>
                <Ionicons name="flame" size={16} color={Colors.pink} />
                <Text className="text-[11px] font-bold text-text-secondary uppercase" style={{ letterSpacing: 0.6 }}>
                  Today's Nutrition
                </Text>
              </View>
              <Text className="text-[24px] font-bold text-text-primary" style={{ letterSpacing: -0.5 }}>
                {Math.round(todayCalories.totalCalories)}
                <Text className="text-[13px] text-text-muted font-normal">
                  {' '}/ {settings.dailyCalorieGoal} kcal
                </Text>
              </Text>
              <View
                style={{
                  height: 4,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  marginTop: 2,
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(100, calorieProgress * 100)}%`,
                    backgroundColor: Colors.pink,
                    borderRadius: 2,
                  }}
                />
              </View>
              <Text className="text-[11px] text-text-muted">
                {Math.max(0, settings.dailyCalorieGoal - Math.round(todayCalories.totalCalories))} kcal remaining
              </Text>
            </View>
            <ProgressRing size={72} strokeWidth={7} progress={calorieProgress} color={Colors.pink}>
              <Text className="text-[11px] font-bold text-text-primary">
                {Math.min(100, Math.round(calorieProgress * 100))}%
              </Text>
            </ProgressRing>
          </LinearGradient>
        </TouchableOpacity>

        {/* Home Gym Widget */}
        {settings.homeGymName && (
          <TouchableOpacity
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: 'rgba(0,217,192,0.25)' }}
            onPress={() => router.push('/gym/select?checkIn=true')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['rgba(0,217,192,0.18)', 'rgba(0,217,192,0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}
            >
              <View className="w-9 h-9 rounded-[10px] bg-teal/15 items-center justify-center">
                <Ionicons name="location" size={18} color={Colors.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text className="text-[15px] font-bold text-text-primary" numberOfLines={1}>
                  {settings.homeGymName}
                </Text>
                <Text className="text-[11px] text-teal" style={{ marginTop: 1 }}>
                  {homeGymCount === 1 ? 'You trained here today ✓' : 'Tap to check in →'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.teal} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Weight mini-chart */}
        {weightLogs.length >= 1 && (
          <TouchableOpacity
            className="bg-surface rounded-2xl border border-border p-3 gap-2"
            onPress={() => router.push('/health/index')}
            activeOpacity={0.85}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <Ionicons name="scale-outline" size={14} color={Colors.accent} />
                <Text className="text-[13px] font-bold text-text-primary">Weight</Text>
              </View>
              <Ionicons name="chevron-forward" size={13} color={Colors.textMuted} />
            </View>
            <WeightMiniChart logs={weightLogs.slice(0, 14).reverse()} />
          </TouchableOpacity>
        )}

        {/* Sleep mini-chart */}
        {sleepLogs.length >= 1 && (
          <TouchableOpacity
            className="bg-surface rounded-2xl border border-border p-3 gap-2"
            onPress={() => router.push('/health/index')}
            activeOpacity={0.85}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <Ionicons name="moon-outline" size={14} color={Colors.accent} />
                <Text className="text-[13px] font-bold text-text-primary">Sleep</Text>
              </View>
              <Ionicons name="chevron-forward" size={13} color={Colors.textMuted} />
            </View>
            <SleepMiniChart logs={sleepLogs} />
          </TouchableOpacity>
        )}

        {/* Mood widget */}
        <MoodWidget moodLogs={moodLogs} onLog={logMood} onRemove={removeMoodLog} />

        {/* Start Workout CTA */}
        <TouchableOpacity
          className="rounded-2xl overflow-hidden"
          style={{
            shadowColor: Colors.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.45,
            shadowRadius: 14,
            elevation: 10,
          }}
          onPress={() => router.push('/workout/new')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderRadius: 16 }}
          >
            <Ionicons name="barbell" size={22} color="white" />
            <Text className="text-[17px] font-bold text-white" style={{ letterSpacing: 0.3 }}>
              {activeWorkout ? '▶  Resume Workout' : 'Start Workout'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Weekly chart */}
        <View className="bg-surface rounded-2xl border border-border p-4 gap-2">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-[15px] font-bold text-text-primary">This Week</Text>
            <Text className="text-[11px] text-text-muted">Volume per day</Text>
          </View>
          <WeekBarChart volumes={weekDayVolumes} />
        </View>

        {/* Recent workouts */}
        {recentSessions.length > 0 && (
          <>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-[15px] font-bold text-text-primary">Recent Workouts</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                <Text className="text-[13px] font-semibold text-accent-light">See all →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 16 }}
            >
              {recentSessions.map((s, i) => (
                <TouchableOpacity
                  key={s.id}
                  className="bg-surface rounded-2xl border overflow-hidden p-3 gap-1"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', width: 145 }}
                  onPress={() => router.push(`/workout/${s.id}`)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={RECENT_GRADIENTS[i % RECENT_GRADIENTS.length]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      borderTopLeftRadius: 16, borderTopRightRadius: 16,
                    }}
                  />
                  <Text
                    className="text-[13px] font-bold text-text-primary"
                    style={{ marginTop: 6 }}
                    numberOfLines={2}
                  >
                    {s.name}
                  </Text>
                  <Text className="text-[11px] text-text-muted">{formatDisplayDate(s.startedAt)}</Text>
                  <View className="flex-row items-center" style={{ gap: 3 }}>
                    <Ionicons name="time-outline" size={12} color={Colors.accentLight} />
                    <Text className="text-[11px] font-semibold text-accent-light">
                      {formatDurationMinutes(s.durationSeconds)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <View style={{ height: SCROLL_BOTTOM_PADDING }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MOOD_EMOJIS: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '😊', 5: '😄' };
const MOOD_COLORS: Record<number, string> = {
  1: Colors.coral, 2: Colors.amber, 3: Colors.textMuted, 4: Colors.teal, 5: Colors.mint,
};

function WeightMiniChart({ logs }: { logs: BodyWeightLog[] }) {
  const CHART_W = SCREEN_WIDTH - 64;
  const CHART_H = 60;
  if (logs.length < 2) {
    const latest = logs[0];
    return (
      <View style={{ gap: 2 }}>
        <Text className="text-[20px] font-bold text-text-primary">{latest.weightKg.toFixed(1)} kg</Text>
        <Text className="text-[11px] text-text-muted">Log more entries to see your trend</Text>
      </View>
    );
  }
  const weights = logs.map((l) => l.weightKg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = Math.max(maxW - minW, 0.5);
  const points = logs
    .map((l, i) => {
      const x = (i / (logs.length - 1)) * CHART_W;
      const y = CHART_H - ((l.weightKg - minW) / range) * (CHART_H - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const latest = logs[logs.length - 1];
  const prev = logs[logs.length - 2];
  const delta = latest.weightKg - prev.weightKg;
  const deltaColor = delta > 0.05 ? Colors.coral : delta < -0.05 ? Colors.mint : Colors.textMuted;
  const deltaStr = delta > 0.05 ? `↑${delta.toFixed(1)}` : delta < -0.05 ? `↓${Math.abs(delta).toFixed(1)}` : '→';
  return (
    <View style={{ gap: 4 }}>
      <View className="flex-row items-baseline gap-1">
        <Text className="text-[20px] font-bold text-text-primary">{latest.weightKg.toFixed(1)} kg</Text>
        <Text className="text-[13px] font-semibold" style={{ color: deltaColor }}>{deltaStr}</Text>
      </View>
      <Svg width={CHART_W} height={CHART_H}>
        <Polyline
          points={points}
          fill="none"
          stroke={Colors.accent}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

function SleepMiniChart({ logs }: { logs: SleepLog[] }) {
  const CHART_H = 56;
  const last7 = logs.slice(0, 7).reverse();
  function barColor(mins: number) {
    if (mins < 360) return Colors.coral;   // <6 h — too little
    if (mins < 420) return Colors.amber;   // 6–7 h — below target
    if (mins <= 540) return Colors.mint;   // 7–9 h — ideal range
    return Colors.teal;                    // >9 h — long/overflow (visually distinct)
  }
  const avgMins = last7.reduce((s, l) => s + l.durationMinutes, 0) / last7.length;
  const avgH = Math.floor(avgMins / 60);
  const avgM = Math.round(avgMins % 60);
  const avgQuality = last7.reduce((s, l) => s + l.quality, 0) / last7.length;
  const qualityEmoji = avgQuality >= 4.5 ? '😴' : avgQuality >= 3.5 ? '😊' : avgQuality >= 2.5 ? '😐' : '😞';
  return (
    <View style={{ gap: 4 }}>
      <View className="flex-row items-end" style={{ gap: 6 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const l = last7[i];
          // Cap the bar at 10 h (600 min) for scaling; show teal for >9 h overflow
          const barH = l ? Math.max(4, Math.min(1, l.durationMinutes / 600) * CHART_H) : 4;
          return (
            <View
              key={i}
              className="flex-1 justify-end bg-surface-elevated rounded overflow-hidden"
              style={{ height: CHART_H }}
            >
              <View
                className="rounded"
                style={{ height: barH, backgroundColor: l ? barColor(l.durationMinutes) : Colors.border }}
              />
            </View>
          );
        })}
      </View>
      <Text className="text-[11px] text-text-muted">
        Avg: {avgH}h {avgM}m · Quality: {qualityEmoji}
      </Text>
    </View>
  );
}

function MoodWidget({
  moodLogs,
  onLog,
  onRemove,
}: {
  moodLogs: import('../../src/types').MoodLog[];
  onLog: (mood: 1 | 2 | 3 | 4 | 5) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const today = formatDateISO(new Date());
  const todayMood = moodLogs.find((m) => m.date === today);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return formatDateISO(d);
  });
  return (
    <View className="bg-surface rounded-2xl border border-border p-3 gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-bold text-text-primary">How are you feeling?</Text>
      </View>
      {!todayMood ? (
        <View className="flex-row justify-between">
          {([1, 2, 3, 4, 5] as const).map((m) => (
            <TouchableOpacity
              key={m}
              className="flex-1 items-center py-2 rounded-xl bg-surface-elevated"
              style={{ marginHorizontal: 3 }}
              onPress={() => onLog(m)}
            >
              <Text className="text-[24px]">{MOOD_EMOJIS[m]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <View className="flex-row items-center gap-2">
            <Text className="text-[28px]">{MOOD_EMOJIS[todayMood.mood]}</Text>
            <Text className="text-[13px] font-semibold text-text-secondary flex-1">Today</Text>
            <TouchableOpacity
              className="px-2 rounded-lg bg-surface-elevated border border-border"
              style={{ paddingVertical: 3 }}
              onPress={() => onRemove(todayMood.id)}
            >
              <Text className="text-[11px] font-semibold text-text-secondary">Change</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row" style={{ gap: 6 }}>
            {last7.map((date) => {
              const log = moodLogs.find((m) => m.date === date);
              return (
                <View
                  key={date}
                  className="flex-1 rounded"
                  style={{ height: 8, backgroundColor: log ? MOOD_COLORS[log.mood] : Colors.border }}
                />
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const RECENT_GRADIENTS: [string, string][] = [
  ['rgba(124,111,255,0.35)', 'rgba(124,111,255,0.08)'],
  ['rgba(0,217,192,0.35)', 'rgba(0,217,192,0.08)'],
  ['rgba(255,107,157,0.35)', 'rgba(255,107,157,0.08)'],
  ['rgba(255,179,71,0.35)', 'rgba(255,179,71,0.08)'],
  ['rgba(78,203,113,0.35)', 'rgba(78,203,113,0.08)'],
];

function StatCard({
  label,
  value,
  unit,
  icon,
  color,
  gradFrom,
  gradTo,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  gradFrom: string;
  gradTo: string;
}) {
  return (
    <View className="flex-1 rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <LinearGradient
        colors={[gradFrom, gradTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ padding: 12, gap: 3, alignItems: 'flex-start' }}
      >
        <View
          className="w-[30px] h-[30px] rounded-lg items-center justify-center"
          style={{ backgroundColor: color + '22', marginBottom: 2 }}
        >
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text className="text-[28px] font-extrabold" style={{ color, letterSpacing: -0.5 }}>{value}</Text>
        <Text className="text-[11px] font-semibold text-text-secondary">{unit}</Text>
        <Text className="text-[11px] text-text-muted">{label}</Text>
      </LinearGradient>
    </View>
  );
}

function WeekBarChart({ volumes }: { volumes: number[] }) {
  const max = Math.max(...volumes, 1);
  const chartWidth = SCREEN_WIDTH - 64;
  const barGap = 8;
  const barWidth = (chartWidth - barGap * 6) / 7;
  const barMaxHeight = 56;
  const days = getWeekDates(getWeekStart());
  const today = formatDateISO(new Date());

  return (
    <View className="gap-1">
      <Svg width="100%" height={barMaxHeight + 32}>
        <Defs>
          <SvgGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.accent} stopOpacity="1" />
            <Stop offset="1" stopColor={Colors.accentDark} stopOpacity="0.7" />
          </SvgGradient>
          <SvgGradient id="barGradToday" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.teal} stopOpacity="1" />
            <Stop offset="1" stopColor={Colors.accent} stopOpacity="0.8" />
          </SvgGradient>
        </Defs>
        {volumes.map((vol, i) => {
          const barH = Math.max(4, (vol / max) * barMaxHeight);
          const x = i * (barWidth + barGap);
          const isToday = formatDateISO(days[i]) === today;
          return (
            <Rect
              key={i}
              x={x}
              y={barMaxHeight - barH}
              width={barWidth}
              height={barH}
              rx={5}
              fill={vol > 0 ? (isToday ? 'url(#barGradToday)' : 'url(#barGrad)') : Colors.border}
              opacity={vol > 0 ? 1 : 0.5}
            />
          );
        })}
      </Svg>
      <View className="flex-row justify-between" style={{ paddingHorizontal: 2 }}>
        {days.map((d, i) => {
          const isToday = formatDateISO(d) === today;
          return (
            <Text
              key={i}
              className={`text-[11px] text-center flex-1 ${isToday ? 'text-teal font-bold' : 'text-text-muted'}`}
            >
              {getShortDayName(d)[0]}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
