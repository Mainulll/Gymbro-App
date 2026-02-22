import { SQLiteDatabase } from 'expo-sqlite';
import { ExerciseVideo } from '../../types';

export async function createExerciseVideo(
  db: SQLiteDatabase,
  video: ExerciseVideo,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO exercise_videos
       (id, workout_exercise_id, set_id, local_uri, thumbnail_uri,
        duration_seconds, recorded_at, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      video.id,
      video.workoutExerciseId,
      video.setId,
      video.localUri,
      video.thumbnailUri,
      video.durationSeconds,
      video.recordedAt,
      video.sizeBytes,
    ],
  );
}

export async function getVideosForExercise(
  db: SQLiteDatabase,
  workoutExerciseId: string,
): Promise<ExerciseVideo[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM exercise_videos WHERE workout_exercise_id = ? ORDER BY recorded_at DESC',
    [workoutExerciseId],
  );
  return rows.map(mapVideo);
}

export async function getVideosForExerciseTemplate(
  db: SQLiteDatabase,
  exerciseTemplateId: string,
): Promise<ExerciseVideo[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT ev.*
     FROM exercise_videos ev
     JOIN workout_exercises we ON ev.workout_exercise_id = we.id
     WHERE we.exercise_template_id = ?
     ORDER BY ev.recorded_at DESC`,
    [exerciseTemplateId],
  );
  return rows.map(mapVideo);
}

export async function deleteExerciseVideo(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM exercise_videos WHERE id = ?', [id]);
}

function mapVideo(row: any): ExerciseVideo {
  return {
    id: row.id,
    workoutExerciseId: row.workout_exercise_id,
    setId: row.set_id,
    localUri: row.local_uri,
    thumbnailUri: row.thumbnail_uri,
    durationSeconds: row.duration_seconds,
    recordedAt: row.recorded_at,
    sizeBytes: row.size_bytes,
  };
}
