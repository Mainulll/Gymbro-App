import { WeightUnit } from '../types';

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.453592;

export function toDisplayWeight(kg: number | null, unit: WeightUnit): string {
  if (kg === null) return '';
  const value = unit === 'lbs' ? kg * KG_TO_LBS : kg;
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
}

export function toDisplayWeightNumber(kg: number | null, unit: WeightUnit): number | null {
  if (kg === null) return null;
  return unit === 'lbs' ? Math.round(kg * KG_TO_LBS * 10) / 10 : Math.round(kg * 10) / 10;
}

export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  return unit === 'lbs' ? value * LBS_TO_KG : value;
}

export function weightLabel(unit: WeightUnit): string {
  return unit === 'lbs' ? 'lbs' : 'kg';
}

export function formatVolume(kg: number, unit: WeightUnit): string {
  const value = unit === 'lbs' ? kg * KG_TO_LBS : kg;
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k ${unit}`;
  }
  return `${Math.round(value)} ${unit}`;
}
