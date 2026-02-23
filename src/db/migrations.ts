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

  // Migration 2: Health tracking tables + body stats in user_settings
  async (db: SQLiteDatabase) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS body_weight_logs (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        body_fat_pct REAL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sleep_logs (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        bed_time TEXT NOT NULL DEFAULT '',
        wake_time TEXT NOT NULL DEFAULT '',
        duration_minutes INTEGER NOT NULL DEFAULT 0,
        quality INTEGER NOT NULL DEFAULT 3,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_body_weight_logs_date ON body_weight_logs(date);
      CREATE INDEX IF NOT EXISTS idx_sleep_logs_date ON sleep_logs(date);
    `);

    // Add new columns to user_settings (SQLite ALTER TABLE — one at a time)
    const alterCols = [
      `ALTER TABLE user_settings ADD COLUMN height_cm REAL`,
      `ALTER TABLE user_settings ADD COLUMN age_years INTEGER`,
      `ALTER TABLE user_settings ADD COLUMN sex TEXT`,
      `ALTER TABLE user_settings ADD COLUMN activity_level TEXT NOT NULL DEFAULT 'moderately_active'`,
      `ALTER TABLE user_settings ADD COLUMN goal_type TEXT NOT NULL DEFAULT 'maintain'`,
      `ALTER TABLE user_settings ADD COLUMN target_weight_kg REAL`,
    ];
    for (const sql of alterCols) {
      try { await db.runAsync(sql); } catch { /* column may already exist */ }
    }
  },

  // Migration 3: Progress photos table
  async (db: SQLiteDatabase) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS progress_photos (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        local_uri TEXT NOT NULL,
        workout_session_id TEXT,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_progress_photos_date ON progress_photos(date);
    `);
  },

  // Migration 4: Micronutrients in calorie_entries
  async (db: SQLiteDatabase) => {
    const cols = [
      'ALTER TABLE calorie_entries ADD COLUMN fiber_g REAL NOT NULL DEFAULT 0',
      'ALTER TABLE calorie_entries ADD COLUMN sugar_g REAL NOT NULL DEFAULT 0',
      'ALTER TABLE calorie_entries ADD COLUMN sodium_mg REAL NOT NULL DEFAULT 0',
      'ALTER TABLE calorie_entries ADD COLUMN saturated_fat_g REAL NOT NULL DEFAULT 0',
    ];
    for (const sql of cols) {
      try { await db.runAsync(sql); } catch { /* column may already exist */ }
    }
  },
];
