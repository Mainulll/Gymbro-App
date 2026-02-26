import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCalorieStore } from '../../src/store/calorieStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { CalorieEntry, MealType } from '../../src/types';
import { ProgressRing } from '../../src/components/ui/ProgressRing';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Card } from '../../src/components/ui/Card';
import { Colors, SCROLL_BOTTOM_PADDING } from '../../src/constants/theme';
import { formatDateISO } from '../../src/utils/date';
import {
  consumePendingCaloriePrefill,
  setPendingCaloriePrefill,
} from '../../src/utils/caloriePrefill';
import { format, addDays, subDays } from 'date-fns';
import { FastingState, loadFastingState, startFast, endFast, formatElapsed } from '../../src/utils/fastingTimer';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};
const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '☀️',
  lunch: '🥗',
  dinner: '🌙',
  snack: '🍎',
};
const MEAL_COLORS: Record<MealType, string> = {
  breakfast: Colors.amber,
  lunch: Colors.teal,
  dinner: Colors.coral,
  snack: Colors.pink,
};

// Alcohol helpers — 7 kcal/g pure ethanol, ethanol density 0.789 g/ml
function alcoholKcalFromVolABV(volumeMl: number, abvPct: number): number {
  return Math.round(volumeMl * (abvPct / 100) * 0.789 * 7);
}
const QUICK_DRINKS = [
  { label: '🍺 Beer', sub: '330ml 4.5%', kcal: alcoholKcalFromVolABV(330, 4.5), name: '🍺 Beer (330ml, 4.5%)' },
  { label: '🍷 Wine', sub: '150ml 13%', kcal: alcoholKcalFromVolABV(150, 13), name: '🍷 Wine (150ml, 13%)' },
  { label: '🥃 Spirit', sub: '30ml 40%', kcal: alcoholKcalFromVolABV(30, 40), name: '🥃 Spirit (30ml, 40%)' },
  { label: '🍺 Pint', sub: '568ml 4.5%', kcal: alcoholKcalFromVolABV(568, 4.5), name: '🍺 Beer Pint (568ml)' },
];

export default function CaloriesScreen() {
  const { entries, summary, loadDay, addEntry, removeEntry } = useCalorieStore();
  const settings = useSettingsStore((s) => s.settings);
  const [viewDate, setViewDate] = useState(new Date());

  // Alcohol inline state
  const [showAlcohol, setShowAlcohol] = useState(false);
  const [alcoholTab, setAlcoholTab] = useState<'quick' | 'custom'>('quick');
  const [stdDrinks, setStdDrinks] = useState('');
  const [customVolMl, setCustomVolMl] = useState('');
  const [customAbv, setCustomAbv] = useState('');

  // Fasting timer state
  const [fastingState, setFastingState] = useState<FastingState>({ isActive: false, startedAt: null, targetHours: null });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showCustomFast, setShowCustomFast] = useState(false);
  const [customFastHours, setCustomFastHours] = useState('');

  // Fasting ticker — updates elapsed every minute while active
  useEffect(() => {
    if (!fastingState.isActive || !fastingState.startedAt) return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - new Date(fastingState.startedAt!).getTime());
    }, 60_000);
    return () => clearInterval(id);
  }, [fastingState.isActive, fastingState.startedAt]);

  useFocusEffect(
    React.useCallback(() => {
      loadDay(formatDateISO(viewDate));
      loadFastingState().then((fs) => {
        setFastingState(fs);
        if (fs.isActive && fs.startedAt) {
          setElapsedMs(Date.now() - new Date(fs.startedAt).getTime());
        }
      });
      // If user used search/barcode directly from a meal card button, re-stage the
      // prefill and navigate to the add screen where it will be consumed.
      const prefill = consumePendingCaloriePrefill();
      if (prefill) {
        const mealParam = (prefill.meal as MealType) || 'snack';
        setPendingCaloriePrefill(prefill);
        router.push({ pathname: '/calories/add', params: { meal: mealParam, date: formatDateISO(viewDate) } });
      }
    }, [viewDate]),
  );

  function goToPrevDay() { setViewDate((d) => subDays(d, 1)); }
  function goToNextDay() {
    const next = addDays(viewDate, 1);
    if (next <= new Date()) setViewDate(next);
  }

  const isToday = formatDateISO(viewDate) === formatDateISO(new Date());
  const dateLabel = isToday ? 'Today' : format(viewDate, 'MMM d, yyyy');

  const calorieProgress = summary.totalCalories / settings.dailyCalorieGoal;
  const remaining = Math.max(0, settings.dailyCalorieGoal - summary.totalCalories);

  function handleDeleteEntry(entry: CalorieEntry) {
    Alert.alert('Delete Entry', `Remove "${entry.foodName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeEntry(entry.id) },
    ]);
  }

  async function handleStartFast(hours: number | null) {
    const fs = await startFast(hours);
    setFastingState(fs);
    setElapsedMs(0);
    setShowCustomFast(false);
    setCustomFastHours('');
  }

  async function handleEndFast() {
    const fs = await endFast();
    setFastingState(fs);
    setElapsedMs(0);
  }

  async function logAlcohol(name: string, kcal: number) {
    if (kcal <= 0) return;
    await addEntry({
      date: formatDateISO(viewDate),
      mealType: 'snack',
      foodName: name,
      calories: kcal,
      proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0, saturatedFatG: 0,
      alcoholG: Math.round(kcal / 7),
      vitaminDMcg: null, vitaminB12Mcg: null, vitaminCMg: null,
      ironMg: null, calciumMg: null, magnesiumMg: null, potassiumMg: null, zincMg: null,
      servingSize: 1, servingUnit: 'serving',
    });
  }

  async function handleStdDrinks() {
    const n = parseFloat(stdDrinks);
    if (isNaN(n) || n <= 0) return;
    await logAlcohol(`🍻 ${n} standard drink${n !== 1 ? 's' : ''}`, Math.round(n * 70));
    setStdDrinks('');
  }

  async function handleCustomAlcohol() {
    const vol = parseFloat(customVolMl);
    const abv = parseFloat(customAbv);
    if (isNaN(vol) || isNaN(abv) || vol <= 0 || abv <= 0) return;
    const kcal = alcoholKcalFromVolABV(vol, abv);
    await logAlcohol(`🥂 Drink (${vol}ml, ${abv}% ABV)`, kcal);
    setCustomVolMl('');
    setCustomAbv('');
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with date nav */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={goToPrevDay} className="w-10 h-10 items-center justify-center">
            <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text className="text-[24px] font-bold text-text-primary">{dateLabel}</Text>
          <TouchableOpacity onPress={goToNextDay} className="w-10 h-10 items-center justify-center" disabled={isToday}>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isToday ? Colors.textMuted : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Daily summary */}
        <Card glass style={{ gap: 16 }}>
          <View className="flex-row items-center gap-4">
            <ProgressRing size={110} strokeWidth={10} progress={calorieProgress} color={Colors.pink}>
              <View className="items-center">
                <Text className="text-[20px] font-bold text-text-primary">{Math.round(summary.totalCalories)}</Text>
                <Text className="text-[11px] text-text-secondary">kcal</Text>
              </View>
            </ProgressRing>
            <View className="flex-1 gap-2">
              <SummaryRow label="Goal" value={`${settings.dailyCalorieGoal} kcal`} />
              <SummaryRow label="Consumed" value={`${Math.round(summary.totalCalories)} kcal`} />
              <SummaryRow label="Remaining" value={`${remaining} kcal`} highlight={remaining > 0} />
            </View>
          </View>

          {/* Macro bars */}
          <View className="gap-2">
            <ProgressBar
              progress={summary.totalProteinG / settings.dailyProteinGoal}
              color={Colors.protein}
              label="Protein"
              valueLabel={`${Math.round(summary.totalProteinG)}g / ${settings.dailyProteinGoal}g`}
            />
            <ProgressBar
              progress={summary.totalCarbsG / settings.dailyCarbsGoal}
              color={Colors.carbs}
              label="Carbs"
              valueLabel={`${Math.round(summary.totalCarbsG)}g / ${settings.dailyCarbsGoal}g`}
            />
            <ProgressBar
              progress={summary.totalFatG / settings.dailyFatGoal}
              color={Colors.fat}
              label="Fat"
              valueLabel={`${Math.round(summary.totalFatG)}g / ${settings.dailyFatGoal}g`}
            />
            {summary.totalAlcoholG > 0 && (
              <ProgressBar
                progress={0}
                color={Colors.mint}
                label="Alcohol"
                valueLabel={`${Math.round(summary.totalAlcoholG)}g ethanol`}
              />
            )}
          </View>

          {/* Micros CTA */}
          <TouchableOpacity
            className="flex-row items-center justify-center gap-1 py-2 px-3 rounded-xl border"
            style={{ backgroundColor: Colors.tealMuted, borderColor: 'rgba(0,217,192,0.25)', marginTop: 8 }}
            onPress={() => router.push('/calories/micros')}
          >
            <Ionicons name="leaf-outline" size={14} color={Colors.teal} />
            <Text className="text-[13px] font-semibold text-teal flex-1 text-center">
              View Micronutrient Breakdown
            </Text>
            <Ionicons name="chevron-forward" size={13} color={Colors.teal} />
          </TouchableOpacity>
        </Card>

        {/* Intermittent Fasting Timer */}
        {(() => {
          const targetMs = fastingState.targetHours ? fastingState.targetHours * 3_600_000 : null;
          const fastProgress = targetMs ? Math.min(1, elapsedMs / targetMs) : null;
          const remainingMs = targetMs ? Math.max(0, targetMs - elapsedMs) : null;
          return (
            <Card style={{ gap: 8 }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1">
                  <Text style={{ fontSize: 16 }}>⏱</Text>
                  <Text className="text-[15px] font-bold text-text-primary">Intermittent Fasting</Text>
                </View>
                {fastingState.isActive && (
                  <TouchableOpacity
                    className="px-3 rounded-xl"
                    style={{ paddingVertical: 4, backgroundColor: 'rgba(255,99,132,0.15)', borderWidth: 1, borderColor: 'rgba(255,99,132,0.4)' }}
                    onPress={handleEndFast}
                  >
                    <Text className="text-[13px] font-bold text-coral">End Fast</Text>
                  </TouchableOpacity>
                )}
              </View>

              {fastingState.isActive ? (
                <View style={{ gap: 8 }}>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="text-[28px] font-extrabold text-teal">{formatElapsed(elapsedMs)}</Text>
                    {fastingState.targetHours && (
                      <Text className="text-[15px] text-text-muted">/ {fastingState.targetHours}h 0m</Text>
                    )}
                  </View>
                  {fastProgress !== null && (
                    <ProgressBar
                      progress={fastProgress}
                      color={Colors.teal}
                      label=""
                      valueLabel={remainingMs !== null ? `${formatElapsed(remainingMs)} remaining` : ''}
                    />
                  )}
                  {!fastingState.targetHours && (
                    <Text className="text-[11px] text-text-muted italic">No target set — fast until ready</Text>
                  )}
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <Text className="text-[13px] text-text-muted">Start a fast to track your fasting window</Text>
                  <View className="flex-row gap-1">
                    {([16, 18, 20] as const).map((h) => (
                      <TouchableOpacity
                        key={h}
                        className="flex-1 py-2 rounded-xl bg-surface-elevated border border-border items-center"
                        onPress={() => handleStartFast(h)}
                      >
                        <Text className="text-[13px] font-semibold text-teal">{h}:8</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      className="flex-1 py-2 rounded-xl bg-surface-elevated border border-border items-center"
                      onPress={() => setShowCustomFast((v) => !v)}
                    >
                      <Text className="text-[13px] font-semibold text-teal">Custom</Text>
                    </TouchableOpacity>
                  </View>
                  {showCustomFast && (
                    <View className="flex-row gap-2 items-end">
                      <View className="gap-1 flex-1">
                        <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
                          Fasting hours
                        </Text>
                        <TextInput
                          value={customFastHours}
                          onChangeText={setCustomFastHours}
                          placeholder="e.g. 24"
                          placeholderTextColor={Colors.textMuted}
                          keyboardType="number-pad"
                          keyboardAppearance="dark"
                          className="bg-surface-elevated rounded-xl border border-border px-3 py-2 text-[15px] text-text-primary min-h-[44px]"
                        />
                      </View>
                      <TouchableOpacity
                        className="bg-accent rounded-xl py-3 items-center flex-1"
                        onPress={() => {
                          const h = parseInt(customFastHours, 10);
                          if (h > 0 && h <= 168) handleStartFast(h);
                        }}
                      >
                        <Text className="text-[15px] font-bold text-text-primary">Start Fast</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </Card>
          );
        })()}

        {/* Meal sections */}
        {MEALS.map((meal) => {
          const mealEntries = entries.filter((e) => e.mealType === meal);
          const mealCals = mealEntries.reduce((sum, e) => sum + e.calories, 0);
          return (
            <Card key={meal} style={{ gap: 8 }} accent={MEAL_COLORS[meal]}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1">
                  <Text style={{ fontSize: 16 }}>{MEAL_ICONS[meal]}</Text>
                  <Text className="text-[15px] font-bold" style={{ color: MEAL_COLORS[meal] }}>
                    {MEAL_LABELS[meal]}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  {mealCals > 0 && (
                    <Text className="text-[13px] text-text-secondary">{Math.round(mealCals)} kcal</Text>
                  )}
                  {/* Barcode scan shortcut */}
                  <TouchableOpacity
                    className="w-8 h-8 items-center justify-center rounded-lg bg-surface-elevated"
                    onPress={() => router.push({ pathname: '/barcode/scan', params: { meal } })}
                  >
                    <Ionicons name="barcode-outline" size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  {/* Food search shortcut */}
                  <TouchableOpacity
                    className="w-8 h-8 items-center justify-center rounded-lg bg-surface-elevated"
                    onPress={() => router.push({ pathname: '/food/search', params: { meal } })}
                  >
                    <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  {/* Add manually → full-screen form */}
                  <TouchableOpacity
                    className="flex-row items-center px-2 rounded-lg bg-accent/15"
                    style={{ gap: 2, paddingVertical: 4 }}
                    onPress={() =>
                      router.push({ pathname: '/calories/add', params: { meal, date: formatDateISO(viewDate) } })
                    }
                  >
                    <Ionicons name="add" size={16} color={Colors.accent} />
                    <Text className="text-[13px] font-semibold text-accent">Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {mealEntries.length === 0 ? (
                <Text className="text-[13px] text-text-muted text-center py-2">Nothing logged yet</Text>
              ) : (
                mealEntries.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    className="flex-row items-center justify-between gap-2 py-1"
                    style={{ borderTopWidth: 0.5, borderTopColor: Colors.border }}
                    onLongPress={() => handleDeleteEntry(entry)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text className="flex-1 text-[15px] text-text-primary" numberOfLines={1}>
                        {entry.foodName}
                      </Text>
                      {(entry.proteinG > 0 || entry.carbsG > 0 || entry.fatG > 0) && (
                        <Text className="text-[11px] text-text-muted" style={{ marginTop: 1 }}>
                          P {Math.round(entry.proteinG)}g · C {Math.round(entry.carbsG)}g · F {Math.round(entry.fatG)}g
                        </Text>
                      )}
                      {(entry.fiberG > 0 || entry.sugarG > 0 || entry.sodiumMg > 0) && (
                        <Text className="text-[11px] text-text-muted" style={{ marginTop: 1, opacity: 0.7 }}>
                          {entry.fiberG > 0 ? `Fiber ${Math.round(entry.fiberG)}g` : ''}
                          {entry.fiberG > 0 && entry.sugarG > 0 ? ' · ' : ''}
                          {entry.sugarG > 0 ? `Sugar ${Math.round(entry.sugarG)}g` : ''}
                          {(entry.fiberG > 0 || entry.sugarG > 0) && entry.sodiumMg > 0 ? ' · ' : ''}
                          {entry.sodiumMg > 0 ? `Na ${Math.round(entry.sodiumMg)}mg` : ''}
                        </Text>
                      )}
                      {entry.alcoholG > 0 && (
                        <Text className="text-[11px] text-text-muted" style={{ marginTop: 1, opacity: 0.7 }}>
                          Alcohol {Math.round(entry.alcoholG)}g ethanol
                        </Text>
                      )}
                    </View>
                    <Text className="text-[13px] text-text-secondary font-medium">
                      {Math.round(entry.calories)} kcal
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </Card>
          );
        })}

        {/* Alcohol tracker — inline, no BottomSheet */}
        <Card style={{ gap: 8 }} accent={Colors.mint}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <Text style={{ fontSize: 16 }}>🍻</Text>
              <Text className="text-[15px] font-bold" style={{ color: Colors.mint }}>Alcohol</Text>
            </View>
            <TouchableOpacity
              className="flex-row items-center px-2 rounded-lg bg-accent/15"
              style={{ gap: 2, paddingVertical: 4 }}
              onPress={() => setShowAlcohol((v) => !v)}
            >
              <Ionicons name={showAlcohol ? 'chevron-up' : 'add'} size={16} color={Colors.accent} />
              <Text className="text-[13px] font-semibold text-accent">{showAlcohol ? 'Less' : 'Track'}</Text>
            </TouchableOpacity>
          </View>

          {/* Quick drink buttons — always visible */}
          <View className="flex-row flex-wrap gap-1 mt-1">
            {QUICK_DRINKS.map((d) => (
              <TouchableOpacity
                key={d.name}
                className="bg-surface-elevated rounded-xl border items-center"
                style={{ flex: 1, minWidth: '45%', paddingHorizontal: 8, paddingVertical: 8, gap: 2, borderColor: 'rgba(78,203,113,0.25)' }}
                onPress={() => logAlcohol(d.name, d.kcal)}
              >
                <Text className="text-[13px] font-semibold text-text-primary">{d.label}</Text>
                <Text className="text-[11px] text-text-muted">{d.kcal} kcal</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Expandable: standard drinks + custom calculator */}
          {showAlcohol && (
            <View style={{ gap: 12, marginTop: 4 }}>
              {/* Tab switcher */}
              <View className="flex-row bg-surface-elevated rounded-xl" style={{ padding: 3, gap: 3 }}>
                <TouchableOpacity
                  className={`flex-1 py-2 items-center rounded-lg ${alcoholTab === 'quick' ? 'bg-accent' : ''}`}
                  onPress={() => setAlcoholTab('quick')}
                >
                  <Text className={`text-[13px] font-semibold ${alcoholTab === 'quick' ? 'text-text-primary' : 'text-text-secondary'}`}>
                    Standard Drinks
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-2 items-center rounded-lg ${alcoholTab === 'custom' ? 'bg-accent' : ''}`}
                  onPress={() => setAlcoholTab('custom')}
                >
                  <Text className={`text-[13px] font-semibold ${alcoholTab === 'custom' ? 'text-text-primary' : 'text-text-secondary'}`}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {alcoholTab === 'quick' ? (
                <View className="flex-row gap-2 items-end">
                  <View className="gap-1 flex-1">
                    <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
                      Standard Drinks (AU std = 70 kcal)
                    </Text>
                    <TextInput
                      value={stdDrinks}
                      onChangeText={setStdDrinks}
                      placeholder="e.g. 2"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="decimal-pad"
                      keyboardAppearance="dark"
                      className="bg-surface-elevated rounded-xl border border-border px-3 py-2 text-[15px] text-text-primary min-h-[44px]"
                    />
                  </View>
                  <TouchableOpacity
                    className="bg-accent rounded-xl py-3 items-center flex-1"
                    onPress={handleStdDrinks}
                  >
                    <Text className="text-[15px] font-bold text-text-primary">
                      Log ({Math.round((parseFloat(stdDrinks) || 0) * 70)} kcal)
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <Text className="text-[11px] text-text-muted text-center">
                    Calculate calories from volume and alcohol content
                  </Text>
                  <View className="flex-row gap-2">
                    <View className="gap-1 flex-1">
                      <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
                        Volume (ml)
                      </Text>
                      <TextInput
                        value={customVolMl}
                        onChangeText={setCustomVolMl}
                        placeholder="e.g. 375"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="decimal-pad"
                        keyboardAppearance="dark"
                        className="bg-surface-elevated rounded-xl border border-border px-3 py-2 text-[15px] text-text-primary min-h-[44px]"
                      />
                    </View>
                    <View className="gap-1 flex-1">
                      <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
                        ABV %
                      </Text>
                      <TextInput
                        value={customAbv}
                        onChangeText={setCustomAbv}
                        placeholder="e.g. 5"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="decimal-pad"
                        keyboardAppearance="dark"
                        className="bg-surface-elevated rounded-xl border border-border px-3 py-2 text-[15px] text-text-primary min-h-[44px]"
                      />
                    </View>
                  </View>
                  {customVolMl && customAbv && (
                    <Text className="text-[24px] font-bold text-accent text-center py-2">
                      ≈ {alcoholKcalFromVolABV(parseFloat(customVolMl) || 0, parseFloat(customAbv) || 0)} kcal
                    </Text>
                  )}
                  <TouchableOpacity
                    className="bg-accent rounded-xl py-3 items-center"
                    onPress={handleCustomAlcohol}
                  >
                    <Text className="text-[15px] font-bold text-text-primary">Log Drink</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </Card>

        <View style={{ height: SCROLL_BOTTOM_PADDING }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className="flex-row justify-between gap-2">
      <Text className="text-[13px] text-text-secondary">{label}</Text>
      <Text className={`text-[13px] font-semibold ${highlight ? 'text-success' : 'text-text-primary'}`}>
        {value}
      </Text>
    </View>
  );
}
