import { SQLiteDatabase } from 'expo-sqlite';
import { UserSettings } from '../../types';

export async function getUserSettings(db: SQLiteDatabase): Promise<UserSettings> {
  const row = await db.getFirstAsync<any>('SELECT * FROM user_settings WHERE id = 1');
  if (!row) {
    return {
      weightUnit: 'kg',
      dailyCalorieGoal: 2000,
      dailyProteinGoal: 150,
      dailyCarbsGoal: 250,
      dailyFatGoal: 65,
      restTimerSeconds: 90,
      hapticFeedback: true,
      heightCm: null,
      ageYears: null,
      sex: null,
      activityLevel: 'moderately_active',
      goalType: 'maintain',
      targetWeightKg: null,
    };
  }
  return {
    weightUnit: row.weight_unit as 'kg' | 'lbs',
    dailyCalorieGoal: row.daily_calorie_goal,
    dailyProteinGoal: row.daily_protein_goal,
    dailyCarbsGoal: row.daily_carbs_goal,
    dailyFatGoal: row.daily_fat_goal,
    restTimerSeconds: row.rest_timer_seconds,
    hapticFeedback: row.haptic_feedback === 1,
    heightCm: row.height_cm ?? null,
    ageYears: row.age_years ?? null,
    sex: row.sex ?? null,
    activityLevel: (row.activity_level ?? 'moderately_active') as UserSettings['activityLevel'],
    goalType: (row.goal_type ?? 'maintain') as UserSettings['goalType'],
    targetWeightKg: row.target_weight_kg ?? null,
  };
}

export async function updateUserSettings(
  db: SQLiteDatabase,
  settings: Partial<UserSettings>,
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (settings.weightUnit !== undefined) { fields.push('weight_unit = ?'); values.push(settings.weightUnit); }
  if (settings.dailyCalorieGoal !== undefined) { fields.push('daily_calorie_goal = ?'); values.push(settings.dailyCalorieGoal); }
  if (settings.dailyProteinGoal !== undefined) { fields.push('daily_protein_goal = ?'); values.push(settings.dailyProteinGoal); }
  if (settings.dailyCarbsGoal !== undefined) { fields.push('daily_carbs_goal = ?'); values.push(settings.dailyCarbsGoal); }
  if (settings.dailyFatGoal !== undefined) { fields.push('daily_fat_goal = ?'); values.push(settings.dailyFatGoal); }
  if (settings.restTimerSeconds !== undefined) { fields.push('rest_timer_seconds = ?'); values.push(settings.restTimerSeconds); }
  if (settings.hapticFeedback !== undefined) { fields.push('haptic_feedback = ?'); values.push(settings.hapticFeedback ? 1 : 0); }
  if (settings.heightCm !== undefined) { fields.push('height_cm = ?'); values.push(settings.heightCm); }
  if (settings.ageYears !== undefined) { fields.push('age_years = ?'); values.push(settings.ageYears); }
  if (settings.sex !== undefined) { fields.push('sex = ?'); values.push(settings.sex); }
  if (settings.activityLevel !== undefined) { fields.push('activity_level = ?'); values.push(settings.activityLevel); }
  if (settings.goalType !== undefined) { fields.push('goal_type = ?'); values.push(settings.goalType); }
  if (settings.targetWeightKg !== undefined) { fields.push('target_weight_kg = ?'); values.push(settings.targetWeightKg); }

  if (fields.length === 0) return;
  values.push(1);
  await db.runAsync(`UPDATE user_settings SET ${fields.join(', ')} WHERE id = ?`, values);
}
