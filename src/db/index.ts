import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  _db = await SQLite.openDatabaseAsync('gymbro.db');

  // Enable WAL mode for better performance
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  // Enforce foreign key constraints
  await _db.execAsync('PRAGMA foreign_keys = ON;');

  await runMigrations(_db);
  return _db;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL DEFAULT 0);`,
  );

  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1;',
  );
  const currentVersion = row?.version ?? 0;

  for (let i = currentVersion; i < migrations.length; i++) {
    await migrations[i](db);
    if (currentVersion === 0) {
      await db.runAsync(
        'INSERT INTO schema_version (version) VALUES (?);',
        [i + 1],
      );
    } else {
      await db.runAsync(
        'UPDATE schema_version SET version = ?;',
        [i + 1],
      );
    }
  }
}
