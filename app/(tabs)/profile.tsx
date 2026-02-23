import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSettingsStore } from '../../src/store/settingsStore';
import { Card } from '../../src/components/ui/Card';
import { AppLogo } from '../../src/components/ui/AppLogo';
import { Divider } from '../../src/components/ui/Divider';
import { Colors, Typography, Spacing, Radius, SCROLL_BOTTOM_PADDING } from '../../src/constants/theme';
import { ActivityLevel, GoalType, Sex } from '../../src/types';
import {
  fromDisplayWeight,
  toDisplayWeightNumber,
  cmToFtIn,
  ftInToCm,
  calcBMI,
  bmiCategory,
} from '../../src/constants/units';
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

const GOAL_ICONS: Record<GoalType, React.ComponentProps<typeof Ionicons>['name']> = {
  lose_fat: 'trending-down',
  maintain: 'swap-horizontal',
  build_muscle: 'trending-up',
};

const ACTIVITY_DESCS: Record<ActivityLevel, string> = {
  sedentary: 'Desk job, little/no exercise',
  lightly_active: '1–3 days/week light exercise',
  moderately_active: '3–5 days/week moderate exercise',
  very_active: '6–7 days/week hard training',
  extra_active: 'Athlete / twice-daily training',
};

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

export default function ProfileScreen() {
  const { settings, update } = useSettingsStore();
  const isImperial = settings.weightUnit === 'lbs';

  const ftIn = settings.heightCm ? cmToFtIn(settings.heightCm) : { ft: 0, inches: 0 };
  const [heightFt, setHeightFt] = useState(ftIn.ft > 0 ? String(ftIn.ft) : '');
  const [heightIn, setHeightIn] = useState(ftIn.inches > 0 ? String(ftIn.inches) : '');

  function handleUnitChange(unit: 'kg' | 'lbs') {
    update({ weightUnit: unit });
    if (unit === 'lbs' && settings.heightCm) {
      const { ft, inches } = cmToFtIn(settings.heightCm);
      setHeightFt(String(ft));
      setHeightIn(String(inches));
    }
  }

  function saveHeightImperial(ft: string, inches: string) {
    const f = parseInt(ft) || 0;
    const i = parseInt(inches) || 0;
    if (f > 0 || i > 0) update({ heightCm: ftInToCm(f, i) });
  }

  function handleGoalChange(key: keyof typeof settings, raw: string) {
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) update({ [key]: val });
  }

  // TDEE — use current weight for BMR, target weight for macro scaling
  const bmrWeightKg = settings.currentWeightKg ?? settings.targetWeightKg ?? 0;
  const macroWeightKg = settings.targetWeightKg ?? bmrWeightKg;
  const canComputeTDEE = !!settings.heightCm && !!settings.ageYears && !!settings.sex && bmrWeightKg > 0;

  let tdee: number | null = null;
  let suggestedCalories: number | null = null;
  let suggestedMacros: { protein: number; carbs: number; fat: number } | null = null;

  if (canComputeTDEE && settings.heightCm && settings.ageYears && settings.sex) {
    tdee = calcTDEE(bmrWeightKg, settings.heightCm, settings.ageYears, settings.sex, settings.activityLevel);
    suggestedCalories = calcTargetCalories(tdee, settings.goalType);
    suggestedMacros = calcMacros(suggestedCalories, macroWeightKg, settings.goalType);
  }

  const bmi = settings.currentWeightKg && settings.heightCm
    ? calcBMI(settings.currentWeightKg, settings.heightCm)
    : null;
  const bmiInfo = bmi ? bmiCategory(bmi) : null;

  function applyTDEESuggestion() {
    if (!suggestedCalories || !suggestedMacros) return;
    update({
      dailyCalorieGoal: suggestedCalories,
      dailyProteinGoal: suggestedMacros.protein,
      dailyCarbsGoal: suggestedMacros.carbs,
      dailyFatGoal: suggestedMacros.fat,
    });
    Alert.alert('Goals Updated', 'Your daily nutrition goals have been set from your TDEE.');
  }

  async function pickProfilePhoto() {
    Alert.alert('Profile Photo', 'Choose source', [
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images', quality: 0.85, allowsEditing: true, aspect: [1, 1],
          });
          if (!result.canceled && result.assets[0]) update({ profilePhotoUri: result.assets[0].uri });
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images', quality: 0.85, allowsEditing: true, aspect: [1, 1],
          });
          if (!result.canceled && result.assets[0]) update({ profilePhotoUri: result.assets[0].uri });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const currentWeightDisplay = settings.currentWeightKg
    ? String(toDisplayWeightNumber(settings.currentWeightKg, settings.weightUnit) ?? '') : '';
  const targetWeightDisplay = settings.targetWeightKg
    ? String(toDisplayWeightNumber(settings.targetWeightKg, settings.weightUnit) ?? '') : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Avatar + Name */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickProfilePhoto} activeOpacity={0.8}>
            {settings.profilePhotoUri ? (
              <Image source={{ uri: settings.profilePhotoUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {settings.displayName ? getInitials(settings.displayName) : '?'}
                </Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={11} color="white" />
            </View>
          </TouchableOpacity>
          <NameInput value={settings.displayName} onSave={(v) => update({ displayName: v })} />
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* ── Body Stats ── */}
        <SectionHeader label="Body Stats" />
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Biological Sex</Text>
            <View style={styles.segmented}>
              {(['male', 'female'] as Sex[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.segBtn, settings.sex === s && styles.segBtnActive]}
                  onPress={() => update({ sex: s })}
                >
                  <Ionicons
                    name={s === 'male' ? 'male' : 'female'}
                    size={12}
                    color={settings.sex === s ? 'white' : Colors.textSecondary}
                    style={{ marginRight: 3 }}
                  />
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
              onBlur={(v) => { const n = parseInt(v); if (n > 0 && n < 120) update({ ageYears: n }); }}
              flex
            />
            {isImperial ? (
              <>
                <GoalInput
                  label="Height (ft)"
                  unit="ft"
                  value={heightFt}
                  onChangeText={setHeightFt}
                  onBlur={(v) => { setHeightFt(v); saveHeightImperial(v, heightIn); }}
                  flex
                />
                <GoalInput
                  label="Height (in)"
                  unit="in"
                  value={heightIn}
                  onChangeText={setHeightIn}
                  onBlur={(v) => { setHeightIn(v); saveHeightImperial(heightFt, v); }}
                  flex
                />
              </>
            ) : (
              <GoalInput
                label="Height"
                unit="cm"
                value={settings.heightCm ? String(settings.heightCm) : ''}
                onBlur={(v) => { const n = parseFloat(v); if (n > 0) update({ heightCm: n }); }}
                flex
              />
            )}
          </View>
          <Divider />

          <View style={styles.statsRow}>
            <GoalInput
              label="Current Weight"
              unit={settings.weightUnit}
              value={currentWeightDisplay}
              onBlur={(v) => {
                const n = parseFloat(v);
                if (n > 0) update({ currentWeightKg: fromDisplayWeight(n, settings.weightUnit) });
              }}
              flex
            />
            <GoalInput
              label="Goal Weight"
              unit={settings.weightUnit}
              value={targetWeightDisplay}
              onBlur={(v) => {
                const n = parseFloat(v);
                if (n > 0) update({ targetWeightKg: fromDisplayWeight(n, settings.weightUnit) });
              }}
              flex
            />
          </View>

          {bmi && bmiInfo && (
            <>
              <Divider />
              <View style={styles.bmiRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bmiLabel}>BMI</Text>
                  <Text style={styles.bmiHint}>Body Mass Index</Text>
                </View>
                <View style={[styles.bmiChip, { backgroundColor: `${bmiInfo.color}22`, borderColor: `${bmiInfo.color}55` }]}>
                  <Text style={[styles.bmiValue, { color: bmiInfo.color }]}>{bmi}</Text>
                  <Text style={[styles.bmiCat, { color: bmiInfo.color }]}>{bmiInfo.label}</Text>
                </View>
              </View>
            </>
          )}
        </Card>

        {/* ── Goal & Activity ── */}
        <SectionHeader label="Goal & Activity" />
        <Card style={styles.card}>
          <View style={styles.col}>
            <Text style={styles.rowLabel}>Your Goal</Text>
            <View style={styles.goalTypeRow}>
              {GOAL_TYPES.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.goalTypeBtn, settings.goalType === g && styles.goalTypeBtnActive]}
                  onPress={() => update({ goalType: g })}
                >
                  <Ionicons
                    name={GOAL_ICONS[g]}
                    size={15}
                    color={settings.goalType === g ? Colors.accentLight : Colors.textMuted}
                  />
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
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activityBtnText, settings.activityLevel === a && styles.activityBtnTextActive]}>
                      {ACTIVITY_LABELS[a]}
                    </Text>
                    <Text style={styles.activityDesc}>{ACTIVITY_DESCS[a]}</Text>
                  </View>
                  {settings.activityLevel === a && (
                    <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* TDEE suggestion */}
          {tdee && suggestedCalories && suggestedMacros ? (
            <>
              <Divider />
              <View style={styles.tdeeBox}>
                <Text style={styles.tdeeSectionLabel}>Estimated Daily Targets</Text>
                <View style={styles.tdeeStatsRow}>
                  <TdeeStat label="TDEE" value={String(tdee)} unit="kcal" />
                  <TdeeStat label="Target" value={String(suggestedCalories)} unit="kcal" accent />
                  <TdeeStat label="Protein" value={String(suggestedMacros.protein)} unit="g" />
                  <TdeeStat label="Carbs" value={String(suggestedMacros.carbs)} unit="g" />
                  <TdeeStat label="Fat" value={String(suggestedMacros.fat)} unit="g" />
                </View>
                <TouchableOpacity style={styles.applyBtn} onPress={applyTDEESuggestion}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                  <Text style={styles.applyBtnText}>Apply to Daily Goals</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.tdeePrompt}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.textMuted} />
              <Text style={styles.tdeePromptText}>
                Complete body stats above to get personalised calorie & macro targets.
              </Text>
            </View>
          )}
        </Card>

        {/* ── Daily Nutrition Goals ── */}
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
            <GoalInput label="Protein" unit="g" value={String(settings.dailyProteinGoal)} onBlur={(v) => handleGoalChange('dailyProteinGoal', v)} flex />
            <GoalInput label="Carbs" unit="g" value={String(settings.dailyCarbsGoal)} onBlur={(v) => handleGoalChange('dailyCarbsGoal', v)} flex />
            <GoalInput label="Fat" unit="g" value={String(settings.dailyFatGoal)} onBlur={(v) => handleGoalChange('dailyFatGoal', v)} flex />
          </View>
        </Card>

        {/* ── Preferences ── */}
        <SectionHeader label="Workout Preferences" />
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Units</Text>
            <View style={styles.segmented}>
              {(['kg', 'lbs'] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.segBtn, settings.weightUnit === u && styles.segBtnActive]}
                  onPress={() => handleUnitChange(u)}
                >
                  <Text style={[styles.segBtnText, settings.weightUnit === u && styles.segBtnTextActive]}>
                    {u === 'kg' ? 'Metric' : 'Imperial'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Divider />
          <View style={styles.col}>
            <Text style={styles.rowLabel}>Default Rest Timer</Text>
            <View style={styles.restRow}>
              {REST_TIMES.map((t) => {
                const mins = Math.floor(t / 60);
                const secs = t % 60;
                const label = secs === 0 ? `${mins}m` : `${mins > 0 ? `${mins}m ` : ''}${secs}s`;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.restBtn, settings.restTimerSeconds === t && styles.restBtnActive]}
                    onPress={() => update({ restTimerSeconds: t })}
                  >
                    <Text style={[styles.restBtnText, settings.restTimerSeconds === t && styles.restBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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

        {/* ── Health & Body ── */}
        <SectionHeader label="Health & Body" />
        <Card style={styles.card}>
          <NavRow
            icon="barbell-outline"
            iconColor={Colors.teal}
            label="Body Weight & Sleep Log"
            sublabel="Track weight trends, sleep quality & progress photos"
            onPress={() => router.push('/health')}
          />
        </Card>

        {/* ── Data ── */}
        <SectionHeader label="Data" />
        <Card style={styles.card}>
          <NavRow
            icon="share-outline"
            iconColor={Colors.mint}
            label="Export Weekly Data"
            sublabel="Download your workout and nutrition history as CSV"
            onPress={() => router.push('/export')}
          />
        </Card>

        {/* ── About ── */}
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

function NameInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => { setLocal(value); }, [value]);
  return (
    <TextInput
      value={local}
      onChangeText={setLocal}
      onBlur={() => { if (local.trim()) onSave(local.trim()); }}
      onSubmitEditing={() => { if (local.trim()) onSave(local.trim()); }}
      placeholder="Your Name"
      placeholderTextColor={Colors.textMuted}
      style={styles.nameInput}
      keyboardAppearance="dark"
      returnKeyType="done"
      maxLength={40}
    />
  );
}

function TdeeStat({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <View style={styles.tdeeStat}>
      <Text style={[styles.tdeeValue, accent && { color: Colors.accent }]}>{value}</Text>
      <Text style={styles.tdeeUnit}>{unit}</Text>
      <Text style={styles.tdeeLabel}>{label}</Text>
    </View>
  );
}

function GoalInput({
  label, unit, value, onBlur, onChangeText, flex,
}: {
  label: string; unit: string; value: string;
  onBlur: (v: string) => void; onChangeText?: (v: string) => void; flex?: boolean;
}) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => { setLocal(value); }, [value]);
  return (
    <View style={[styles.goalInput, flex && { flex: 1 }]}>
      <Text style={styles.goalLabel}>{label}</Text>
      <View style={styles.goalInputRow}>
        <TextInput
          value={local}
          onChangeText={(v) => { setLocal(v); onChangeText?.(v); }}
          onBlur={() => onBlur(local)}
          keyboardType="decimal-pad"
          keyboardAppearance="dark"
          style={styles.goalInputField}
          selectTextOnFocus
          returnKeyType="done"
        />
        <Text style={styles.goalUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function NavRow({
  icon, iconColor, label, sublabel, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string; label: string; sublabel?: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.navRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.navIconWrap, { backgroundColor: iconColor ? `${iconColor}20` : Colors.surfaceElevated }]}>
        <Ionicons name={icon} size={18} color={iconColor ?? Colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.navLabel}>{label}</Text>
        {sublabel ? <Text style={styles.navSublabel}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, gap: Spacing.sm },

  avatarSection: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  avatarWrap: { position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.surfaceElevated },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.accentMuted, borderWidth: 2, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: Typography.sizes.xxl, fontWeight: '700', color: Colors.accent },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  nameInput: {
    fontSize: Typography.sizes.xl, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'center', borderBottomWidth: 1.5, borderBottomColor: Colors.border,
    paddingBottom: 4, minWidth: 180,
  },
  avatarHint: { fontSize: Typography.sizes.xs, color: Colors.textMuted },

  sectionHeader: {
    fontSize: Typography.sizes.xs, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingTop: Spacing.sm, paddingHorizontal: Spacing.xs,
  },
  card: { gap: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.xs, gap: Spacing.sm,
  },
  col: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  rowLabel: { fontSize: Typography.sizes.base, color: Colors.textPrimary, fontWeight: '500' },

  segmented: {
    flexDirection: 'row', backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  segBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, minWidth: 50,
  },
  segBtnActive: { backgroundColor: Colors.accent },
  segBtnText: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.textSecondary },
  segBtnTextActive: { color: 'white' },

  bmiRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: Spacing.xs, gap: Spacing.md,
  },
  bmiLabel: { fontSize: Typography.sizes.sm, color: Colors.textPrimary, fontWeight: '600' },
  bmiHint: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  bmiChip: {
    borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    alignItems: 'center', minWidth: 72,
  },
  bmiValue: { fontSize: Typography.sizes.lg, fontWeight: '800' },
  bmiCat: { fontSize: Typography.sizes.xs, fontWeight: '600', marginTop: 1 },

  goalTypeRow: { flexDirection: 'row', gap: Spacing.xs },
  goalTypeBtn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', gap: 4,
  },
  goalTypeBtnActive: { backgroundColor: Colors.accentMuted, borderColor: Colors.accent },
  goalTypeBtnText: { fontSize: Typography.sizes.xs, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  goalTypeBtnTextActive: { color: Colors.accentLight },

  activityCol: { gap: Spacing.xs },
  activityBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: Radius.md, backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  activityBtnActive: { backgroundColor: Colors.accentMuted, borderColor: Colors.accent },
  activityBtnText: { fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.textSecondary },
  activityBtnTextActive: { color: Colors.accentLight },
  activityDesc: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },

  tdeeBox: { gap: Spacing.sm, paddingTop: Spacing.xs },
  tdeeSectionLabel: {
    fontSize: Typography.sizes.xs, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tdeeStatsRow: {
    flexDirection: 'row', gap: Spacing.xs,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.md,
  },
  tdeeStat: { flex: 1, alignItems: 'center', gap: 1 },
  tdeeValue: { fontSize: Typography.sizes.md, fontWeight: '800', color: Colors.textPrimary },
  tdeeUnit: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  tdeeLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.sm,
  },
  applyBtnText: { color: 'white', fontWeight: '700', fontSize: Typography.sizes.sm },
  tdeePrompt: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: Spacing.xs, paddingTop: Spacing.xs, opacity: 0.7,
  },
  tdeePromptText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textMuted, lineHeight: 18 },

  macroRow: { flexDirection: 'row', gap: Spacing.sm },
  goalInput: { gap: 4, paddingVertical: Spacing.xs },
  goalLabel: {
    fontSize: Typography.sizes.xs, color: Colors.textMuted,
    fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  goalInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  goalInputField: {
    flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs, fontSize: Typography.sizes.base, fontWeight: '600',
    color: Colors.textPrimary, minHeight: 38, textAlign: 'center',
  },
  goalUnit: { fontSize: Typography.sizes.sm, color: Colors.textMuted, minWidth: 28 },

  restRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  restBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
    minWidth: 46, alignItems: 'center',
  },
  restBtnActive: { backgroundColor: Colors.accentMuted, borderColor: Colors.accent },
  restBtnText: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.textSecondary },
  restBtnTextActive: { color: Colors.accentLight },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xs },
  navIconWrap: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: Typography.sizes.base, color: Colors.textPrimary, fontWeight: '600' },
  navSublabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },

  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  aboutAppName: { fontSize: Typography.sizes.md, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  aboutVersion: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
});
