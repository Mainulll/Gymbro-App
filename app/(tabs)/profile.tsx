import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../src/store/settingsStore';
import { Card } from '../../src/components/ui/Card';
import { AppLogo } from '../../src/components/ui/AppLogo';
import { Divider } from '../../src/components/ui/Divider';
import { Colors, Typography, Spacing, Radius, SCROLL_BOTTOM_PADDING } from '../../src/constants/theme';
import { ActivityLevel, GoalType, Sex } from '../../src/types';
import {
  calcTDEE,
  calcTargetCalories,
  calcMacros,
  ACTIVITY_LABELS,
  GOAL_LABELS,
} from '../../src/utils/tdee';

const REST_TIMES = [60, 90, 120, 180, 240];

const ACTIVITY_LEVELS: ActivityLevel[] = [
  'sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active',
];
const GOAL_TYPES: GoalType[] = ['lose_fat', 'maintain', 'build_muscle'];

export default function ProfileScreen() {
  const { settings, update } = useSettingsStore();

  function handleGoalChange(key: keyof typeof settings, raw: string) {
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) {
      update({ [key]: val });
    }
  }

  // Compute TDEE if enough data
  const canComputeTDEE =
    settings.heightCm &&
    settings.ageYears &&
    settings.sex &&
    settings.weightUnit;

  let tdee: number | null = null;
  let suggestedCalories: number | null = null;
  let suggestedMacros: { protein: number; carbs: number; fat: number } | null = null;

  if (canComputeTDEE && settings.heightCm && settings.ageYears && settings.sex) {
    // Use target weight if set, otherwise approximate from 70kg default
    const weightKg = settings.targetWeightKg ?? 70;
    tdee = calcTDEE(weightKg, settings.heightCm, settings.ageYears, settings.sex, settings.activityLevel);
    suggestedCalories = calcTargetCalories(tdee, settings.goalType);
    suggestedMacros = calcMacros(suggestedCalories, weightKg, settings.goalType);
  }

  function applyTDEESuggestion() {
    if (!suggestedCalories || !suggestedMacros) return;
    update({
      dailyCalorieGoal: suggestedCalories,
      dailyProteinGoal: suggestedMacros.protein,
      dailyCarbsGoal: suggestedMacros.carbs,
      dailyFatGoal: suggestedMacros.fat,
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.titleBadge}>
            <Ionicons name="person" size={14} color={Colors.accent} />
          </View>
        </View>

        {/* Body Stats */}
        <SectionHeader label="Body Stats" />
        <Card style={styles.card}>
          {/* Sex */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Biological Sex</Text>
            <View style={styles.segmented}>
              {(['male', 'female'] as Sex[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.segBtn, settings.sex === s && styles.segBtnActive]}
                  onPress={() => update({ sex: s })}
                >
                  <Text style={[styles.segBtnText, settings.sex === s && styles.segBtnTextActive]}>
                    {s === 'male' ? 'Male' : 'Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Divider />
          <View style={styles.statsRow}>
            <GoalInput
              label="Age"
              unit="yrs"
              value={settings.ageYears ? String(settings.ageYears) : ''}
              onBlur={(v) => { const n = parseInt(v); if (n > 0) update({ ageYears: n }); }}
              flex
            />
            <GoalInput
              label="Height"
              unit="cm"
              value={settings.heightCm ? String(settings.heightCm) : ''}
              onBlur={(v) => { const n = parseFloat(v); if (n > 0) update({ heightCm: n }); }}
              flex
            />
            <GoalInput
              label="Target Wt"
              unit={settings.weightUnit}
              value={settings.targetWeightKg
                ? String(settings.weightUnit === 'lbs'
                    ? Math.round(settings.targetWeightKg * 2.205)
                    : settings.targetWeightKg)
                : ''}
              onBlur={(v) => {
                const n = parseFloat(v);
                if (n > 0) {
                  update({ targetWeightKg: settings.weightUnit === 'lbs' ? n / 2.205 : n });
                }
              }}
              flex
            />
          </View>
        </Card>

        {/* Body Composition Goal */}
        <SectionHeader label="Body Composition Goal" />
        <Card style={styles.card}>
          <View style={styles.col}>
            <Text style={styles.rowLabel}>Goal</Text>
            <View style={styles.goalTypeRow}>
              {GOAL_TYPES.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.goalTypeBtn, settings.goalType === g && styles.goalTypeBtnActive]}
                  onPress={() => update({ goalType: g })}
                >
                  <Text style={[styles.goalTypeBtnText, settings.goalType === g && styles.goalTypeBtnTextActive]}>
                    {GOAL_LABELS[g]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Divider />
          <View style={styles.col}>
            <Text style={styles.rowLabel}>Activity Level</Text>
            <View style={styles.activityCol}>
              {ACTIVITY_LEVELS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.activityBtn, settings.activityLevel === a && styles.activityBtnActive]}
                  onPress={() => update({ activityLevel: a })}
                >
                  <Text style={[styles.activityBtnText, settings.activityLevel === a && styles.activityBtnTextActive]}>
                    {ACTIVITY_LABELS[a]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* TDEE result */}
          {tdee && suggestedCalories && suggestedMacros && (
            <>
              <Divider />
              <View style={styles.tdeeBox}>
                <View style={styles.tdeeRow}>
                  <View style={styles.tdeeStat}>
                    <Text style={styles.tdeeValue}>{tdee}</Text>
                    <Text style={styles.tdeeLabel}>TDEE</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
                  <View style={styles.tdeeStat}>
                    <Text style={[styles.tdeeValue, { color: Colors.accent }]}>{suggestedCalories}</Text>
                    <Text style={styles.tdeeLabel}>Target kcal</Text>
                  </View>
                  <View style={styles.tdeeMacros}>
                    <Text style={styles.tdeeMacroText}>P {suggestedMacros.protein}g</Text>
                    <Text style={styles.tdeeMacroText}>C {suggestedMacros.carbs}g</Text>
                    <Text style={styles.tdeeMacroText}>F {suggestedMacros.fat}g</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.applyBtn} onPress={applyTDEESuggestion}>
                  <Text style={styles.applyBtnText}>Apply to Daily Goals</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Card>

        {/* Daily Goals (manual override) */}
        <SectionHeader label="Daily Nutrition Goals" />
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

        {/* Health & Body */}
        <SectionHeader label="Health & Body" />
        <Card style={styles.card}>
          <NavRow
            icon="fitness-outline"
            iconColor={Colors.teal}
            label="Body Weight & Sleep Log"
            onPress={() => router.push('/health')}
          />
        </Card>

        {/* Data */}
        <SectionHeader label="Data" />
        <Card style={styles.card}>
          <NavRow
            icon="share-outline"
            iconColor={Colors.mint}
            label="Export Weekly Data"
            onPress={() => router.push('/export')}
          />
        </Card>

        {/* About */}
        <SectionHeader label="About" />
        <Card glass style={styles.card}>
          <View style={styles.aboutRow}>
            <AppLogo size={48} rounded />
            <View style={{ flex: 1 }}>
              <Text style={styles.aboutAppName}>GymBro</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0 · Built with ❤️</Text>
            </View>
          </View>
        </Card>

        <View style={{ height: SCROLL_BOTTOM_PADDING }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
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
  iconColor,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.navIconWrap, iconColor ? { backgroundColor: `${iconColor}20` } : null]}>
        <Ionicons name={icon} size={16} color={iconColor ?? Colors.textSecondary} />
      </View>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, gap: Spacing.sm },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  titleBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.3)',
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
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
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
    minWidth: 50,
    alignItems: 'center',
  },
  segBtnActive: { backgroundColor: Colors.accent },
  segBtnText: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.textSecondary },
  segBtnTextActive: { color: Colors.textPrimary },
  goalTypeRow: { flexDirection: 'row', gap: Spacing.xs },
  goalTypeBtn: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  goalTypeBtnActive: { backgroundColor: Colors.accentMuted, borderColor: Colors.accent },
  goalTypeBtnText: { fontSize: Typography.sizes.xs, fontWeight: '600', color: Colors.textSecondary },
  goalTypeBtnTextActive: { color: Colors.accentLight },
  activityCol: { gap: Spacing.xs },
  activityBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityBtnActive: { backgroundColor: Colors.accentMuted, borderColor: Colors.accent },
  activityBtnText: { fontSize: Typography.sizes.sm, fontWeight: '500', color: Colors.textSecondary },
  activityBtnTextActive: { color: Colors.accentLight },
  tdeeBox: { gap: Spacing.sm },
  tdeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  tdeeStat: { alignItems: 'center', gap: 2 },
  tdeeValue: { fontSize: Typography.sizes.xl, fontWeight: '700', color: Colors.textPrimary },
  tdeeLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  tdeeMacros: { flex: 1, gap: 2, alignItems: 'flex-end' },
  tdeeMacroText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  applyBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  applyBtnText: { color: 'white', fontWeight: '700', fontSize: Typography.sizes.sm },
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
  navIconWrap: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  aboutAppName: {
    fontSize: Typography.sizes.md,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  aboutVersion: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
