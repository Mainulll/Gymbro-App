import { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_V1 } from './schema.sql';
import { BUILT_IN_EXERCISES } from '../constants/exercises';

export const migrations: ((db: SQLiteDatabase) => Promise<void>)[] = [
  // Migration 1: Initial schema + seed exercise library
  async (db: SQLiteDatabase) => {
    await db.execAsync(SCHEMA_V1);

    // Insert default user settings row
    await db.runAsync(
      `INSERT OR IGNORE INTO user_settings (id, weight_unit, daily_calorie_goal,
        daily_protein_goal, daily_carbs_goal, daily_fat_goal,
        rest_timer_seconds, haptic_feedback)
       VALUES (1, 'kg', 2000, 150, 250, 65, 90, 1)`,
    );

    // Seed built-in exercises
    const now = new Date().toISOString();
    for (const ex of BUILT_IN_EXERCISES) {
      const id = `builtin_${ex.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      await db.runAsync(
        `INSERT OR IGNORE INTO exercise_templates
           (id, name, muscle_group, equipment, is_custom, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [id, ex.name, ex.muscleGroup, ex.equipment, now],
      );
    }
  },
];
