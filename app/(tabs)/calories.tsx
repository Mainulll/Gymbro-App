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
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCalorieStore } from '../../src/store/calorieStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { CalorieEntry, MealType } from '../../src/types';
import { ProgressRing } from '../../src/components/ui/ProgressRing';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { Card } from '../../src/components/ui/Card';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { formatDateISO } from '../../src/utils/date';
import { format, addDays, subDays } from 'date-fns';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export default function CaloriesScreen() {
  const { currentDate, entries, summary, loadDay, addEntry, removeEntry } = useCalorieStore();
  const settings = useSettingsStore((s) => s.settings);
  const [viewDate, setViewDate] = useState(new Date());
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addMeal, setAddMeal] = useState<MealType>('breakfast');

  // Form state
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadDay(formatDateISO(viewDate));
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
          <Card style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <ProgressRing
                size={110}
                strokeWidth={10}
                progress={calorieProgress}
                color={Colors.accent}
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
              <Card key={meal} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealTitle}>{MEAL_LABELS[meal]}</Text>
                  <View style={styles.mealHeaderRight}>
                    {mealCals > 0 && (
                      <Text style={styles.mealCals}>{Math.round(mealCals)} kcal</Text>
                    )}
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
                      <Text style={styles.entryName} numberOfLines={1}>
                        {entry.foodName}
                      </Text>
                      <Text style={styles.entryCals}>{Math.round(entry.calories)} kcal</Text>
                    </TouchableOpacity>
                  ))
                )}
              </Card>
            );
          })}

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add Food Bottom Sheet */}
      <BottomSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        title={`Add to ${MEAL_LABELS[addMeal]}`}
        snapHeight={480}
      >
        <View style={styles.addForm}>
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
    gap: Spacing.sm,
  },
  mealCals: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
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
  },
  entryName: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
  },
  entryCals: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  addForm: { gap: Spacing.md },
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
});
