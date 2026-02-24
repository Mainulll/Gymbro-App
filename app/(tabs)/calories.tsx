import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
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
import { Colors, Typography, Spacing, Radius, SCROLL_BOTTOM_PADDING } from '../../src/constants/theme';
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
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
      saturatedFatG: 0,
      vitaminDMcg: null,
      vitaminB12Mcg: null,
      vitaminCMg: null,
      ironMg: null,
      calciumMg: null,
      magnesiumMg: null,
      potassiumMg: null,
      zincMg: null,
      servingSize: 1,
      servingUnit: 'serving',
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header with date nav */}
          <View style={styles.header}>
            <TouchableOpacity onPress={goToPrevDay} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
            <TouchableOpacity onPress={goToNextDay} style={styles.navBtn} disabled={isToday}>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={isToday ? Colors.textMuted : Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Daily summary */}
          <Card glass style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <ProgressRing
                size={110}
                strokeWidth={10}
                progress={calorieProgress}
                color={Colors.pink}
              >
                <View style={styles.ringCenter}>
                  <Text style={styles.ringValue}>{Math.round(summary.totalCalories)}</Text>
                  <Text style={styles.ringLabel}>kcal</Text>
                </View>
              </ProgressRing>

              <View style={styles.summaryRight}>
                <SummaryRow label="Goal" value={`${settings.dailyCalorieGoal} kcal`} />
                <SummaryRow label="Consumed" value={`${Math.round(summary.totalCalories)} kcal`} />
                <SummaryRow
                  label="Remaining"
                  value={`${remaining} kcal`}
                  highlight={remaining > 0}
                />
              </View>
            </View>

            {/* Macro bars */}
            <View style={styles.macros}>
              <ProgressBar
                progress={summary.totalProteinG / settings.dailyProteinGoal}
                color={Colors.protein}
                label="Protein"
                valueLabel={`${Math.round(summary.totalProteinG)}g / ${settings.dailyProteinGoal}g`}
                style={styles.macroBar}
              />
              <ProgressBar
                progress={summary.totalCarbsG / settings.dailyCarbsGoal}
                color={Colors.carbs}
                label="Carbs"
                valueLabel={`${Math.round(summary.totalCarbsG)}g / ${settings.dailyCarbsGoal}g`}
                style={styles.macroBar}
              />
              <ProgressBar
                progress={summary.totalFatG / settings.dailyFatGoal}
                color={Colors.fat}
                label="Fat"
                valueLabel={`${Math.round(summary.totalFatG)}g / ${settings.dailyFatGoal}g`}
                style={styles.macroBar}
              />
            </View>
            {/* Micros CTA */}
            <TouchableOpacity
              style={styles.microsCta}
              onPress={() => router.push('/calories/micros')}
            >
              <Ionicons name="leaf-outline" size={14} color={Colors.teal} />
              <Text style={styles.microsCtaText}>View Micronutrient Breakdown</Text>
              <Ionicons name="chevron-forward" size={13} color={Colors.teal} />
            </TouchableOpacity>
          </Card>

          {/* Intermittent Fasting Timer */}
          {(() => {
            const targetMs = fastingState.targetHours ? fastingState.targetHours * 3_600_000 : null;
            const fastProgress = targetMs ? Math.min(1, elapsedMs / targetMs) : null;
            const remainingMs = targetMs ? Math.max(0, targetMs - elapsedMs) : null;
            return (
              <Card style={styles.fastingCard}>
                <View style={styles.fastingHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                    <Text style={{ fontSize: 16 }}>⏱</Text>
                    <Text style={styles.fastingTitle}>Intermittent Fasting</Text>
                  </View>
                  {fastingState.isActive && (
                    <TouchableOpacity style={styles.endFastBtn} onPress={handleEndFast}>
                      <Text style={styles.endFastText}>End Fast</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {fastingState.isActive ? (
                  <View style={{ gap: Spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs }}>
                      <Text style={styles.fastingElapsed}>{formatElapsed(elapsedMs)}</Text>
                      {fastingState.targetHours && (
                        <Text style={styles.fastingTarget}>/ {fastingState.targetHours}h 0m</Text>
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
                      <Text style={styles.fastingNoTarget}>No target set — fast until ready</Text>
                    )}
                  </View>
                ) : (
                  <View style={{ gap: Spacing.sm }}>
                    <Text style={styles.fastingHint}>Start a fast to track your fasting window</Text>
                    <View style={styles.fastingPresets}>
                      {([16, 18, 20] as const).map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={styles.fastingPresetChip}
                          onPress={() => handleStartFast(h)}
                        >
                          <Text style={styles.fastingPresetText}>{h}:8</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={styles.fastingPresetChip}
                        onPress={() => setShowCustomFast((v) => !v)}
                      >
                        <Text style={styles.fastingPresetText}>Custom</Text>
                      </TouchableOpacity>
                    </View>
                    {showCustomFast && (
                      <View style={[styles.formRow, { alignItems: 'flex-end' }]}>
                        <View style={[styles.formInputWrapper, { flex: 1 }]}>
                          <Text style={styles.formLabel}>Fasting hours</Text>
                          <TextInput
                            value={customFastHours}
                            onChangeText={setCustomFastHours}
                            placeholder="e.g. 24"
                            placeholderTextColor={Colors.textMuted}
                            keyboardType="number-pad"
                            keyboardAppearance="dark"
                            style={styles.formInput}
                          />
                        </View>
                        <TouchableOpacity
                          style={[styles.logBtn, { flex: 1, marginTop: 0 }]}
                          onPress={() => {
                            const h = parseInt(customFastHours, 10);
                            if (h > 0 && h <= 168) handleStartFast(h);
                          }}
                        >
                          <Text style={styles.logBtnText}>Start Fast</Text>
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
              <Card key={meal} style={styles.mealCard} accent={MEAL_COLORS[meal]}>
                <View style={styles.mealHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                    <Text style={{ fontSize: 16 }}>{MEAL_ICONS[meal]}</Text>
                    <Text style={[styles.mealTitle, { color: MEAL_COLORS[meal] }]}>{MEAL_LABELS[meal]}</Text>
                  </View>
                  <View style={styles.mealHeaderRight}>
                    {mealCals > 0 && (
                      <Text style={styles.mealCals}>{Math.round(mealCals)} kcal</Text>
                    )}
                    {/* Food search button */}
                    <TouchableOpacity
                      style={styles.barcodeBtn}
                      onPress={() => openFoodSearch(meal)}
                    >
                      <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    {/* Barcode scan button */}
                    <TouchableOpacity
                      style={styles.barcodeBtn}
                      onPress={() => openBarcode(meal)}
                    >
                      <Ionicons name="barcode-outline" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addMealBtn}
                      onPress={() => openAdd(meal)}
                    >
                      <Ionicons name="add" size={16} color={Colors.accent} />
                      <Text style={styles.addMealText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {mealEntries.length === 0 ? (
                  <Text style={styles.emptyMeal}>Nothing logged yet</Text>
                ) : (
                  mealEntries.map((entry) => (
                    <TouchableOpacity
                      key={entry.id}
                      style={styles.entryRow}
                      onLongPress={() => handleDeleteEntry(entry)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entryName} numberOfLines={1}>
                          {entry.foodName}
                        </Text>
                        {(entry.proteinG > 0 || entry.carbsG > 0 || entry.fatG > 0) && (
                          <Text style={styles.entryMacros}>
                            P {Math.round(entry.proteinG)}g · C {Math.round(entry.carbsG)}g · F {Math.round(entry.fatG)}g
                          </Text>
                        )}
                        {(entry.fiberG > 0 || entry.sugarG > 0 || entry.sodiumMg > 0) && (
                          <Text style={styles.entryMicros}>
                            {entry.fiberG > 0 ? `Fiber ${Math.round(entry.fiberG)}g` : ''}
                            {entry.fiberG > 0 && entry.sugarG > 0 ? ' · ' : ''}
                            {entry.sugarG > 0 ? `Sugar ${Math.round(entry.sugarG)}g` : ''}
                            {(entry.fiberG > 0 || entry.sugarG > 0) && entry.sodiumMg > 0 ? ' · ' : ''}
                            {entry.sodiumMg > 0 ? `Na ${Math.round(entry.sodiumMg)}mg` : ''}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.entryCals}>{Math.round(entry.calories)} kcal</Text>
                    </TouchableOpacity>
                  ))
                )}
              </Card>
            );
          })}

          {/* Alcohol tracker card */}
          <Card style={styles.mealCard} accent={Colors.mint}>
            <View style={styles.mealHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                <Text style={{ fontSize: 16 }}>🍻</Text>
                <Text style={[styles.mealTitle, { color: Colors.mint }]}>Alcohol</Text>
              </View>
              <TouchableOpacity
                style={styles.addMealBtn}
                onPress={() => setShowAlcoholSheet(true)}
              >
                <Ionicons name="add" size={16} color={Colors.accent} />
                <Text style={styles.addMealText}>Track</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickDrinksRow}>
              {QUICK_DRINKS.map((d) => (
                <TouchableOpacity
                  key={d.name}
                  style={styles.quickDrinkChip}
                  onPress={() => handleQuickDrink(d)}
                >
                  <Text style={styles.quickDrinkLabel}>{d.label}</Text>
                  <Text style={styles.quickDrinkSub}>{d.kcal} kcal</Text>
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
        <View style={styles.addForm}>
          {/* Barcode scan shortcut inside sheet */}
          <TouchableOpacity
            style={styles.barcodeSheetBtn}
            onPress={() => { setShowAddSheet(false); openBarcode(addMeal); }}
          >
            <Ionicons name="barcode-outline" size={18} color={Colors.accent} />
            <Text style={styles.barcodeSheetText}>Scan Barcode</Text>
          </TouchableOpacity>

          <TextInput
            value={foodName}
            onChangeText={setFoodName}
            placeholder="Food name"
            placeholderTextColor={Colors.textMuted}
            style={styles.formInput}
            keyboardAppearance="dark"
          />
          <View style={styles.formRow}>
            <View style={[styles.formInputWrapper, { flex: 2 }]}>
              <Text style={styles.formLabel}>Calories</Text>
              <TextInput
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                keyboardAppearance="dark"
                style={styles.formInput}
              />
            </View>
          </View>
          <View style={styles.formRow}>
            <MacroInput label="Protein (g)" value={protein} onChange={setProtein} />
            <MacroInput label="Carbs (g)" value={carbs} onChange={setCarbs} />
            <MacroInput label="Fat (g)" value={fat} onChange={setFat} />
          </View>

          {/* Micronutrients toggle */}
          <TouchableOpacity
            style={styles.microsToggle}
            onPress={() => setShowMicros((v) => !v)}
          >
            <Text style={styles.microsToggleText}>Micronutrients (optional)</Text>
            <Ionicons
              name={showMicros ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {showMicros && (
            <>
              <View style={styles.formRow}>
                <MacroInput label="Fiber (g)" value={fiber} onChange={setFiber} />
                <MacroInput label="Sugar (g)" value={sugar} onChange={setSugar} />
              </View>
              <View style={styles.formRow}>
                <MacroInput label="Sodium (mg)" value={sodium} onChange={setSodium} />
                <MacroInput label="Sat. Fat (g)" value={saturatedFat} onChange={setSaturatedFat} />
              </View>
              <Text style={styles.vitaminSectionLabel}>Vitamins & Minerals</Text>
              <View style={styles.formRow}>
                <MacroInput label="Vit D (mcg)" value={vitaminD} onChange={setVitaminD} />
                <MacroInput label="Vit B12 (mcg)" value={vitaminB12} onChange={setVitaminB12} />
              </View>
              <View style={styles.formRow}>
                <MacroInput label="Vit C (mg)" value={vitaminC} onChange={setVitaminC} />
                <MacroInput label="Iron (mg)" value={iron} onChange={setIron} />
              </View>
              <View style={styles.formRow}>
                <MacroInput label="Calcium (mg)" value={calcium} onChange={setCalcium} />
                <MacroInput label="Magnesium (mg)" value={magnesium} onChange={setMagnesium} />
              </View>
              <View style={styles.formRow}>
                <MacroInput label="Potassium (mg)" value={potassium} onChange={setPotassium} />
                <MacroInput label="Zinc (mg)" value={zinc} onChange={setZinc} />
              </View>
            </>
          )}

          <TouchableOpacity style={styles.logBtn} onPress={handleAddEntry}>
            <Text style={styles.logBtnText}>Log Food</Text>
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
        <View style={styles.addForm}>
          {/* Tab switcher */}
          <View style={styles.alcoholTabs}>
            <TouchableOpacity
              style={[styles.alcoholTab, alcoholTab === 'quick' && styles.alcoholTabActive]}
              onPress={() => setAlcoholTab('quick')}
            >
              <Text style={[styles.alcoholTabText, alcoholTab === 'quick' && styles.alcoholTabTextActive]}>
                Quick Add
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.alcoholTab, alcoholTab === 'custom' && styles.alcoholTabActive]}
              onPress={() => setAlcoholTab('custom')}
            >
              <Text style={[styles.alcoholTabText, alcoholTab === 'custom' && styles.alcoholTabTextActive]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {alcoholTab === 'quick' ? (
            <>
              <Text style={styles.alcoholHint}>Tap any drink to log it, or enter number of standard drinks (AU std = 70 kcal)</Text>
              {QUICK_DRINKS.map((d) => (
                <TouchableOpacity
                  key={d.name}
                  style={styles.drinkRow}
                  onPress={async () => { await handleQuickDrink(d); setShowAlcoholSheet(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.drinkRowLabel}>{d.label}</Text>
                    <Text style={styles.drinkRowSub}>{d.sub}</Text>
                  </View>
                  <Text style={styles.drinkRowKcal}>{d.kcal} kcal</Text>
                  <Ionicons name="add-circle-outline" size={22} color={Colors.accent} />
                </TouchableOpacity>
              ))}
              <View style={[styles.formRow, { alignItems: 'flex-end' }]}>
                <View style={[styles.formInputWrapper, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Standard Drinks</Text>
                  <TextInput
                    value={stdDrinks}
                    onChangeText={setStdDrinks}
                    placeholder="e.g. 2"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                    keyboardAppearance="dark"
                    style={styles.formInput}
                  />
                </View>
                <TouchableOpacity style={[styles.logBtn, { flex: 1 }]} onPress={handleStdDrinks}>
                  <Text style={styles.logBtnText}>Log ({Math.round((parseFloat(stdDrinks) || 0) * 70)} kcal)</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.alcoholHint}>Calculate calories from volume and alcohol content</Text>
              <View style={styles.formRow}>
                <View style={[styles.formInputWrapper, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Volume (ml)</Text>
                  <TextInput
                    value={customVolMl}
                    onChangeText={setCustomVolMl}
                    placeholder="e.g. 375"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                    keyboardAppearance="dark"
                    style={styles.formInput}
                  />
                </View>
                <View style={[styles.formInputWrapper, { flex: 1 }]}>
                  <Text style={styles.formLabel}>ABV %</Text>
                  <TextInput
                    value={customAbv}
                    onChangeText={setCustomAbv}
                    placeholder="e.g. 5"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                    keyboardAppearance="dark"
                    style={styles.formInput}
                  />
                </View>
              </View>
              {customVolMl && customAbv && (
                <Text style={styles.alcoholCalcPreview}>
                  ≈ {alcoholKcalFromVolABV(parseFloat(customVolMl) || 0, parseFloat(customAbv) || 0)} kcal
                </Text>
              )}
              <TouchableOpacity style={styles.logBtn} onPress={handleCustomAlcohol}>
                <Text style={styles.logBtnText}>Log Drink</Text>
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm }}>
      <Text style={{ fontSize: Typography.sizes.sm, color: Colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: Typography.sizes.sm, fontWeight: '600', color: highlight ? Colors.success : Colors.textPrimary }}>
        {value}
      </Text>
    </View>
  );
}

function MacroInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={[styles.formInputWrapper, { flex: 1 }]}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="0"
        placeholderTextColor={Colors.textMuted}
        keyboardType="decimal-pad"
        keyboardAppearance="dark"
        textAlign="center"
        style={styles.formInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, gap: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryCard: { gap: Spacing.base },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  ringCenter: { alignItems: 'center' },
  ringValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ringLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  summaryRight: {
    flex: 1,
    gap: Spacing.sm,
  },
  macros: { gap: Spacing.sm },
  macroBar: {},
  mealCard: { gap: Spacing.sm },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  mealCals: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  barcodeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentMuted,
  },
  addMealText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  },
  emptyMeal: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  entryName: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
  },
  entryMacros: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  entryMicros: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    opacity: 0.7,
    marginTop: 1,
  },
  microsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  microsToggleText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryCals: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  addForm: { gap: Spacing.md },
  barcodeSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barcodeSheetText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  },
  formRow: { flexDirection: 'row', gap: Spacing.sm },
  formInputWrapper: { gap: 4 },
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
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    minHeight: 44,
  },
  logBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  logBtnText: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  // Alcohol tracker styles
  quickDrinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  quickDrinkChip: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(78, 203, 113, 0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  quickDrinkLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  quickDrinkSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  alcoholTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: 3,
    gap: 3,
  },
  alcoholTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  alcoholTabActive: {
    backgroundColor: Colors.accent,
  },
  alcoholTabText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  alcoholTabTextActive: {
    color: Colors.textPrimary,
  },
  alcoholHint: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  drinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  drinkRowLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  drinkRowSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  drinkRowKcal: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  microsCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.tealMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,217,192,0.25)',
  },
  microsCtaText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.teal,
    flex: 1,
    textAlign: 'center',
  },
  vitaminSectionLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.xs,
  },
  alcoholCalcPreview: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.accent,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  // Fasting timer
  fastingCard: { gap: Spacing.sm },
  fastingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fastingTitle: { fontSize: Typography.sizes.base, fontWeight: '700', color: Colors.textPrimary },
  fastingElapsed: { fontSize: Typography.sizes.xxl, fontWeight: '800', color: Colors.teal },
  fastingTarget: { fontSize: Typography.sizes.base, color: Colors.textMuted },
  fastingHint: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  fastingNoTarget: { fontSize: Typography.sizes.xs, color: Colors.textMuted, fontStyle: 'italic' },
  fastingPresets: { flexDirection: 'row', gap: Spacing.xs },
  fastingPresetChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  fastingPresetText: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.teal },
  endFastBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,99,132,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,99,132,0.4)',
  },
  endFastText: { fontSize: Typography.sizes.sm, fontWeight: '700', color: Colors.coral },
});
