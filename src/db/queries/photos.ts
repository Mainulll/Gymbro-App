import { SQLiteDatabase } from 'expo-sqlite';
import { ProgressPhoto } from '../../types';

export async function createProgressPhoto(
  db: SQLiteDatabase,
  photo: ProgressPhoto,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO progress_photos (id, date, local_uri, workout_session_id, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [photo.id, photo.date, photo.localUri, photo.workoutSessionId, photo.notes, photo.createdAt],
  );
}

export async function getProgressPhotos(
  db: SQLiteDatabase,
  limit = 100,
): Promise<ProgressPhoto[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM progress_photos ORDER BY date DESC, created_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(mapPhoto);
}

export async function getProgressPhotosForDate(
  db: SQLiteDatabase,
  date: string,
): Promise<ProgressPhoto[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM progress_photos WHERE date = ? ORDER BY created_at DESC',
    [date],
  );
  return rows.map(mapPhoto);
}

export async function deleteProgressPhoto(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM progress_photos WHERE id = ?', [id]);
}

function mapPhoto(row: any): ProgressPhoto {
  return {
    id: row.id,
    date: row.date,
    localUri: row.local_uri,
    workoutSessionId: row.workout_session_id,
    notes: row.notes,
    createdAt: row.created_at,
  };
}
