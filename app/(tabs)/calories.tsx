import React, { useState } from 'react';
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

  useFocusEffect(
    React.useCallback(() => {
      loadDay(formatDateISO(viewDate));
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

  function openBarcode(meal: MealType) {
    router.push({ pathname: '/barcode/scan', params: { meal } });
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
          </Card>

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
        snapHeight={520}
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
  alcoholCalcPreview: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.accent,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
});
