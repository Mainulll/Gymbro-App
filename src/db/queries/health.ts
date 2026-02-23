import { SQLiteDatabase } from 'expo-sqlite';
import { BodyWeightLog, SleepLog } from '../../types';

// ─── Body Weight ──────────────────────────────────────────────────────────────

export async function createBodyWeightLog(
  db: SQLiteDatabase,
  log: BodyWeightLog,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO body_weight_logs
       (id, date, weight_kg, body_fat_pct, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [log.id, log.date, log.weightKg, log.bodyFatPct, log.notes, log.createdAt],
  );
}

export async function getBodyWeightLogs(
  db: SQLiteDatabase,
  limit = 90,
): Promise<BodyWeightLog[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM body_weight_logs ORDER BY date DESC LIMIT ?',
    [limit],
  );
  return rows.map(mapBodyWeightLog);
}

export async function getBodyWeightLogForDate(
  db: SQLiteDatabase,
  date: string,
): Promise<BodyWeightLog | null> {
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM body_weight_logs WHERE date = ?',
    [date],
  );
  return row ? mapBodyWeightLog(row) : null;
}

export async function deleteBodyWeightLog(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM body_weight_logs WHERE id = ?', [id]);
}

function mapBodyWeightLog(row: any): BodyWeightLog {
  return {
    id: row.id,
    date: row.date,
    weightKg: row.weight_kg,
    bodyFatPct: row.body_fat_pct ?? null,
    notes: row.notes ?? '',
    createdAt: row.created_at,
  };
}

// ─── Sleep ────────────────────────────────────────────────────────────────────

export async function createSleepLog(
  db: SQLiteDatabase,
  log: SleepLog,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO sleep_logs
       (id, date, bed_time, wake_time, duration_minutes, quality, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      log.id, log.date, log.bedTime, log.wakeTime,
      log.durationMinutes, log.quality, log.notes, log.createdAt,
    ],
  );
}

export async function getSleepLogs(
  db: SQLiteDatabase,
  limit = 30,
): Promise<SleepLog[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM sleep_logs ORDER BY date DESC LIMIT ?',
    [limit],
  );
  return rows.map(mapSleepLog);
}

export async function getSleepLogForDate(
  db: SQLiteDatabase,
  date: string,
): Promise<SleepLog | null> {
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM sleep_logs WHERE date = ?',
    [date],
  );
  return row ? mapSleepLog(row) : null;
}

export async function deleteSleepLog(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM sleep_logs WHERE id = ?', [id]);
}

function mapSleepLog(row: any): SleepLog {
  return {
    id: row.id,
    date: row.date,
    bedTime: row.bed_time,
    wakeTime: row.wake_time,
    durationMinutes: row.duration_minutes,
    quality: row.quality,
    notes: row.notes ?? '',
    createdAt: row.created_at,
  };
}
