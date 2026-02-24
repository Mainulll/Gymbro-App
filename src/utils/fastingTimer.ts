import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FastingState {
  isActive: boolean;
  startedAt: string | null;   // ISO timestamp
  targetHours: number | null;
}

const KEY = '@gymbro_fasting_state';

const DEFAULT_STATE: FastingState = {
  isActive: false,
  startedAt: null,
  targetHours: null,
};

export async function loadFastingState(): Promise<FastingState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    return JSON.parse(raw) as FastingState;
  } catch {
    return DEFAULT_STATE;
  }
}

export async function saveFastingState(s: FastingState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

export async function startFast(targetHours: number | null): Promise<FastingState> {
  const state: FastingState = {
    isActive: true,
    startedAt: new Date().toISOString(),
    targetHours,
  };
  await saveFastingState(state);
  return state;
}

export async function endFast(): Promise<FastingState> {
  const state: FastingState = DEFAULT_STATE;
  await saveFastingState(state);
  return state;
}

export function formatElapsed(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
