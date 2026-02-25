import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
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
import { Colors, SCROLL_BOTTOM_PADDING } from '../../src/constants/theme';
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
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }} keyboardShouldPersistTaps="handled">

        {/* Avatar + Name */}
        <View className="items-center py-5 gap-2">
          <TouchableOpacity onPress={pickProfilePhoto} activeOpacity={0.8}>
            {settings.profilePhotoUri ? (
              <Image
                source={{ uri: settings.profilePhotoUri }}
                className="rounded-full bg-surface-elevated"
                style={{ width: 90, height: 90 }}
              />
            ) : (
              <View
                className="rounded-full bg-accent/15 border-2 border-accent items-center justify-center"
                style={{ width: 90, height: 90 }}
              >
                <Text className="text-[28px] font-bold text-accent">
                  {settings.displayName ? getInitials(settings.displayName) : '?'}
                </Text>
              </View>
            )}
            <View
              className="absolute bg-accent items-center justify-center"
              style={{ bottom: 2, right: 2, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.background }}
            >
              <Ionicons name="camera" size={11} color="white" />
            </View>
          </TouchableOpacity>
          <NameInput value={settings.displayName} onSave={(v) => update({ displayName: v })} />
          <Text className="text-[11px] text-text-muted">Tap to change photo</Text>
        </View>

        {/* ── Body Stats ── */}
        <SectionHeader label="Body Stats" />
        <Card style={{ gap: 8 }}>
          <View className="flex-row items-center justify-between py-1 gap-2">
            <Text className="text-[15px] text-text-primary font-medium">Biological Sex</Text>
            <View className="flex-row bg-surface-elevated rounded-lg border border-border overflow-hidden">
              {(['male', 'female'] as Sex[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  className={`flex-row items-center px-3 py-1 ${settings.sex === s ? 'bg-accent' : ''}`}
                  style={{ minWidth: 50 }}
                  onPress={() => update({ sex: s })}
                >
                  <Ionicons
                    name={s === 'male' ? 'male' : 'female'}
                    size={12}
                    color={settings.sex === s ? 'white' : Colors.textSecondary}
                    style={{ marginRight: 3 }}
                  />
                  <Text className={`text-[13px] font-semibold ${settings.sex === s ? 'text-white' : 'text-text-secondary'}`}>
                    {s === 'male' ? 'Male' : 'Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Divider />

          <View className="flex-row gap-2">
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

          <View className="flex-row gap-2">
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
              <View className="flex-row items-center justify-between py-1 gap-3">
                <View style={{ flex: 1 }}>
                  <Text className="text-[13px] text-text-primary font-semibold">BMI</Text>
                  <Text className="text-[11px] text-text-muted" style={{ marginTop: 2 }}>Body Mass Index</Text>
                </View>
                <View
                  className="rounded-xl border items-center"
                  style={{ backgroundColor: `${bmiInfo.color}22`, borderColor: `${bmiInfo.color}55`, paddingHorizontal: 12, paddingVertical: 4, minWidth: 72 }}
                >
                  <Text className="text-[20px] font-extrabold" style={{ color: bmiInfo.color }}>{bmi}</Text>
                  <Text className="text-[11px] font-semibold" style={{ marginTop: 1, color: bmiInfo.color }}>{bmiInfo.label}</Text>
                </View>
              </View>
            </>
          )}
        </Card>

        {/* ── Goal & Activity ── */}
        <SectionHeader label="Goal & Activity" />
        <Card style={{ gap: 8 }}>
          <View className="gap-2 py-1">
            <Text className="text-[15px] text-text-primary font-medium">Your Goal</Text>
            <View className="flex-row gap-1">
              {GOAL_TYPES.map((g) => (
                <TouchableOpacity
                  key={g}
                  className={`flex-1 py-2 rounded-xl border items-center ${settings.goalType === g ? 'bg-accent/15 border-accent' : 'bg-surface-elevated border-border'}`}
                  style={{ gap: 4 }}
                  onPress={() => update({ goalType: g })}
                >
                  <Ionicons
                    name={GOAL_ICONS[g]}
                    size={15}
                    color={settings.goalType === g ? Colors.accentLight : Colors.textMuted}
                  />
                  <Text className={`text-[11px] font-semibold text-center ${settings.goalType === g ? 'text-accent-light' : 'text-text-secondary'}`}>
                    {GOAL_LABELS[g]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Divider />
          <View className="gap-2 py-1">
            <Text className="text-[15px] text-text-primary font-medium">Activity Level</Text>
            <View className="gap-1">
              {ACTIVITY_LEVELS.map((a) => (
                <TouchableOpacity
                  key={a}
                  className={`flex-row items-center py-2 px-3 rounded-xl border gap-2 ${settings.activityLevel === a ? 'bg-accent/15 border-accent' : 'bg-surface-elevated border-border'}`}
                  onPress={() => update({ activityLevel: a })}
                >
                  <View style={{ flex: 1 }}>
                    <Text className={`text-[15px] font-semibold ${settings.activityLevel === a ? 'text-accent-light' : 'text-text-secondary'}`}>
                      {ACTIVITY_LABELS[a]}
                    </Text>
                    <Text className="text-[11px] text-text-muted" style={{ marginTop: 1 }}>{ACTIVITY_DESCS[a]}</Text>
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
              <View className="gap-2 pt-1">
                <Text className="text-[11px] font-bold text-text-muted uppercase" style={{ letterSpacing: 0.5 }}>
                  Estimated Daily Targets
                </Text>
                <View className="flex-row gap-1 bg-surface-elevated rounded-xl p-3">
                  <TdeeStat label="TDEE" value={String(tdee)} unit="kcal" />
                  <TdeeStat label="Target" value={String(suggestedCalories)} unit="kcal" accent />
                  <TdeeStat label="Protein" value={String(suggestedMacros.protein)} unit="g" />
                  <TdeeStat label="Carbs" value={String(suggestedMacros.carbs)} unit="g" />
                  <TdeeStat label="Fat" value={String(suggestedMacros.fat)} unit="g" />
                </View>
                <TouchableOpacity
                  className="flex-row items-center justify-center gap-1 bg-accent rounded-xl py-2"
                  onPress={applyTDEESuggestion}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                  <Text className="text-white font-bold text-[13px]">Apply to Daily Goals</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View className="flex-row items-start gap-1 pt-1" style={{ opacity: 0.7 }}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.textMuted} />
              <Text className="flex-1 text-[13px] text-text-muted" style={{ lineHeight: 18 }}>
                Complete body stats above to get personalised calorie & macro targets.
              </Text>
            </View>
          )}
        </Card>

        {/* ── Daily Nutrition Goals ── */}
        <SectionHeader label="Daily Nutrition Goals" />
        <Card style={{ gap: 8 }}>
          <GoalInput
            label="Calories"
            unit="kcal"
            value={String(settings.dailyCalorieGoal)}
            onBlur={(v) => handleGoalChange('dailyCalorieGoal', v)}
          />
          <Divider />
          <View className="flex-row gap-2">
            <GoalInput label="Protein" unit="g" value={String(settings.dailyProteinGoal)} onBlur={(v) => handleGoalChange('dailyProteinGoal', v)} flex />
            <GoalInput label="Carbs" unit="g" value={String(settings.dailyCarbsGoal)} onBlur={(v) => handleGoalChange('dailyCarbsGoal', v)} flex />
            <GoalInput label="Fat" unit="g" value={String(settings.dailyFatGoal)} onBlur={(v) => handleGoalChange('dailyFatGoal', v)} flex />
          </View>
        </Card>

        {/* ── Preferences ── */}
        <SectionHeader label="Workout Preferences" />
        <Card style={{ gap: 8 }}>
          <View className="flex-row items-center justify-between py-1 gap-2">
            <Text className="text-[15px] text-text-primary font-medium">Units</Text>
            <View className="flex-row bg-surface-elevated rounded-lg border border-border overflow-hidden">
              {(['kg', 'lbs'] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  className={`flex-row items-center px-3 py-1 ${settings.weightUnit === u ? 'bg-accent' : ''}`}
                  style={{ minWidth: 50 }}
                  onPress={() => handleUnitChange(u)}
                >
                  <Text className={`text-[13px] font-semibold ${settings.weightUnit === u ? 'text-white' : 'text-text-secondary'}`}>
                    {u === 'kg' ? 'Metric' : 'Imperial'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Divider />
          <View className="gap-2 py-1">
            <Text className="text-[15px] text-text-primary font-medium">Default Rest Timer</Text>
            <View className="flex-row gap-2 flex-wrap">
              {REST_TIMES.map((t) => {
                const mins = Math.floor(t / 60);
                const secs = t % 60;
                const label = secs === 0 ? `${mins}m` : `${mins > 0 ? `${mins}m ` : ''}${secs}s`;
                return (
                  <TouchableOpacity
                    key={t}
                    className={`px-3 py-1 rounded-lg border items-center ${settings.restTimerSeconds === t ? 'bg-accent/15 border-accent' : 'bg-surface-elevated border-border'}`}
                    style={{ minWidth: 46 }}
                    onPress={() => update({ restTimerSeconds: t })}
                  >
                    <Text className={`text-[13px] font-semibold ${settings.restTimerSeconds === t ? 'text-accent-light' : 'text-text-secondary'}`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <Divider />
          <View className="flex-row items-center justify-between py-1 gap-2">
            <Text className="text-[15px] text-text-primary font-medium">Haptic Feedback</Text>
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
        <Card style={{ gap: 8 }}>
          <NavRow
            icon="barbell-outline"
            iconColor={Colors.teal}
            label="Body Weight & Sleep Log"
            sublabel="Track weight trends, sleep quality & progress photos"
            onPress={() => router.push('/health')}
          />
        </Card>

        {/* ── Community ── */}
        <SectionHeader label="Community" />
        <Card style={{ gap: 8 }}>
          <NavRow
            icon="location-outline"
            iconColor={Colors.teal}
            label="Home Gym"
            sublabel={settings.homeGymName || 'Tap to set your home gym'}
            onPress={() => router.push('/gym/select')}
          />
        </Card>

        {/* ── Data ── */}
        <SectionHeader label="Data" />
        <Card style={{ gap: 8 }}>
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
        <Card glass style={{ gap: 8 }}>
          <View className="flex-row items-center gap-3">
            <AppLogo size={48} rounded />
            <View style={{ flex: 1 }}>
              <Text className="text-[17px] font-extrabold text-text-primary" style={{ letterSpacing: -0.5 }}>
                GymBro
              </Text>
              <Text className="text-[11px] text-text-muted" style={{ marginTop: 2 }}>
                Version 1.0.0 · Built with ❤️
              </Text>
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
  return (
    <Text className="text-[11px] font-bold text-text-muted uppercase pt-2 px-1" style={{ letterSpacing: 0.8 }}>
      {label}
    </Text>
  );
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
      className="text-[24px] font-bold text-text-primary text-center"
      style={{ borderBottomWidth: 1.5, borderBottomColor: Colors.border, paddingBottom: 4, minWidth: 180 }}
      keyboardAppearance="dark"
      returnKeyType="done"
      maxLength={40}
    />
  );
}

function TdeeStat({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <View className="flex-1 items-center" style={{ gap: 1 }}>
      <Text className={`text-[17px] font-extrabold ${accent ? 'text-accent' : 'text-text-primary'}`}>{value}</Text>
      <Text className="text-[11px] text-text-muted">{unit}</Text>
      <Text className="text-[10px] text-text-muted uppercase" style={{ letterSpacing: 0.3 }}>{label}</Text>
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
    <View className="py-1" style={{ gap: 4, ...(flex ? { flex: 1 } : {}) }}>
      <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
        {label}
      </Text>
      <View className="flex-row items-center gap-1">
        <TextInput
          value={local}
          onChangeText={(v) => { setLocal(v); onChangeText?.(v); }}
          onBlur={() => onBlur(local)}
          keyboardType="decimal-pad"
          keyboardAppearance="dark"
          className="flex-1 bg-surface-elevated rounded-lg border border-border text-[15px] font-semibold text-text-primary text-center"
          style={{ paddingHorizontal: 8, paddingVertical: 4, minHeight: 38 }}
          selectTextOnFocus
          returnKeyType="done"
        />
        <Text className="text-[13px] text-text-muted" style={{ minWidth: 28 }}>{unit}</Text>
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
    <TouchableOpacity className="flex-row items-center gap-3 py-1" onPress={onPress} activeOpacity={0.7}>
      <View
        className="w-9 h-9 rounded-xl items-center justify-center"
        style={{ backgroundColor: iconColor ? `${iconColor}20` : Colors.surfaceElevated }}
      >
        <Ionicons name={icon} size={18} color={iconColor ?? Colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text className="text-[15px] text-text-primary font-semibold">{label}</Text>
        {sublabel ? (
          <Text className="text-[11px] text-text-muted" style={{ marginTop: 2 }}>{sublabel}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}
