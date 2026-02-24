import { create } from 'zustand';
import { BodyWeightLog, SleepLog, MoodLog } from '../types';
import { getDatabase } from '../db';
import { generateId } from '../utils/uuid';
import {
  createBodyWeightLog,
  getBodyWeightLogs,
  deleteBodyWeightLog,
  createSleepLog,
  getSleepLogs,
  deleteSleepLog,
  createMoodLog,
  getMoodLogs,
  deleteMoodLog,
} from '../db/queries/health';
import { formatDateISO } from '../utils/date';

interface HealthStore {
  weightLogs: BodyWeightLog[];
  sleepLogs: SleepLog[];
  moodLogs: MoodLog[];
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
  logMood: (mood: 1 | 2 | 3 | 4 | 5, notes?: string) => Promise<void>;
  removeMoodLog: (id: string) => Promise<void>;
}

export const useHealthStore = create<HealthStore>((set, get) => ({
  weightLogs: [],
  sleepLogs: [],
  moodLogs: [],
  isLoaded: false,

  load: async () => {
    const db = await getDatabase();
    const [weightLogs, sleepLogs, moodLogs] = await Promise.all([
      getBodyWeightLogs(db, 90),
      getSleepLogs(db, 30),
      getMoodLogs(db, 30),
    ]);
    set({ weightLogs, sleepLogs, moodLogs, isLoaded: true });
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

  logMood: async (mood, notes = '') => {
    const db = await getDatabase();
    const now = new Date();
    const log: MoodLog = {
      id: generateId(),
      date: formatDateISO(now),
      time: now.toTimeString().slice(0, 5), // HH:MM
      mood,
      notes,
      createdAt: now.toISOString(),
    };
    await createMoodLog(db, log);
    set((s) => ({ moodLogs: [log, ...s.moodLogs] }));
  },

  removeMoodLog: async (id) => {
    const db = await getDatabase();
    await deleteMoodLog(db, id);
    set((s) => ({ moodLogs: s.moodLogs.filter((l) => l.id !== id) }));
  },
}));
