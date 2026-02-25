import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { Card } from '../../src/components/ui/Card';
import { Colors, SCROLL_BOTTOM_PADDING } from '../../src/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDateISO } from '../../src/utils/date';
import { consumePendingCaloriePrefill } from '../../src/utils/caloriePrefill';
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
  const { currentDate, entries, summary, loadDay, addEntry, removeEntry } = useCalorieStore();
  const settings = useSettingsStore((s) => s.settings);
  const [viewDate, setViewDate] = useState(new Date());
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addMeal, setAddMeal] = useState<MealType>('breakfast');
  const [showAlcoholSheet, setShowAlcoholSheet] = useState(false);
  const [stdDrinks, setStdDrinks] = useState('');
  const [customVolMl, setCustomVolMl] = useState('');
  const [customAbv, setCustomAbv] = useState('');
  const [alcoholTab, setAlcoholTab] = useState<'quick' | 'custom'>('quick');

  // Form state
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  // Micronutrients
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [saturatedFat, setSaturatedFat] = useState('');
  // Vitamins & minerals
  const [vitaminD, setVitaminD] = useState('');
  const [vitaminB12, setVitaminB12] = useState('');
  const [vitaminC, setVitaminC] = useState('');
  const [iron, setIron] = useState('');
  const [calcium, setCalcium] = useState('');
  const [magnesium, setMagnesium] = useState('');
  const [potassium, setPotassium] = useState('');
  const [zinc, setZinc] = useState('');
  const [showMicros, setShowMicros] = useState(false);

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
      // Consume any pending prefill from barcode scan
      const prefill = consumePendingCaloriePrefill();
      if (prefill) {
        const meal = (prefill.meal as MealType) || 'snack';
        setAddMeal(meal);
        setFoodName(prefill.foodName ?? '');
        setCalories(prefill.calories ?? '');
        setProtein(prefill.protein ?? '');
        setCarbs(prefill.carbs ?? '');
        setFat(prefill.fat ?? '');
        setFiber(prefill.fiber ?? '');
        setSugar(prefill.sugar ?? '');
        setSodium(prefill.sodium ?? '');
        setSaturatedFat(prefill.saturatedFat ?? '');
        setVitaminD(prefill.vitaminD ?? '');
        setVitaminB12(prefill.vitaminB12 ?? '');
        setVitaminC(prefill.vitaminC ?? '');
        setIron(prefill.iron ?? '');
        setCalcium(prefill.calcium ?? '');
        setMagnesium(prefill.magnesium ?? '');
        setPotassium(prefill.potassium ?? '');
        setZinc(prefill.zinc ?? '');
        // Auto-expand vitamins section if any vitamin data was prefilled
        const hasVitamins = !!(prefill.vitaminD || prefill.vitaminB12 || prefill.vitaminC ||
          prefill.iron || prefill.calcium || prefill.magnesium || prefill.potassium || prefill.zinc);
        setShowMicros(hasVitamins);
        setShowAddSheet(true);
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

  function openAdd(meal: MealType) {
    setAddMeal(meal);
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setFiber('');
    setSugar('');
    setSodium('');
    setSaturatedFat('');
    setVitaminD('');
    setVitaminB12('');
    setVitaminC('');
    setIron('');
    setCalcium('');
    setMagnesium('');
    setPotassium('');
    setZinc('');
    setShowMicros(false);
    setShowAddSheet(true);
  }

  async function handleAddEntry() {
    if (!foodName.trim() || !calories) {
      Alert.alert('Required', 'Please enter a food name and calories.');
      return;
    }
    await addEntry({
      date: formatDateISO(viewDate),
      mealType: addMeal,
      foodName: foodName.trim(),
      calories: parseFloat(calories) || 0,
      proteinG: parseFloat(protein) || 0,
      carbsG: parseFloat(carbs) || 0,
      fatG: parseFloat(fat) || 0,
      fiberG: parseFloat(fiber) || 0,
      sugarG: parseFloat(sugar) || 0,
      sodiumMg: parseFloat(sodium) || 0,
      saturatedFatG: parseFloat(saturatedFat) || 0,
      vitaminDMcg: parseFloat(vitaminD) || null,
      vitaminB12Mcg: parseFloat(vitaminB12) || null,
      vitaminCMg: parseFloat(vitaminC) || null,
      ironMg: parseFloat(iron) || null,
      calciumMg: parseFloat(calcium) || null,
      magnesiumMg: parseFloat(magnesium) || null,
      potassiumMg: parseFloat(potassium) || null,
      zincMg: parseFloat(zinc) || null,
      servingSize: 100,
      servingUnit: 'g',
    });
    setShowAddSheet(false);
  }

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

  function openBarcode(meal: MealType) {
    router.push({ pathname: '/barcode/scan', params: { meal } });
  }

  function openFoodSearch(meal: MealType) {
    router.push({ pathname: '/food/search', params: { meal } });
  }

  async function logAlcohol(name: string, kcal: number) {
    if (kcal <= 0) return;
    await addEntry({
      date: formatDateISO(viewDate),
      mealType: 'snack',
      foodName: name,
      calories: kcal,
      proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0, saturatedFatG: 0,
      vitaminDMcg: null, vitaminB12Mcg: null, vitaminCMg: null,
      ironMg: null, calciumMg: null, magnesiumMg: null, potassiumMg: null, zincMg: null,
      servingSize: 1, servingUnit: 'serving',
    });
  }

  async function handleQuickDrink(drink: typeof QUICK_DRINKS[0]) {
    await logAlcohol(drink.name, drink.kcal);
  }

  async function handleStdDrinks() {
    const n = parseFloat(stdDrinks);
    if (isNaN(n) || n <= 0) return;
    await logAlcohol(`🍻 ${n} standard drink${n !== 1 ? 's' : ''}`, Math.round(n * 70));
    setStdDrinks('');
    setShowAlcoholSheet(false);
  }

  async function handleCustomAlcohol() {
    const vol = parseFloat(customVolMl);
    const abv = parseFloat(customAbv);
    if (isNaN(vol) || isNaN(abv) || vol <= 0 || abv <= 0) return;
    const kcal = alcoholKcalFromVolABV(vol, abv);
    await logAlcohol(`🥂 Drink (${vol}ml, ${abv}% ABV)`, kcal);
    setCustomVolMl('');
    setCustomAbv('');
    setShowAlcoholSheet(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
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
            </View>
            {/* Micros CTA */}
            <TouchableOpacity
              className="flex-row items-center justify-center gap-1 py-2 px-3 rounded-xl border"
              style={{ backgroundColor: Colors.tealMuted, borderColor: 'rgba(0,217,192,0.25)' }}
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
                    {/* Food search button */}
                    <TouchableOpacity
                      className="w-8 h-8 items-center justify-center rounded-lg bg-surface-elevated"
                      onPress={() => openFoodSearch(meal)}
                    >
                      <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    {/* Barcode scan button */}
                    <TouchableOpacity
                      className="w-8 h-8 items-center justify-center rounded-lg bg-surface-elevated"
                      onPress={() => openBarcode(meal)}
                    >
                      <Ionicons name="barcode-outline" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-row items-center px-2 rounded-lg bg-accent/15"
                      style={{ gap: 2, paddingVertical: 4 }}
                      onPress={() => openAdd(meal)}
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

          {/* Alcohol tracker card */}
          <Card style={{ gap: 8 }} accent={Colors.mint}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <Text style={{ fontSize: 16 }}>🍻</Text>
                <Text className="text-[15px] font-bold" style={{ color: Colors.mint }}>Alcohol</Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center px-2 rounded-lg bg-accent/15"
                style={{ gap: 2, paddingVertical: 4 }}
                onPress={() => setShowAlcoholSheet(true)}
              >
                <Ionicons name="add" size={16} color={Colors.accent} />
                <Text className="text-[13px] font-semibold text-accent">Track</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap gap-1 mt-1">
              {QUICK_DRINKS.map((d) => (
                <TouchableOpacity
                  key={d.name}
                  className="bg-surface-elevated rounded-xl border items-center"
                  style={{ flex: 1, minWidth: '45%', paddingHorizontal: 8, paddingVertical: 8, gap: 2, borderColor: 'rgba(78,203,113,0.25)' }}
                  onPress={() => handleQuickDrink(d)}
                >
                  <Text className="text-[13px] font-semibold text-text-primary">{d.label}</Text>
                  <Text className="text-[11px] text-text-muted">{d.kcal} kcal</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <View style={{ height: SCROLL_BOTTOM_PADDING }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add Food Bottom Sheet */}
      <BottomSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        title={`Add to ${MEAL_LABELS[addMeal]}`}
        snapHeight={920}
      >
        <View className="gap-3">
          {/* Barcode scan shortcut inside sheet */}
          <TouchableOpacity
            className="flex-row items-center justify-center gap-1 py-2 rounded-xl bg-surface-elevated border border-border"
            onPress={() => { setShowAddSheet(false); openBarcode(addMeal); }}
          >
            <Ionicons name="barcode-outline" size={18} color={Colors.accent} />
            <Text className="text-[13px] font-semibold text-accent">Scan Barcode</Text>
          </TouchableOpacity>

          <TextInput
            value={foodName}
            onChangeText={setFoodName}
            placeholder="Food name"
            placeholderTextColor={Colors.textMuted}
            className="bg-surface-elevated rounded-xl border border-border px-3 py-2 text-[15px] text-text-primary min-h-[44px]"
            keyboardAppearance="dark"
          />
          <View className="flex-row gap-2">
            <View className="gap-1" style={{ flex: 2 }}>
              <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
                Calories
              </Text>
              <TextInput
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                keyboardAppearance="dark"
                className="bg-surface-elevated rounded-xl border border-border px-3 py-2 text-[15px] text-text-primary min-h-[44px]"
              />
            </View>
          </View>
          <View className="flex-row gap-2">
            <MacroInput label="Protein (g)" value={protein} onChange={setProtein} />
            <MacroInput label="Carbs (g)" value={carbs} onChange={setCarbs} />
            <MacroInput label="Fat (g)" value={fat} onChange={setFat} />
          </View>

          {/* Micronutrients toggle */}
          <TouchableOpacity
            className="flex-row items-center justify-between py-1 px-2 rounded-lg bg-surface-elevated border border-border"
            onPress={() => setShowMicros((v) => !v)}
          >
            <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
              Micronutrients (optional)
            </Text>
            <Ionicons
              name={showMicros ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {showMicros && (
            <>
              <View className="flex-row gap-2">
                <MacroInput label="Fiber (g)" value={fiber} onChange={setFiber} />
                <MacroInput label="Sugar (g)" value={sugar} onChange={setSugar} />
              </View>
              <View className="flex-row gap-2">
                <MacroInput label="Sodium (mg)" value={sodium} onChange={setSodium} />
                <MacroInput label="Sat. Fat (g)" value={saturatedFat} onChange={setSaturatedFat} />
              </View>
              <Text className="text-[11px] font-bold text-teal uppercase" style={{ letterSpacing: 0.6, marginTop: 4 }}>
                Vitamins & Minerals
              </Text>
              <View className="flex-row gap-2">
                <MacroInput label="Vit D (mcg)" value={vitaminD} onChange={setVitaminD} />
                <MacroInput label="Vit B12 (mcg)" value={vitaminB12} onChange={setVitaminB12} />
              </View>
              <View className="flex-row gap-2">
                <MacroInput label="Vit C (mg)" value={vitaminC} onChange={setVitaminC} />
                <MacroInput label="Iron (mg)" value={iron} onChange={setIron} />
              </View>
              <View className="flex-row gap-2">
                <MacroInput label="Calcium (mg)" value={calcium} onChange={setCalcium} />
                <MacroInput label="Magnesium (mg)" value={magnesium} onChange={setMagnesium} />
              </View>
              <View className="flex-row gap-2">
                <MacroInput label="Potassium (mg)" value={potassium} onChange={setPotassium} />
                <MacroInput label="Zinc (mg)" value={zinc} onChange={setZinc} />
              </View>
            </>
          )}

          <TouchableOpacity className="bg-accent rounded-xl py-3 items-center mt-2" onPress={handleAddEntry}>
            <Text className="text-[15px] font-bold text-text-primary">Log Food</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Alcohol Tracking Bottom Sheet */}
      <BottomSheet
        visible={showAlcoholSheet}
        onClose={() => setShowAlcoholSheet(false)}
        title="Track Alcohol"
        snapHeight={480}
      >
        <View className="gap-3">
          {/* Tab switcher */}
          <View className="flex-row bg-surface-elevated rounded-xl" style={{ padding: 3, gap: 3 }}>
            <TouchableOpacity
              className={`flex-1 py-2 items-center rounded-lg ${alcoholTab === 'quick' ? 'bg-accent' : ''}`}
              onPress={() => setAlcoholTab('quick')}
            >
              <Text className={`text-[13px] font-semibold ${alcoholTab === 'quick' ? 'text-text-primary' : 'text-text-secondary'}`}>
                Quick Add
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
            <>
              <Text className="text-[11px] text-text-muted text-center">
                Tap any drink to log it, or enter number of standard drinks (AU std = 70 kcal)
              </Text>
              {QUICK_DRINKS.map((d) => (
                <TouchableOpacity
                  key={d.name}
                  className="flex-row items-center gap-2 py-2"
                  style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.border }}
                  onPress={async () => { await handleQuickDrink(d); setShowAlcoholSheet(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text className="text-[15px] font-semibold text-text-primary">{d.label}</Text>
                    <Text className="text-[11px] text-text-muted">{d.sub}</Text>
                  </View>
                  <Text className="text-[13px] text-text-secondary">{d.kcal} kcal</Text>
                  <Ionicons name="add-circle-outline" size={22} color={Colors.accent} />
                </TouchableOpacity>
              ))}
              <View className="flex-row gap-2 items-end">
                <View className="gap-1 flex-1">
                  <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
                    Standard Drinks
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
                <TouchableOpacity className="bg-accent rounded-xl py-3 items-center mt-2 flex-1" onPress={handleStdDrinks}>
                  <Text className="text-[15px] font-bold text-text-primary">
                    Log ({Math.round((parseFloat(stdDrinks) || 0) * 70)} kcal)
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
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
              <TouchableOpacity className="bg-accent rounded-xl py-3 items-center mt-2" onPress={handleCustomAlcohol}>
                <Text className="text-[15px] font-bold text-text-primary">Log Drink</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </BottomSheet>
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

function MacroInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View className="gap-1 flex-1">
      <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="0"
        placeholderTextColor={Colors.textMuted}
        keyboardType="decimal-pad"
        keyboardAppearance="dark"
        textAlign="center"
        className="bg-surface-elevated rounded-xl border border-border px-3 py-2 text-[15px] text-text-primary min-h-[44px]"
      />
    </View>
  );
}
