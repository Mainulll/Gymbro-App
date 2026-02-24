/**
 * Local gym check-in utilities.
 * Uses AsyncStorage for device-local check-in tracking.
 * Community counts are per-device (1 = you checked in today, 0 = you haven't).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OSMGym } from './overpass';

function todayString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function buildGymId(osmId: string): string {
  return `osm_${osmId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function checkinKey(gymId: string): string {
  return `@gymbro_checkin_${gymId}_${todayString()}`;
}

export async function checkInToGym(gym: OSMGym): Promise<void> {
  const gymId = buildGymId(gym.osmId);
  await AsyncStorage.setItem(checkinKey(gymId), '1');
}

export async function getTodayCheckinCount(gymId: string): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(checkinKey(gymId));
    return val === '1' ? 1 : 0;
  } catch {
    return 0;
  }
}

export async function hasCheckedInToday(gymId: string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(checkinKey(gymId));
    return val === '1';
  } catch {
    return false;
  }
}
