import { SQLiteDatabase } from 'expo-sqlite';
import { CalorieEntry, DailyNutritionSummary } from '../../types';

export async function createCalorieEntry(
  db: SQLiteDatabase,
  entry: CalorieEntry,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO calorie_entries
       (id, date, meal_type, food_name, calories, protein_g, carbs_g, fat_g,
        fiber_g, sugar_g, sodium_mg, saturated_fat_g,
        serving_size, serving_unit, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.date,
      entry.mealType,
      entry.foodName,
      entry.calories,
      entry.proteinG,
      entry.carbsG,
      entry.fatG,
      entry.fiberG,
      entry.sugarG,
      entry.sodiumMg,
      entry.saturatedFatG,
      entry.servingSize,
      entry.servingUnit,
      entry.createdAt,
    ],
  );
}

export async function updateCalorieEntry(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<CalorieEntry>,
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.foodName !== undefined) { fields.push('food_name = ?'); values.push(updates.foodName); }
  if (updates.calories !== undefined) { fields.push('calories = ?'); values.push(updates.calories); }
  if (updates.proteinG !== undefined) { fields.push('protein_g = ?'); values.push(updates.proteinG); }
  if (updates.carbsG !== undefined) { fields.push('carbs_g = ?'); values.push(updates.carbsG); }
  if (updates.fatG !== undefined) { fields.push('fat_g = ?'); values.push(updates.fatG); }
  if (updates.mealType !== undefined) { fields.push('meal_type = ?'); values.push(updates.mealType); }

  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE calorie_entries SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteCalorieEntry(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM calorie_entries WHERE id = ?', [id]);
}

export async function getCalorieEntriesForDate(
  db: SQLiteDatabase,
  date: string,
): Promise<CalorieEntry[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM calorie_entries WHERE date = ? ORDER BY created_at ASC`,
    [date],
  );
  return rows.map(mapEntry);
}

export async function getDailyNutritionSummary(
  db: SQLiteDatabase,
  date: string,
): Promise<DailyNutritionSummary> {
  const result = await db.getFirstAsync<any>(
    `SELECT date,
       COALESCE(SUM(calories), 0) as total_calories,
       COALESCE(SUM(protein_g), 0) as total_protein,
       COALESCE(SUM(carbs_g), 0) as total_carbs,
       COALESCE(SUM(fat_g), 0) as total_fat,
       COUNT(*) as entry_count
     FROM calorie_entries WHERE date = ?`,
    [date],
  );
  return {
    date,
    totalCalories: result?.total_calories ?? 0,
    totalProteinG: result?.total_protein ?? 0,
    totalCarbsG: result?.total_carbs ?? 0,
    totalFatG: result?.total_fat ?? 0,
    entryCount: result?.entry_count ?? 0,
  };
}

export async function getCalorieEntriesForDateRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<CalorieEntry[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM calorie_entries
     WHERE date >= ? AND date <= ?
     ORDER BY date ASC, created_at ASC`,
    [startDate, endDate],
  );
  return rows.map(mapEntry);
}

function mapEntry(row: any): CalorieEntry {
  return {
    id: row.id,
    date: row.date,
    mealType: row.meal_type,
    foodName: row.food_name,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    fiberG: row.fiber_g ?? 0,
    sugarG: row.sugar_g ?? 0,
    sodiumMg: row.sodium_mg ?? 0,
    saturatedFatG: row.saturated_fat_g ?? 0,
    servingSize: row.serving_size,
    servingUnit: row.serving_unit,
    createdAt: row.created_at,
  };
}
