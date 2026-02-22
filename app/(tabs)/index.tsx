import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import { getDatabase } from '../../src/db';
import { getAllWorkoutSessions, getWeeklyStats } from '../../src/db/queries/workouts';
import { getDailyNutritionSummary } from '../../src/db/queries/calories';
import { WorkoutSession } from '../../src/types';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { ProgressRing } from '../../src/components/ui/ProgressRing';
import { Card } from '../../src/components/ui/Card';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
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

    // Build week day volumes
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.appName}>GymBro</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/export')}
            style={styles.exportBtn}
          >
            <Ionicons name="share-outline" size={20} color={Colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Active workout banner */}
        {activeWorkout && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => router.push('/(tabs)/workout')}
          >
            <View style={styles.activeDot} />
            <Text style={styles.activeBannerText}>
              {activeWorkout.name} in progress
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.accent} />
          </TouchableOpacity>
        )}

        {/* Stats row */}
        <Card style={styles.statsCard}>
          <StatBox label="This Week" value={`${weekStats.workoutCount}`} unit="workouts" />
          <View style={styles.statDivider} />
          <StatBox
            label="Volume"
            value={formatVolume(weekStats.totalVolumeKg, settings.weightUnit).split(' ')[0]}
            unit={formatVolume(weekStats.totalVolumeKg, settings.weightUnit).split(' ')[1] || settings.weightUnit}
          />
          <View style={styles.statDivider} />
          <StatBox label="Streak" value={`${weekStats.streak}`} unit="days" />
        </Card>

        {/* Today's Calories */}
        <Card style={styles.calorieCard}>
          <View style={styles.calorieLeft}>
            <Text style={styles.cardTitle}>Today's Calories</Text>
            <Text style={styles.calorieValue}>
              {Math.round(todayCalories.totalCalories)}
              <Text style={styles.calorieGoal}> / {settings.dailyCalorieGoal} kcal</Text>
            </Text>
            <TouchableOpacity
              style={styles.logCaloriesBtn}
              onPress={() => router.push('/(tabs)/calories')}
            >
              <Text style={styles.logCaloriesBtnText}>Log food</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
            </TouchableOpacity>
          </View>
          <ProgressRing
            size={80}
            strokeWidth={8}
            progress={calorieProgress}
            color={Colors.accent}
          >
            <Text style={styles.ringPct}>
              {Math.min(100, Math.round(calorieProgress * 100))}%
            </Text>
          </ProgressRing>
        </Card>

        {/* Start Workout */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.push('/workout/new')}
          activeOpacity={0.85}
        >
          <Ionicons name="barbell" size={22} color="white" />
          <Text style={styles.startBtnText}>
            {activeWorkout ? 'Resume Workout' : 'Start Workout'}
          </Text>
        </TouchableOpacity>

        {/* Weekly chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.cardTitle}>This Week</Text>
          <WeekBarChart volumes={weekDayVolumes} />
        </Card>

        {/* Recent workouts */}
        {recentSessions.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Recent Workouts</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentList}
            >
              {recentSessions.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.recentCard}
                  onPress={() => router.push(`/workout/${s.id}`)}
                >
                  <Text style={styles.recentName} numberOfLines={2}>{s.name}</Text>
                  <Text style={styles.recentDate}>{formatDisplayDate(s.startedAt)}</Text>
                  <Text style={styles.recentDuration}>{formatDurationMinutes(s.durationSeconds)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function WeekBarChart({ volumes }: { volumes: number[] }) {
  const max = Math.max(...volumes, 1);
  const barWidth = (SCREEN_WIDTH - Spacing.base * 4 - 6 * 8) / 7;
  const barMaxHeight = 60;
  const days = getWeekDates(getWeekStart());

  return (
    <View style={styles.chart}>
      <Svg width="100%" height={barMaxHeight + 28}>
        {volumes.map((vol, i) => {
          const barH = Math.max(4, (vol / max) * barMaxHeight);
          const x = i * (barWidth + 8);
          const isToday = formatDateISO(days[i]) === formatDateISO(new Date());
          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={barMaxHeight - barH}
                width={barWidth}
                height={barH}
                rx={4}
                fill={vol > 0 ? Colors.accent : Colors.border}
                opacity={isToday ? 1 : 0.6}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.chartDays}>
        {days.map((d, i) => {
          const isToday = formatDateISO(d) === formatDateISO(new Date());
          return (
            <Text
              key={i}
              style={[styles.chartDayLabel, isToday && styles.chartDayLabelToday]}
            >
              {getShortDayName(d)}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  greeting: { fontSize: Typography.sizes.base, color: Colors.textSecondary, fontWeight: '500' },
  appName: { fontSize: Typography.sizes.xxxl, fontWeight: '800', color: Colors.textPrimary },
  exportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  activeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.success,
  },
  activeBannerText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
  },
  statBox: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: Typography.sizes.xxl, fontWeight: '800', color: Colors.textPrimary },
  statUnit: { fontSize: Typography.sizes.sm, color: Colors.accent, fontWeight: '600' },
  statLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  calorieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  calorieLeft: { flex: 1, gap: Spacing.xs },
  cardTitle: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  calorieValue: { fontSize: Typography.sizes.xl, fontWeight: '700', color: Colors.textPrimary },
  calorieGoal: { fontSize: Typography.sizes.base, color: Colors.textSecondary, fontWeight: '400' },
  logCaloriesBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logCaloriesBtnText: { fontSize: Typography.sizes.sm, color: Colors.accent, fontWeight: '600' },
  ringPct: { fontSize: Typography.sizes.sm, fontWeight: '700', color: Colors.textPrimary },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.base,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startBtnText: { fontSize: Typography.sizes.lg, fontWeight: '700', color: Colors.textPrimary },
  chartCard: { gap: Spacing.md },
  chart: { gap: 4 },
  chartDays: { flexDirection: 'row', justifyContent: 'space-between' },
  chartDayLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted, textAlign: 'center', flex: 1 },
  chartDayLabelToday: { color: Colors.accent, fontWeight: '700' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.textPrimary },
  seeAllText: { fontSize: Typography.sizes.sm, color: Colors.accent, fontWeight: '600' },
  recentList: { gap: Spacing.md, paddingRight: Spacing.base },
  recentCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    width: 140,
    gap: Spacing.xs,
  },
  recentName: { fontSize: Typography.sizes.base, fontWeight: '700', color: Colors.textPrimary },
  recentDate: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  recentDuration: { fontSize: Typography.sizes.sm, color: Colors.accent, fontWeight: '600' },
});
