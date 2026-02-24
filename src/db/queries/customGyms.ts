import { SQLiteDatabase } from 'expo-sqlite';
import { CustomGym } from '../../types';

export async function createCustomGym(db: SQLiteDatabase, gym: CustomGym): Promise<void> {
  await db.runAsync(
    `INSERT INTO custom_gyms (id, name, address, lat, lng, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [gym.id, gym.name, gym.address, gym.lat ?? null, gym.lng ?? null, gym.createdAt],
  );
}

export async function getCustomGyms(db: SQLiteDatabase): Promise<CustomGym[]> {
  const rows = await db.getAllAsync<{
    id: string; name: string; address: string;
    lat: number | null; lng: number | null; created_at: string;
  }>('SELECT * FROM custom_gyms ORDER BY created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    createdAt: r.created_at,
  }));
}

export async function deleteCustomGym(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM custom_gyms WHERE id = ?', [id]);
}
