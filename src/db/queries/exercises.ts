import { SQLiteDatabase } from 'expo-sqlite';
import { ExerciseTemplate, MuscleGroup } from '../../types';

export async function getAllExerciseTemplates(
  db: SQLiteDatabase,
): Promise<ExerciseTemplate[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM exercise_templates ORDER BY name ASC',
  );
  return rows.map(mapTemplate);
}

export async function searchExerciseTemplates(
  db: SQLiteDatabase,
  query: string,
): Promise<ExerciseTemplate[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM exercise_templates WHERE name LIKE ? ORDER BY is_custom DESC, name ASC`,
    [`%${query}%`],
  );
  return rows.map(mapTemplate);
}

export async function getExerciseTemplatesByMuscle(
  db: SQLiteDatabase,
  muscleGroup: MuscleGroup,
): Promise<ExerciseTemplate[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM exercise_templates WHERE muscle_group = ? ORDER BY name ASC',
    [muscleGroup],
  );
  return rows.map(mapTemplate);
}

export async function getExerciseTemplate(
  db: SQLiteDatabase,
  id: string,
): Promise<ExerciseTemplate | null> {
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM exercise_templates WHERE id = ?',
    [id],
  );
  return row ? mapTemplate(row) : null;
}

export async function createCustomExercise(
  db: SQLiteDatabase,
  template: ExerciseTemplate,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO exercise_templates (id, name, muscle_group, equipment, is_custom, created_at)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [template.id, template.name, template.muscleGroup, template.equipment, template.createdAt],
  );
}

export async function deleteCustomExercise(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    'DELETE FROM exercise_templates WHERE id = ? AND is_custom = 1',
    [id],
  );
}

export async function getExerciseHistory(
  db: SQLiteDatabase,
  exerciseTemplateId: string,
  limit = 10,
): Promise<{ sessionDate: string; maxWeightKg: number; totalVolumeKg: number; totalReps: number; setCount: number; best1RMEstimate: number | null }[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT ws.started_at as session_date,
            MAX(wset.weight_kg) as max_weight,
            SUM(wset.weight_kg * wset.reps) as total_volume,
            SUM(wset.reps) as total_reps,
            COUNT(wset.id) as set_count
     FROM workout_exercises we
     JOIN workout_sessions ws ON we.workout_id = ws.id
     JOIN workout_sets wset ON wset.workout_exercise_id = we.id
     WHERE we.exercise_template_id = ?
       AND wset.is_completed = 1
       AND wset.is_warmup = 0
       AND ws.finished_at IS NOT NULL
     GROUP BY we.workout_id
     ORDER BY ws.started_at DESC
     LIMIT ?`,
    [exerciseTemplateId, limit],
  );
  return rows.map((r: any) => ({
    sessionDate: r.session_date,
    maxWeightKg: r.max_weight ?? 0,
    totalVolumeKg: r.total_volume ?? 0,
    totalReps: r.total_reps ?? 0,
    setCount: r.set_count ?? 0,
    best1RMEstimate: null, // Populated from set history in the screen
  }));
}

function mapTemplate(row: any): ExerciseTemplate {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group as MuscleGroup,
    equipment: row.equipment,
    isCustom: row.is_custom === 1,
    createdAt: row.created_at,
  };
}
