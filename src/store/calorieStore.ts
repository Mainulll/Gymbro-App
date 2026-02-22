import { create } from 'zustand';
import { CalorieEntry, DailyNutritionSummary, MealType } from '../types';
import { getDatabase } from '../db';
import {
  getCalorieEntriesForDate,
  getDailyNutritionSummary,
  createCalorieEntry,
  deleteCalorieEntry,
  updateCalorieEntry,
} from '../db/queries/calories';
import { formatDateISO } from '../utils/date';

interface CalorieStore {
  currentDate: string;
  entries: CalorieEntry[];
  summary: DailyNutritionSummary;
  isLoading: boolean;

  loadDay: (date?: string) => Promise<void>;
  addEntry: (entry: Omit<CalorieEntry, 'id' | 'createdAt'>) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  editEntry: (id: string, updates: Partial<CalorieEntry>) => Promise<void>;
}

const emptySummary = (date: string): DailyNutritionSummary => ({
  date,
  totalCalories: 0,
  totalProteinG: 0,
  totalCarbsG: 0,
  totalFatG: 0,
  entryCount: 0,
});

export const useCalorieStore = create<CalorieStore>((set, get) => ({
  currentDate: formatDateISO(new Date()),
  entries: [],
  summary: emptySummary(formatDateISO(new Date())),
  isLoading: false,

  loadDay: async (date?: string) => {
    const targetDate = date ?? formatDateISO(new Date());
    set({ isLoading: true, currentDate: targetDate });
    const db = await getDatabase();
    const [entries, summary] = await Promise.all([
      getCalorieEntriesForDate(db, targetDate),
      getDailyNutritionSummary(db, targetDate),
    ]);
    set({ entries, summary, isLoading: false });
  },

  addEntry: async (entry) => {
    const db = await getDatabase();
    const newEntry: CalorieEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await createCalorieEntry(db, newEntry);

    set((s) => {
      if (entry.date !== s.currentDate) return s;
      const entries = [...s.entries, newEntry];
      const summary: DailyNutritionSummary = {
        ...s.summary,
        totalCalories: s.summary.totalCalories + newEntry.calories,
        totalProteinG: s.summary.totalProteinG + newEntry.proteinG,
        totalCarbsG: s.summary.totalCarbsG + newEntry.carbsG,
        totalFatG: s.summary.totalFatG + newEntry.fatG,
        entryCount: s.summary.entryCount + 1,
      };
      return { entries, summary };
    });
  },

  removeEntry: async (id: string) => {
    const db = await getDatabase();
    const entry = get().entries.find((e) => e.id === id);
    if (!entry) return;

    await deleteCalorieEntry(db, id);

    set((s) => {
      const entries = s.entries.filter((e) => e.id !== id);
      const summary: DailyNutritionSummary = {
        ...s.summary,
        totalCalories: s.summary.totalCalories - entry.calories,
        totalProteinG: s.summary.totalProteinG - entry.proteinG,
        totalCarbsG: s.summary.totalCarbsG - entry.carbsG,
        totalFatG: s.summary.totalFatG - entry.fatG,
        entryCount: Math.max(0, s.summary.entryCount - 1),
      };
      return { entries, summary };
    });
  },

  editEntry: async (id: string, updates: Partial<CalorieEntry>) => {
    const db = await getDatabase();
    await updateCalorieEntry(db, id, updates);
    // Reload the day to recalculate summary correctly
    await get().loadDay(get().currentDate);
  },
}));
