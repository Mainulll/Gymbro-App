import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { getDatabase } from '../../src/db';
import { getAllWorkoutSessions, getWeeklyStats } from '../../src/db/queries/workouts';
import { getDailyNutritionSummary } from '../../src/db/queries/calories';
import { WorkoutSession } from '../../src/types';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { ProgressRing } from '../../src/components/ui/ProgressRing';
import { Colors, Typography, Spacing, Radius, SCROLL_BOTTOM_PADDING } from '../../src/constants/theme';
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

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HomeScreen() {
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const settings = useSettingsStore((s) => s.settings);

  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [weekStats, setWeekStats] = useState({ workoutCount: 0, totalVolumeKg: 0, streak: 0 });
  const [todayCalories, setTodayCalories] = useState({ totalCalories: 0 });
  const [weekDayVolumes, setWeekDayVolumes] = useState<number[]>(Array(7).fill(0));

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
  }

  const calorieProgress = todayCalories.totalCalories / settings.dailyCalorieGoal;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.appName}>GymBro</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/export')} style={styles.exportBtn}>
            <Ionicons name="share-outline" size={20} color={Colors.accentLight} />
          </TouchableOpacity>
        </View>

        {/* Active workout banner */}
        {activeWorkout && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => router.push('/(tabs)/workout')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['rgba(124,111,255,0.25)', 'rgba(0,217,192,0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeBannerGrad}
            >
              <View style={styles.activeDot} />
              <Text style={styles.activeBannerText}>{activeWorkout.name} in progress</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.accentLight} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
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
          style={styles.calorieCard}
          onPress={() => router.push('/(tabs)/calories')}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['rgba(255,107,157,0.18)', 'rgba(124,111,255,0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.calorieGrad}
          >
            <View style={styles.calorieLeft}>
              <View style={styles.calorieLabelRow}>
                <Ionicons name="flame" size={16} color={Colors.pink} />
                <Text style={styles.calorieSectionLabel}>Today's Nutrition</Text>
              </View>
              <Text style={styles.calorieValue}>
                {Math.round(todayCalories.totalCalories)}
                <Text style={styles.calorieGoal}> / {settings.dailyCalorieGoal} kcal</Text>
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, calorieProgress * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.calorieRemaining}>
                {Math.max(0, settings.dailyCalorieGoal - Math.round(todayCalories.totalCalories))} kcal remaining
              </Text>
            </View>
            <ProgressRing size={72} strokeWidth={7} progress={calorieProgress} color={Colors.pink}>
              <Text style={styles.ringPct}>{Math.min(100, Math.round(calorieProgress * 100))}%</Text>
            </ProgressRing>
          </LinearGradient>
        </TouchableOpacity>

        {/* Start Workout CTA */}
        <TouchableOpacity
          style={styles.startBtnOuter}
          onPress={() => router.push('/workout/new')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.startBtnGrad}
          >
            <Ionicons name="barbell" size={22} color="white" />
            <Text style={styles.startBtnText}>
              {activeWorkout ? '▶  Resume Workout' : 'Start Workout'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Weekly chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>This Week</Text>
            <Text style={styles.chartSubtitle}>Volume per day</Text>
          </View>
          <WeekBarChart volumes={weekDayVolumes} />
        </View>

        {/* Recent workouts */}
        {recentSessions.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Recent Workouts</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentList}
            >
              {recentSessions.map((s, i) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.recentCard}
                  onPress={() => router.push(`/workout/${s.id}`)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={RECENT_GRADIENTS[i % RECENT_GRADIENTS.length]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.recentGradTop}
                  />
                  <Text style={styles.recentName} numberOfLines={2}>{s.name}</Text>
                  <Text style={styles.recentDate}>{formatDisplayDate(s.startedAt)}</Text>
                  <View style={styles.recentDurationRow}>
                    <Ionicons name="time-outline" size={12} color={Colors.accentLight} />
                    <Text style={styles.recentDuration}>{formatDurationMinutes(s.durationSeconds)}</Text>
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
    <View style={styles.statCardOuter}>
      <LinearGradient
        colors={[gradFrom, gradTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.statCardInner}
      >
        <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </LinearGradient>
    </View>
  );
}

function WeekBarChart({ volumes }: { volumes: number[] }) {
  const max = Math.max(...volumes, 1);
  const chartWidth = SCREEN_WIDTH - Spacing.base * 4;
  const barGap = 8;
  const barWidth = (chartWidth - barGap * 6) / 7;
  const barMaxHeight = 56;
  const days = getWeekDates(getWeekStart());
  const today = formatDateISO(new Date());

  return (
    <View style={styles.chart}>
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
      <View style={styles.chartDays}>
        {days.map((d, i) => {
          const isToday = formatDateISO(d) === today;
          return (
            <Text key={i} style={[styles.chartDayLabel, isToday && styles.chartDayToday]}>
              {getShortDayName(d)[0]}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, gap: Spacing.md },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  greeting: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: '500' },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  exportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.3)',
  },

  // Active banner
  activeBanner: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.4)',
    overflow: 'hidden',
  },
  activeBannerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  activeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.mint,
    shadowColor: Colors.mint,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  activeBannerText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCardOuter: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statCardInner: {
    padding: Spacing.md,
    gap: 3,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statUnit: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: '600' },
  statLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },

  // Calorie card
  calorieCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,107,157,0.25)',
  },
  calorieGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  calorieLeft: { flex: 1, gap: Spacing.xs },
  calorieLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  calorieSectionLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  calorieValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  calorieGoal: { fontSize: Typography.sizes.sm, color: Colors.textMuted, fontWeight: '400' },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.pink,
    borderRadius: 2,
  },
  calorieRemaining: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  ringPct: { fontSize: Typography.sizes.xs, fontWeight: '700', color: Colors.textPrimary },

  // Start button
  startBtnOuter: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  startBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base + 2,
    borderRadius: Radius.lg,
  },
  startBtnText: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },

  // Chart
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  chartTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  chartSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  chart: { gap: 4 },
  chartDays: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  chartDayLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted, textAlign: 'center', flex: 1 },
  chartDayToday: { color: Colors.teal, fontWeight: '700' },

  // Section
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  sectionTitle: { fontSize: Typography.sizes.base, fontWeight: '700', color: Colors.textPrimary },
  seeAll: { fontSize: Typography.sizes.sm, color: Colors.accentLight, fontWeight: '600' },

  // Recent
  recentList: { gap: Spacing.sm, paddingRight: Spacing.base },
  recentCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.md,
    width: 145,
    gap: Spacing.xs,
    overflow: 'hidden',
  },
  recentGradTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  recentName: { fontSize: Typography.sizes.sm, fontWeight: '700', color: Colors.textPrimary, marginTop: 6 },
  recentDate: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  recentDurationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  recentDuration: { fontSize: Typography.sizes.xs, color: Colors.accentLight, fontWeight: '600' },
});
