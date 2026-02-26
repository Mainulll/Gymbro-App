import React, { useState } from 'react';
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
import { router, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCalorieStore } from '../../src/store/calorieStore';
import { MealType } from '../../src/types';
import { Colors } from '../../src/constants/theme';
import { consumePendingCaloriePrefill } from '../../src/utils/caloriePrefill';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export default function AddCaloriesScreen() {
  const { meal, date } = useLocalSearchParams<{ meal?: string; date?: string }>();
  const mealType = (meal as MealType) || 'snack';
  const entryDate = date ?? new Date().toISOString().split('T')[0];

  const { addEntry } = useCalorieStore();

  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [saturatedFat, setSaturatedFat] = useState('');
  const [vitaminD, setVitaminD] = useState('');
  const [vitaminB12, setVitaminB12] = useState('');
  const [vitaminC, setVitaminC] = useState('');
  const [iron, setIron] = useState('');
  const [calcium, setCalcium] = useState('');
  const [magnesium, setMagnesium] = useState('');
  const [potassium, setPotassium] = useState('');
  const [zinc, setZinc] = useState('');
  const [showMicros, setShowMicros] = useState(false);

  // Consume any pending prefill from barcode scan or food search
  useFocusEffect(
    React.useCallback(() => {
      const prefill = consumePendingCaloriePrefill();
      if (prefill) {
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
        const hasVitamins = !!(
          prefill.vitaminD || prefill.vitaminB12 || prefill.vitaminC ||
          prefill.iron || prefill.calcium || prefill.magnesium || prefill.potassium || prefill.zinc
        );
        setShowMicros(hasVitamins);
      }
    }, []),
  );

  async function handleSave() {
    if (!foodName.trim() || !calories) {
      Alert.alert('Required', 'Please enter a food name and calories.');
      return;
    }
    const parsedCalories = parseFloat(calories);
    if (!Number.isFinite(parsedCalories) || parsedCalories < 0) {
      Alert.alert('Invalid', 'Please enter a valid calorie amount.');
      return;
    }
    await addEntry({
      date: entryDate,
      mealType,
      foodName: foodName.trim(),
      calories: parsedCalories,
      proteinG: parseFloat(protein) || 0,
      carbsG: parseFloat(carbs) || 0,
      fatG: parseFloat(fat) || 0,
      fiberG: parseFloat(fiber) || 0,
      sugarG: parseFloat(sugar) || 0,
      sodiumMg: parseFloat(sodium) || 0,
      saturatedFatG: parseFloat(saturatedFat) || 0,
      alcoholG: 0,
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
    router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Add to ${MEAL_LABELS[mealType]}`,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Quick-entry shortcuts */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1 py-3 rounded-xl bg-surface-elevated border border-border"
                onPress={() => router.push({ pathname: '/barcode/scan', params: { meal: mealType } })}
              >
                <Ionicons name="barcode-outline" size={18} color={Colors.accent} />
                <Text className="text-[13px] font-semibold text-accent">Scan Barcode</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1 py-3 rounded-xl bg-surface-elevated border border-border"
                onPress={() => router.push({ pathname: '/food/search', params: { meal: mealType } })}
              >
                <Ionicons name="search-outline" size={18} color={Colors.accent} />
                <Text className="text-[13px] font-semibold text-accent">Search Food</Text>
              </TouchableOpacity>
            </View>

            {/* Food name */}
            <View className="gap-1">
              <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
                Food Name
              </Text>
              <TextInput
                value={foodName}
                onChangeText={setFoodName}
                placeholder="e.g. Chicken breast"
                placeholderTextColor={Colors.textMuted}
                className="bg-surface-elevated rounded-xl border border-border px-3 py-2 text-[15px] text-text-primary min-h-[44px]"
                keyboardAppearance="dark"
              />
            </View>

            {/* Calories */}
            <View className="gap-1">
              <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
                Calories (kcal)
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

            {/* Macros row */}
            <View className="flex-row gap-2">
              <MacroInput label="Protein (g)" value={protein} onChange={setProtein} />
              <MacroInput label="Carbs (g)" value={carbs} onChange={setCarbs} />
              <MacroInput label="Fat (g)" value={fat} onChange={setFat} />
            </View>

            {/* Micronutrients toggle */}
            <TouchableOpacity
              className="flex-row items-center justify-between py-2 px-3 rounded-xl bg-surface-elevated border border-border"
              onPress={() => setShowMicros((v) => !v)}
            >
              <Text className="text-[11px] text-text-muted font-semibold uppercase" style={{ letterSpacing: 0.5 }}>
                Micronutrients (optional)
              </Text>
              <Ionicons name={showMicros ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
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

            <TouchableOpacity
              className="bg-accent rounded-xl py-4 items-center"
              style={{ marginTop: 4 }}
              onPress={handleSave}
            >
              <Text className="text-[16px] font-bold text-text-primary">Log Food</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
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
