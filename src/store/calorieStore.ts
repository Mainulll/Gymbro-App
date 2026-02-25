import { create } from 'zustand';
import { CalorieEntry, DailyNutritionSummary, DailyMicroSummary } from '../types';
import { getDatabase } from '../db';
import {
  getCalorieEntriesForDate,
  getDailyNutritionSummary,
  getDailyMicroSummary,
  createCalorieEntry,
  deleteCalorieEntry,
  updateCalorieEntry,
} from '../db/queries/calories';
import { emptyMicroSummary } from '../constants/micronutrients';
import { formatDateISO } from '../utils/date';
import { generateId } from '../utils/uuid';

interface CalorieStore {
  currentDate: string;
  entries: CalorieEntry[];
  summary: DailyNutritionSummary;
  microSummary: DailyMicroSummary;
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
  microSummary: emptyMicroSummary(formatDateISO(new Date())),
  isLoading: false,

  loadDay: async (date?: string) => {
    const targetDate = date ?? formatDateISO(new Date());
    set({ isLoading: true, currentDate: targetDate });
    const db = await getDatabase();
    const [entries, summary, microSummary] = await Promise.all([
      getCalorieEntriesForDate(db, targetDate),
      getDailyNutritionSummary(db, targetDate),
      getDailyMicroSummary(db, targetDate),
    ]);
    set({ entries, summary, microSummary, isLoading: false });
  },

  addEntry: async (entry) => {
    const db = await getDatabase();
    const newEntry: CalorieEntry = {
      ...entry,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    try {
      await createCalorieEntry(db, newEntry);
    } catch (err) {
      console.error('[calorieStore] Failed to persist entry:', err);
      throw err; // propagate so the UI can show an error
    }

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
      const microSummary: DailyMicroSummary = {
        ...s.microSummary,
        vitaminDMcg: s.microSummary.vitaminDMcg + (newEntry.vitaminDMcg ?? 0),
        vitaminB12Mcg: s.microSummary.vitaminB12Mcg + (newEntry.vitaminB12Mcg ?? 0),
        vitaminCMg: s.microSummary.vitaminCMg + (newEntry.vitaminCMg ?? 0),
        ironMg: s.microSummary.ironMg + (newEntry.ironMg ?? 0),
        calciumMg: s.microSummary.calciumMg + (newEntry.calciumMg ?? 0),
        magnesiumMg: s.microSummary.magnesiumMg + (newEntry.magnesiumMg ?? 0),
        potassiumMg: s.microSummary.potassiumMg + (newEntry.potassiumMg ?? 0),
        zincMg: s.microSummary.zincMg + (newEntry.zincMg ?? 0),
      };
      return { entries, summary, microSummary };
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
    // Reload the day to recalculate all summaries correctly
    await get().loadDay(get().currentDate);
  },
}));
