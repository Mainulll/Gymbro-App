import { SQLiteDatabase } from 'expo-sqlite';
import { WorkoutSession, WorkoutExercise, WorkoutSet } from '../../types';

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createWorkoutSession(
  db: SQLiteDatabase,
  session: WorkoutSession,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO workout_sessions (id, name, started_at, finished_at, duration_seconds, total_volume_kg, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.name,
      session.startedAt,
      session.finishedAt,
      session.durationSeconds,
      session.totalVolumeKg,
      session.notes,
    ],
  );
}

export async function updateWorkoutSession(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<WorkoutSession>,
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.finishedAt !== undefined) { fields.push('finished_at = ?'); values.push(updates.finishedAt); }
  if (updates.durationSeconds !== undefined) { fields.push('duration_seconds = ?'); values.push(updates.durationSeconds); }
  if (updates.totalVolumeKg !== undefined) { fields.push('total_volume_kg = ?'); values.push(updates.totalVolumeKg); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }

  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE workout_sessions SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteWorkoutSession(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM workout_sessions WHERE id = ?', [id]);
}

export async function getWorkoutSession(
  db: SQLiteDatabase,
  id: string,
): Promise<WorkoutSession | null> {
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM workout_sessions WHERE id = ?',
    [id],
  );
  if (!row) return null;
  return mapSession(row);
}

export async function getAllWorkoutSessions(
  db: SQLiteDatabase,
  limit = 100,
  offset = 0,
): Promise<WorkoutSession[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM workout_sessions WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
  );
  return rows.map(mapSession);
}

export async function getWorkoutSessionsForDateRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<WorkoutSession[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM workout_sessions
     WHERE started_at >= ? AND started_at <= ? AND finished_at IS NOT NULL
     ORDER BY started_at ASC`,
    [startDate, endDate],
  );
  return rows.map(mapSession);
}

function mapSession(row: any): WorkoutSession {
  return {
    id: row.id,
    name: row.name,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationSeconds: row.duration_seconds,
    totalVolumeKg: row.total_volume_kg,
    notes: row.notes,
  };
}

// ─── Workout Exercises ────────────────────────────────────────────────────────

export async function createWorkoutExercise(
  db: SQLiteDatabase,
  exercise: WorkoutExercise,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO workout_exercises (id, workout_id, exercise_template_id, order_index, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [exercise.id, exercise.workoutId, exercise.exerciseTemplateId, exercise.orderIndex, exercise.notes],
  );
}

export async function getWorkoutExercises(
  db: SQLiteDatabase,
  workoutId: string,
): Promise<WorkoutExercise[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT we.*, et.name as exercise_name, et.muscle_group
     FROM workout_exercises we
     JOIN exercise_templates et ON we.exercise_template_id = et.id
     WHERE we.workout_id = ?
     ORDER BY we.order_index ASC`,
    [workoutId],
  );
  return rows.map(mapExercise);
}

export async function deleteWorkoutExercise(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM workout_exercises WHERE id = ?', [id]);
}

function mapExercise(row: any): WorkoutExercise {
  return {
    id: row.id,
    workoutId: row.workout_id,
    exerciseTemplateId: row.exercise_template_id,
    exerciseName: row.exercise_name,
    muscleGroup: row.muscle_group,
    orderIndex: row.order_index,
    notes: row.notes,
  };
}

// ─── Weekly Stats ─────────────────────────────────────────────────────────────

export async function getWorkoutStreak(db: SQLiteDatabase): Promise<number> {
  // Count consecutive days with at least one finished workout, going backward
  // from today (inclusive). Days with no workout break the streak.
  const result = await db.getFirstAsync<{ streak: number }>(
    `WITH daily AS (
       SELECT DISTINCT date(started_at) AS workout_date
       FROM workout_sessions
       WHERE finished_at IS NOT NULL
     ),
     ranked AS (
       SELECT workout_date,
              julianday('now', 'localtime') - julianday(workout_date) AS days_ago,
              ROW_NUMBER() OVER (ORDER BY workout_date DESC) AS rn
       FROM daily
     )
     SELECT COUNT(*) AS streak FROM ranked
     WHERE days_ago - rn < 1`,
  );
  return result?.streak ?? 0;
}

export async function getWeeklyStats(
  db: SQLiteDatabase,
  weekStart: string,
  weekEnd: string,
): Promise<{ workoutCount: number; totalVolumeKg: number; streak: number }> {
  const [result, streak] = await Promise.all([
    db.getFirstAsync<any>(
      `SELECT COUNT(*) as workout_count, COALESCE(SUM(total_volume_kg), 0) as total_volume
       FROM workout_sessions
       WHERE started_at >= ? AND started_at <= ? AND finished_at IS NOT NULL`,
      [weekStart, weekEnd],
    ),
    getWorkoutStreak(db),
  ]);
  return {
    workoutCount: result?.workout_count ?? 0,
    totalVolumeKg: result?.total_volume ?? 0,
    streak,
  };
}

// ─── Batched Exercise Fetch (avoids N+1 in history screen) ───────────────────

export async function getWorkoutExercisesForSessions(
  db: SQLiteDatabase,
  workoutIds: string[],
): Promise<Map<string, WorkoutExercise[]>> {
  if (workoutIds.length === 0) return new Map();
  const placeholders = workoutIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<any>(
    `SELECT we.*, et.name as exercise_name, et.muscle_group
     FROM workout_exercises we
     JOIN exercise_templates et ON we.exercise_template_id = et.id
     WHERE we.workout_id IN (${placeholders})
     ORDER BY we.workout_id, we.order_index ASC`,
    workoutIds,
  );
  const map = new Map<string, WorkoutExercise[]>();
  for (const row of rows) {
    const ex = mapExercise(row);
    const list = map.get(ex.workoutId) ?? [];
    list.push(ex);
    map.set(ex.workoutId, list);
  }
  return map;
}
