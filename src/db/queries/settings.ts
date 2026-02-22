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
  };
}

export async function updateUserSettings(
  db: SQLiteDatabase,
  settings: Partial<UserSettings>,
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (settings.weightUnit !== undefined) { fields.push('weight_unit = ?'); values.push(settings.weightUnit); }
  if (settings.dailyCalorieGoal !== undefined) { fields.push('daily_calorie_goal = ?'); values.push(settings.dailyCalorieGoal); }
  if (settings.dailyProteinGoal !== undefined) { fields.push('daily_protein_goal = ?'); values.push(settings.dailyProteinGoal); }
  if (settings.dailyCarbsGoal !== undefined) { fields.push('daily_carbs_goal = ?'); values.push(settings.dailyCarbsGoal); }
  if (settings.dailyFatGoal !== undefined) { fields.push('daily_fat_goal = ?'); values.push(settings.dailyFatGoal); }
  if (settings.restTimerSeconds !== undefined) { fields.push('rest_timer_seconds = ?'); values.push(settings.restTimerSeconds); }
  if (settings.hapticFeedback !== undefined) { fields.push('haptic_feedback = ?'); values.push(settings.hapticFeedback ? 1 : 0); }

  if (fields.length === 0) return;
  values.push(1);
  await db.runAsync(`UPDATE user_settings SET ${fields.join(', ')} WHERE id = ?`, values);
}
