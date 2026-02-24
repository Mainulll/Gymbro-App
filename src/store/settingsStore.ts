import { create } from 'zustand';
import { UserSettings } from '../types';
import { getDatabase } from '../db';
import { getUserSettings, updateUserSettings } from '../db/queries/settings';

interface SettingsStore {
  settings: UserSettings;
  isLoaded: boolean;
  load: () => Promise<void>;
  update: (updates: Partial<UserSettings>) => Promise<void>;
}

const defaults: UserSettings = {
  weightUnit: 'kg',
  dailyCalorieGoal: 2000,
  dailyProteinGoal: 150,
  dailyCarbsGoal: 250,
  dailyFatGoal: 65,
  restTimerSeconds: 90,
  hapticFeedback: true,
  displayName: '',
  profilePhotoUri: null,
  heightCm: null,
  ageYears: null,
  sex: null,
  currentWeightKg: null,
  targetWeightKg: null,
  activityLevel: 'moderately_active',
  goalType: 'maintain',
  homeGymId: null,
  homeGymName: null,
  homeGymLat: null,
  homeGymLng: null,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaults,
  isLoaded: false,

  load: async () => {
    const db = await getDatabase();
    const settings = await getUserSettings(db);
    set({ settings, isLoaded: true });
  },

  update: async (updates) => {
    const db = await getDatabase();
    await updateUserSettings(db, updates);
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },
}));
