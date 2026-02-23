import { create } from 'zustand';
import { BodyWeightLog, SleepLog } from '../types';
import { getDatabase } from '../db';
import { generateId } from '../utils/uuid';
import {
  createBodyWeightLog,
  getBodyWeightLogs,
  deleteBodyWeightLog,
  createSleepLog,
  getSleepLogs,
  deleteSleepLog,
} from '../db/queries/health';
import { formatDateISO } from '../utils/date';

interface HealthStore {
  weightLogs: BodyWeightLog[];
  sleepLogs: SleepLog[];
  isLoaded: boolean;

  load: () => Promise<void>;
  logWeight: (weightKg: number, bodyFatPct?: number, notes?: string) => Promise<void>;
  removeWeightLog: (id: string) => Promise<void>;
  logSleep: (params: {
    date?: string;
    bedTime: string;
    wakeTime: string;
    durationMinutes: number;
    quality: number;
    notes?: string;
  }) => Promise<void>;
  removeSleepLog: (id: string) => Promise<void>;
}

export const useHealthStore = create<HealthStore>((set, get) => ({
  weightLogs: [],
  sleepLogs: [],
  isLoaded: false,

  load: async () => {
    const db = await getDatabase();
    const [weightLogs, sleepLogs] = await Promise.all([
      getBodyWeightLogs(db, 90),
      getSleepLogs(db, 30),
    ]);
    set({ weightLogs, sleepLogs, isLoaded: true });
  },

  logWeight: async (weightKg, bodyFatPct, notes = '') => {
    const db = await getDatabase();
    const log: BodyWeightLog = {
      id: generateId(),
      date: formatDateISO(new Date()),
      weightKg,
      bodyFatPct: bodyFatPct ?? null,
      notes,
      createdAt: new Date().toISOString(),
    };
    await createBodyWeightLog(db, log);
    set((s) => ({ weightLogs: [log, ...s.weightLogs] }));
  },

  removeWeightLog: async (id) => {
    const db = await getDatabase();
    await deleteBodyWeightLog(db, id);
    set((s) => ({ weightLogs: s.weightLogs.filter((l) => l.id !== id) }));
  },

  logSleep: async ({ date, bedTime, wakeTime, durationMinutes, quality, notes = '' }) => {
    const db = await getDatabase();
    const log: SleepLog = {
      id: generateId(),
      date: date ?? formatDateISO(new Date()),
      bedTime,
      wakeTime,
      durationMinutes,
      quality,
      notes,
      createdAt: new Date().toISOString(),
    };
    await createSleepLog(db, log);
    set((s) => ({ sleepLogs: [log, ...s.sleepLogs] }));
  },

  removeSleepLog: async (id) => {
    const db = await getDatabase();
    await deleteSleepLog(db, id);
    set((s) => ({ sleepLogs: s.sleepLogs.filter((l) => l.id !== id) }));
  },
}));
