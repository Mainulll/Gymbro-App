import { SQLiteDatabase } from 'expo-sqlite';
import { WorkoutSet } from '../../types';
import { SessionSetHistory, SetWithEstimate, calcEpley1RM } from '../../constants/progressionInsights';

export async function createWorkoutSet(
  db: SQLiteDatabase,
  set: WorkoutSet,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO workout_sets
       (id, workout_exercise_id, set_number, weight_kg, reps, duration_seconds,
        rpe, is_warmup, is_completed, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      set.id,
      set.workoutExerciseId,
      set.setNumber,
      set.weightKg,
      set.reps,
      set.durationSeconds,
      set.rpe,
      set.isWarmup ? 1 : 0,
      set.isCompleted ? 1 : 0,
      set.completedAt,
    ],
  );
}

export async function updateWorkoutSet(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<WorkoutSet>,
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.weightKg !== undefined) { fields.push('weight_kg = ?'); values.push(updates.weightKg); }
  if (updates.reps !== undefined) { fields.push('reps = ?'); values.push(updates.reps); }
  if (updates.durationSeconds !== undefined) { fields.push('duration_seconds = ?'); values.push(updates.durationSeconds); }
  if (updates.rpe !== undefined) { fields.push('rpe = ?'); values.push(updates.rpe); }
  if (updates.isWarmup !== undefined) { fields.push('is_warmup = ?'); values.push(updates.isWarmup ? 1 : 0); }
  if (updates.isCompleted !== undefined) { fields.push('is_completed = ?'); values.push(updates.isCompleted ? 1 : 0); }
  if (updates.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(updates.completedAt); }

  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE workout_sets SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteWorkoutSet(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM workout_sets WHERE id = ?', [id]);
}

export async function getSetsForExercise(
  db: SQLiteDatabase,
  workoutExerciseId: string,
): Promise<WorkoutSet[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number ASC',
    [workoutExerciseId],
  );
  return rows.map(mapSet);
}

export async function getLastSetDataForExercise(
  db: SQLiteDatabase,
  exerciseTemplateId: string,
  excludeSessionId?: string,
): Promise<{ weightKg: number | null; reps: number | null }[]> {
  const query = excludeSessionId
    ? `SELECT wset.weight_kg, wset.reps
       FROM workout_sets wset
       JOIN workout_exercises we ON wset.workout_exercise_id = we.id
       JOIN workout_sessions ws ON we.workout_id = ws.id
       WHERE we.exercise_template_id = ?
         AND ws.id != ?
         AND ws.finished_at IS NOT NULL
         AND wset.is_completed = 1
       ORDER BY ws.started_at DESC, wset.set_number ASC
       LIMIT 5`
    : `SELECT wset.weight_kg, wset.reps
       FROM workout_sets wset
       JOIN workout_exercises we ON wset.workout_exercise_id = we.id
       JOIN workout_sessions ws ON we.workout_id = ws.id
       WHERE we.exercise_template_id = ?
         AND ws.finished_at IS NOT NULL
         AND wset.is_completed = 1
       ORDER BY ws.started_at DESC, wset.set_number ASC
       LIMIT 5`;

  const params = excludeSessionId
    ? [exerciseTemplateId, excludeSessionId]
    : [exerciseTemplateId];

  const rows = await db.getAllAsync<any>(query, params);
  return rows.map((r: any) => ({ weightKg: r.weight_kg, reps: r.reps }));
}

export async function getExportSets(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<any[]> {
  return db.getAllAsync<any>(
    `SELECT
       ws.started_at, ws.name as session_name, ws.duration_seconds,
       ws.total_volume_kg, et.name as exercise_name,
       wset.set_number, wset.weight_kg, wset.reps, wset.rpe,
       wset.is_warmup, wset.completed_at
     FROM workout_sets wset
     JOIN workout_exercises we ON wset.workout_exercise_id = we.id
     JOIN workout_sessions ws ON we.workout_id = ws.id
     JOIN exercise_templates et ON we.exercise_template_id = et.id
     WHERE ws.started_at >= ? AND ws.started_at <= ?
       AND ws.finished_at IS NOT NULL
       AND wset.is_completed = 1
     ORDER BY ws.started_at ASC, we.order_index ASC, wset.set_number ASC`,
    [startDate, endDate],
  );
}

export async function getSetHistoryForExercise(
  db: SQLiteDatabase,
  exerciseTemplateId: string,
  limit = 5,
): Promise<SessionSetHistory[]> {
  // Step 1: Get N most recent completed sessions for this exercise
  const sessions = await db.getAllAsync<any>(
    `SELECT DISTINCT ws.id, ws.started_at, ws.name
     FROM workout_exercises we
     JOIN workout_sessions ws ON we.workout_id = ws.id
     WHERE we.exercise_template_id = ? AND ws.finished_at IS NOT NULL
     ORDER BY ws.started_at DESC
     LIMIT ?`,
    [exerciseTemplateId, limit],
  );

  const result: SessionSetHistory[] = [];

  for (const sess of sessions) {
    // Step 2: Get all completed working sets for this session
    const setRows = await db.getAllAsync<any>(
      `SELECT wset.id, wset.set_number, wset.weight_kg, wset.reps,
              wset.rpe, wset.is_warmup
       FROM workout_sets wset
       JOIN workout_exercises we ON wset.workout_exercise_id = we.id
       WHERE we.workout_id = ? AND we.exercise_template_id = ?
         AND wset.is_completed = 1
       ORDER BY wset.set_number ASC`,
      [sess.id, exerciseTemplateId],
    );

    const sets: SetWithEstimate[] = setRows.map((r: any) => {
      const weightKg = r.weight_kg ?? 0;
      const reps = r.reps ?? 0;
      return {
        setId: r.id,
        setNumber: r.set_number,
        weightKg,
        reps,
        rpe: r.rpe ?? null,
        isWarmup: r.is_warmup === 1,
        estimated1RM: calcEpley1RM(weightKg, reps),
      };
    });

    const workingSets = sets.filter((s) => !s.isWarmup);
    const maxWeightKg = workingSets.reduce((m, s) => Math.max(m, s.weightKg), 0);
    const totalVolumeKg = workingSets.reduce((t, s) => t + s.weightKg * s.reps, 0);
    const best1RM = workingSets.reduce((m: number | null, s) => {
      if (s.estimated1RM === null) return m;
      return m === null || s.estimated1RM > m ? s.estimated1RM : m;
    }, null);

    result.push({
      sessionId: sess.id,
      sessionDate: sess.started_at,
      sessionName: sess.name,
      sets,
      maxWeightKg,
      best1RM,
      totalVolumeKg,
    });
  }

  return result;
}

function mapSet(row: any): WorkoutSet {
  return {
    id: row.id,
    workoutExerciseId: row.workout_exercise_id,
    setNumber: row.set_number,
    weightKg: row.weight_kg,
    reps: row.reps,
    durationSeconds: row.duration_seconds,
    rpe: row.rpe,
    isWarmup: row.is_warmup === 1,
    isCompleted: row.is_completed === 1,
    completedAt: row.completed_at,
  };
}
