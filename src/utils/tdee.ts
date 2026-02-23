import { ActivityLevel, GoalType, Sex } from '../types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,           // desk job, little/no exercise
  lightly_active: 1.375,    // 1-3 days/week light exercise
  moderately_active: 1.55,  // 3-5 days/week moderate exercise
  very_active: 1.725,       // 6-7 days/week hard exercise
  extra_active: 1.9,        // athlete / twice-daily training
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly Active',
  moderately_active: 'Moderately Active',
  very_active: 'Very Active',
  extra_active: 'Extra Active',
};

export const GOAL_LABELS: Record<GoalType, string> = {
  lose_fat: 'Lose Fat',
  maintain: 'Maintain',
  build_muscle: 'Build Muscle',
};

/** Calorie adjustment from TDEE based on goal */
const GOAL_CALORIE_DELTA: Record<GoalType, number> = {
  lose_fat: -500,     // ~0.5 kg/week deficit
  maintain: 0,
  build_muscle: +300, // lean bulk surplus
};

/**
 * Mifflin-St Jeor BMR formula (most accurate for general population).
 * Returns BMR in kcal/day.
 */
export function calcBMR(weightKg: number, heightCm: number, ageYears: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

/**
 * TDEE = BMR × activity multiplier
 */
export function calcTDEE(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: Sex,
  activityLevel: ActivityLevel,
): number {
  return Math.round(calcBMR(weightKg, heightCm, ageYears, sex) * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Calculate recommended daily calories for a given goal.
 */
export function calcTargetCalories(tdee: number, goal: GoalType): number {
  return Math.round(tdee + GOAL_CALORIE_DELTA[goal]);
}

/**
 * High-protein macro split for body composition.
 * Protein: 2.2 g/kg body weight (high for muscle retention/growth)
 * Fat: 25% of target calories
 * Carbs: remainder
 */
export function calcMacros(
  targetCalories: number,
  weightKg: number,
  goal: GoalType,
): { protein: number; carbs: number; fat: number } {
  const proteinMultiplier = goal === 'lose_fat' ? 2.4 : 2.0;
  const protein = Math.round(weightKg * proteinMultiplier);
  const fatCalories = targetCalories * 0.25;
  const fat = Math.round(fatCalories / 9);
  const proteinCalories = protein * 4;
  const carbs = Math.max(0, Math.round((targetCalories - proteinCalories - fatCalories) / 4));
  return { protein, carbs, fat };
}
