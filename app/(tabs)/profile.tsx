import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../src/store/settingsStore';
import { Card } from '../../src/components/ui/Card';
import { Divider } from '../../src/components/ui/Divider';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';

const REST_TIMES = [60, 90, 120, 180, 240];

export default function ProfileScreen() {
  const { settings, update } = useSettingsStore();

  function handleGoalChange(key: keyof typeof settings, raw: string) {
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) {
      update({ [key]: val });
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {/* Goals */}
        <SectionHeader label="Daily Goals" />
        <Card style={styles.card}>
          <GoalInput
            label="Calories"
            unit="kcal"
            value={String(settings.dailyCalorieGoal)}
            onBlur={(v) => handleGoalChange('dailyCalorieGoal', v)}
          />
          <Divider />
          <View style={styles.macroRow}>
            <GoalInput
              label="Protein"
              unit="g"
              value={String(settings.dailyProteinGoal)}
              onBlur={(v) => handleGoalChange('dailyProteinGoal', v)}
              flex
            />
            <GoalInput
              label="Carbs"
              unit="g"
              value={String(settings.dailyCarbsGoal)}
              onBlur={(v) => handleGoalChange('dailyCarbsGoal', v)}
              flex
            />
            <GoalInput
              label="Fat"
              unit="g"
              value={String(settings.dailyFatGoal)}
              onBlur={(v) => handleGoalChange('dailyFatGoal', v)}
              flex
            />
          </View>
        </Card>

        {/* Workout Prefs */}
        <SectionHeader label="Workout Preferences" />
        <Card style={styles.card}>
          {/* Weight Unit */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Weight Unit</Text>
            <View style={styles.segmented}>
              {(['kg', 'lbs'] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.segBtn, settings.weightUnit === u && styles.segBtnActive]}
                  onPress={() => update({ weightUnit: u })}
                >
                  <Text style={[styles.segBtnText, settings.weightUnit === u && styles.segBtnTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Divider />

          {/* Rest Timer */}
          <View style={styles.col}>
            <Text style={styles.rowLabel}>Default Rest Timer</Text>
            <View style={styles.restRow}>
              {REST_TIMES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.restBtn, settings.restTimerSeconds === t && styles.restBtnActive]}
                  onPress={() => update({ restTimerSeconds: t })}
                >
                  <Text style={[styles.restBtnText, settings.restTimerSeconds === t && styles.restBtnTextActive]}>
                    {t}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Divider />

          {/* Haptic Feedback */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Haptic Feedback</Text>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(v) => update({ hapticFeedback: v })}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.textPrimary}
            />
          </View>
        </Card>

        {/* Data */}
        <SectionHeader label="Data" />
        <Card style={styles.card}>
          <NavRow
            icon="share-outline"
            label="Export Weekly Data"
            onPress={() => router.push('/export')}
          />
        </Card>

        {/* About */}
        <SectionHeader label="About" />
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
        </Card>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text style={styles.sectionHeader}>{label}</Text>
  );
}

function GoalInput({
  label,
  unit,
  value,
  onBlur,
  flex,
}: {
  label: string;
  unit: string;
  value: string;
  onBlur: (v: string) => void;
  flex?: boolean;
}) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => { setLocal(value); }, [value]);

  return (
    <View style={[styles.goalInput, flex && { flex: 1 }]}>
      <Text style={styles.goalLabel}>{label}</Text>
      <View style={styles.goalInputRow}>
        <TextInput
          value={local}
          onChangeText={setLocal}
          onBlur={() => onBlur(local)}
          keyboardType="decimal-pad"
          keyboardAppearance="dark"
          style={styles.goalInputField}
          selectTextOnFocus
        />
        <Text style={styles.goalUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function NavRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={18} color={Colors.textSecondary} />
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, gap: Spacing.sm },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  card: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  col: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  rowLabel: {
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  segBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minWidth: 44,
    alignItems: 'center',
  },
  segBtnActive: { backgroundColor: Colors.accent },
  segBtnText: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.textSecondary },
  segBtnTextActive: { color: Colors.textPrimary },
  restRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  restBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  restBtnActive: { backgroundColor: Colors.accentMuted, borderColor: Colors.accent },
  restBtnText: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.textSecondary },
  restBtnTextActive: { color: Colors.accentLight },
  macroRow: { flexDirection: 'row', gap: Spacing.sm },
  goalInput: { gap: 4, paddingVertical: Spacing.xs },
  goalLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  goalInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  goalInputField: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    minHeight: 38,
    textAlign: 'center',
  },
  goalUnit: { fontSize: Typography.sizes.sm, color: Colors.textMuted, minWidth: 28 },
});
