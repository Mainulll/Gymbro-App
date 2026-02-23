import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useHealthStore } from '../../src/store/healthStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { BodyWeightLog, SleepLog } from '../../src/types';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { Card } from '../../src/components/ui/Card';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { toDisplayWeightNumber } from '../../src/constants/units';
import { format } from 'date-fns';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - Spacing.base * 4;
const CHART_H = 100;

// ─── Quality emoji map ────────────────────────────────────────────────────────
const QUALITY_LABELS = ['', '😴', '😕', '😐', '😊', '😄'];

export default function HealthScreen() {
  const { weightLogs, sleepLogs, isLoaded, load, logWeight, removeWeightLog, logSleep, removeSleepLog } =
    useHealthStore();
  const unit = useSettingsStore((s) => s.settings.weightUnit);

  const [activeTab, setActiveTab] = useState<'weight' | 'sleep'>('weight');
  const [showWeightSheet, setShowWeightSheet] = useState(false);
  const [showSleepSheet, setShowSleepSheet] = useState(false);

  // Weight form
  const [weightInput, setWeightInput] = useState('');
  const [bodyFatInput, setBodyFatInput] = useState('');

  // Sleep form
  const [bedTime, setBedTime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [sleepQuality, setSleepQuality] = useState(3);

  useEffect(() => {
    if (!isLoaded) load();
  }, []);

  function parseSleepDuration(bed: string, wake: string): number {
    const [bh, bm] = bed.split(':').map(Number);
    const [wh, wm] = wake.split(':').map(Number);
    let bedMinutes = bh * 60 + bm;
    let wakeMinutes = wh * 60 + wm;
    if (wakeMinutes < bedMinutes) wakeMinutes += 24 * 60; // past midnight
    return wakeMinutes - bedMinutes;
  }

  async function handleLogWeight() {
    const kg =
      unit === 'lbs'
        ? parseFloat(weightInput) / 2.205
        : parseFloat(weightInput);
    if (isNaN(kg) || kg <= 0) {
      Alert.alert('Invalid', 'Please enter a valid weight.');
      return;
    }
    const bf = parseFloat(bodyFatInput) || undefined;
    await logWeight(kg, bf);
    setWeightInput('');
    setBodyFatInput('');
    setShowWeightSheet(false);
  }

  async function handleLogSleep() {
    const dur = parseSleepDuration(bedTime, wakeTime);
    if (dur <= 0 || dur > 24 * 60) {
      Alert.alert('Invalid', 'Please enter valid bed/wake times.');
      return;
    }
    await logSleep({ bedTime, wakeTime, durationMinutes: dur, quality: sleepQuality });
    setShowSleepSheet(false);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Health & Body' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Segment control */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'weight' && styles.tabActive]}
            onPress={() => setActiveTab('weight')}
          >
            <Ionicons name="scale-outline" size={16} color={activeTab === 'weight' ? Colors.textPrimary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'weight' && styles.tabTextActive]}>Body Weight</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sleep' && styles.tabActive]}
            onPress={() => setActiveTab('sleep')}
          >
            <Ionicons name="moon-outline" size={16} color={activeTab === 'sleep' ? Colors.textPrimary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'sleep' && styles.tabTextActive]}>Sleep</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {activeTab === 'weight' && (
            <WeightTab
              logs={weightLogs}
              unit={unit}
              onAdd={() => setShowWeightSheet(true)}
              onDelete={(id) =>
                Alert.alert('Delete', 'Remove this weight log?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => removeWeightLog(id) },
                ])
              }
            />
          )}
          {activeTab === 'sleep' && (
            <SleepTab
              logs={sleepLogs}
              onAdd={() => setShowSleepSheet(true)}
              onDelete={(id) =>
                Alert.alert('Delete', 'Remove this sleep log?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => removeSleepLog(id) },
                ])
              }
            />
          )}
        </ScrollView>

        {/* Log Weight Sheet */}
        <BottomSheet
          visible={showWeightSheet}
          onClose={() => setShowWeightSheet(false)}
          title={`Log Today's Weight`}
          snapHeight={320}
        >
          <View style={styles.form}>
            <View style={styles.formRow}>
              <View style={{ flex: 2, gap: 4 }}>
                <Text style={styles.formLabel}>Weight ({unit})</Text>
                <TextInput
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder={unit === 'kg' ? '75.5' : '166.5'}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  keyboardAppearance="dark"
                  style={styles.formInput}
                  autoFocus
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.formLabel}>Body Fat %</Text>
                <TextInput
                  value={bodyFatInput}
                  onChangeText={setBodyFatInput}
                  placeholder="15"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  keyboardAppearance="dark"
                  style={styles.formInput}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.logBtn} onPress={handleLogWeight}>
              <Text style={styles.logBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>

        {/* Log Sleep Sheet */}
        <BottomSheet
          visible={showSleepSheet}
          onClose={() => setShowSleepSheet(false)}
          title="Log Last Night's Sleep"
          snapHeight={400}
        >
          <View style={styles.form}>
            <View style={styles.formRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.formLabel}>Bed Time (HH:MM)</Text>
                <TextInput
                  value={bedTime}
                  onChangeText={setBedTime}
                  placeholder="22:30"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  keyboardAppearance="dark"
                  style={styles.formInput}
                  textAlign="center"
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.formLabel}>Wake Time (HH:MM)</Text>
                <TextInput
                  value={wakeTime}
                  onChangeText={setWakeTime}
                  placeholder="06:30"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  keyboardAppearance="dark"
                  style={styles.formInput}
                  textAlign="center"
                />
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={styles.formLabel}>Sleep Quality</Text>
              <View style={styles.qualityRow}>
                {[1, 2, 3, 4, 5].map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.qualityBtn, sleepQuality === q && styles.qualityBtnActive]}
                    onPress={() => setSleepQuality(q)}
                  >
                    <Text style={styles.qualityEmoji}>{QUALITY_LABELS[q]}</Text>
                    <Text style={[styles.qualityNum, sleepQuality === q && { color: Colors.accent }]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.logBtn} onPress={handleLogSleep}>
              <Text style={styles.logBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>
      </SafeAreaView>
    </>
  );
}

// ─── Weight Tab ───────────────────────────────────────────────────────────────

function WeightTab({
  logs,
  unit,
  onAdd,
  onDelete,
}: {
  logs: BodyWeightLog[];
  unit: 'kg' | 'lbs';
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const chartData = [...logs].reverse().slice(-30);

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Body Weight</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Ionicons name="add" size={16} color={Colors.accent} />
          <Text style={styles.addBtnText}>Log Today</Text>
        </TouchableOpacity>
      </View>

      {/* Latest stats */}
      {logs.length > 0 && (
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <StatBox
              label="Latest"
              value={`${(toDisplayWeightNumber(logs[0].weightKg, unit) ?? 0).toFixed(1)} ${unit}`}
            />
            {logs[0].bodyFatPct && (
              <StatBox label="Body Fat" value={`${logs[0].bodyFatPct}%`} />
            )}
            {logs.length >= 2 && (() => {
              const curr = toDisplayWeightNumber(logs[0].weightKg, unit) ?? 0;
              const prev = toDisplayWeightNumber(logs[1].weightKg, unit) ?? 0;
              const diff = curr - prev;
              return (
                <StatBox
                  label="Change"
                  value={`${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${unit}`}
                  positive={logs[0].weightKg < logs[1].weightKg}
                />
              );
            })()}
          </View>
        </Card>
      )}

      {/* Weight chart */}
      {chartData.length >= 2 && (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>30-Day Trend</Text>
          <WeightChart data={chartData} unit={unit} />
        </Card>
      )}

      {/* Log list */}
      {logs.length === 0 ? (
        <Text style={styles.emptyText}>No weight logs yet. Tap "Log Today" to start!</Text>
      ) : (
        logs.map((log) => (
          <TouchableOpacity
            key={log.id}
            style={styles.logRow}
            onLongPress={() => onDelete(log.id)}
          >
            <View>
              <Text style={styles.logDate}>{format(new Date(log.date), 'EEE, MMM d')}</Text>
              {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={styles.logWeight}>
                {(toDisplayWeightNumber(log.weightKg, unit) ?? 0).toFixed(1)} {unit}
              </Text>
              {log.bodyFatPct ? (
                <Text style={styles.logBf}>{log.bodyFatPct}% BF</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))
      )}
    </>
  );
}

function WeightChart({
  data,
  unit,
}: {
  data: { date: string; weightKg: number }[];
  unit: 'kg' | 'lbs';
}) {
  const weights = data.map((d) => toDisplayWeightNumber(d.weightKg, unit) ?? 0);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * CHART_W;
    const y = CHART_H - (((toDisplayWeightNumber(d.weightKg, unit) ?? 0) - min) / range) * (CHART_H - 20) - 10;
    return { x, y };
  });

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width={CHART_W} height={CHART_H + 4}>
        <Polyline
          points={polyline}
          fill="none"
          stroke={Colors.accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={Colors.accent} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.axisLabel}>{format(new Date(data[0].date), 'MMM d')}</Text>
        <Text style={styles.axisLabel}>{format(new Date(data[data.length - 1].date), 'MMM d')}</Text>
      </View>
    </View>
  );
}

// ─── Sleep Tab ────────────────────────────────────────────────────────────────

function SleepTab({
  logs,
  onAdd,
  onDelete,
}: {
  logs: SleepLog[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const avgDuration =
    logs.length > 0 ? logs.reduce((s, l) => s + l.durationMinutes, 0) / logs.length : 0;
  const avgQuality =
    logs.length > 0 ? logs.reduce((s, l) => s + l.quality, 0) / logs.length : 0;

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sleep</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Ionicons name="add" size={16} color={Colors.accent} />
          <Text style={styles.addBtnText}>Log Sleep</Text>
        </TouchableOpacity>
      </View>

      {logs.length >= 3 && (
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <StatBox
              label="Avg Duration"
              value={`${Math.floor(avgDuration / 60)}h ${Math.round(avgDuration % 60)}m`}
            />
            <StatBox
              label="Avg Quality"
              value={`${QUALITY_LABELS[Math.round(avgQuality)]} ${avgQuality.toFixed(1)}/5`}
            />
          </View>
        </Card>
      )}

      {logs.length === 0 ? (
        <Text style={styles.emptyText}>No sleep logs yet. Tap "Log Sleep" to start!</Text>
      ) : (
        logs.map((log) => {
          const h = Math.floor(log.durationMinutes / 60);
          const m = log.durationMinutes % 60;
          return (
            <TouchableOpacity
              key={log.id}
              style={styles.logRow}
              onLongPress={() => onDelete(log.id)}
            >
              <View>
                <Text style={styles.logDate}>{format(new Date(log.date), 'EEE, MMM d')}</Text>
                <Text style={styles.logSleepTime}>
                  {log.bedTime} → {log.wakeTime}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={styles.logWeight}>{h}h {m}m</Text>
                <Text style={styles.logBf}>{QUALITY_LABELS[log.quality]} {log.quality}/5</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </>
  );
}

function StatBox({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, positive !== undefined && { color: positive ? Colors.success : Colors.danger }]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabs: {
    flexDirection: 'row',
    margin: Spacing.base,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
  },
  tabActive: { backgroundColor: Colors.accent },
  tabText: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.textPrimary },
  content: { padding: Spacing.base, paddingTop: 0, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentMuted,
  },
  addBtnText: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.accent },
  statsCard: {},
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  statValue: { fontSize: Typography.sizes.lg, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  chartCard: { gap: Spacing.sm },
  chartTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  axisLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  emptyText: {
    fontSize: Typography.sizes.base,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  logDate: { fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.textPrimary },
  logNotes: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  logSleepTime: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  logWeight: { fontSize: Typography.sizes.lg, fontWeight: '700', color: Colors.textPrimary },
  logBf: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  form: { gap: Spacing.md },
  formRow: { flexDirection: 'row', gap: Spacing.sm },
  formLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    minHeight: 48,
  },
  qualityRow: { flexDirection: 'row', gap: Spacing.sm },
  qualityBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
  qualityBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accentMuted },
  qualityEmoji: { fontSize: 20 },
  qualityNum: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  logBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  logBtnText: { color: 'white', fontWeight: '700', fontSize: Typography.sizes.base },
});
