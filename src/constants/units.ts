import { WeightUnit } from '../types';

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.453592;
const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

/** Convert centimetres to { ft, inches } */
export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / CM_PER_INCH;
  const ft = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = Math.round(totalInches % INCHES_PER_FOOT);
  return { ft, inches };
}

/** Convert feet + inches to centimetres */
export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * INCHES_PER_FOOT + inches) * CM_PER_INCH);
}

/** Body-Mass Index (kg / m²), rounded to 1 decimal */
export function calcBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

/** Human-readable BMI category */
export function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: '#FFB347' };
  if (bmi < 25)   return { label: 'Healthy',     color: '#4ECB71' };
  if (bmi < 30)   return { label: 'Overweight',  color: '#FFB347' };
  return             { label: 'Obese',           color: '#FF6B6B' };
}

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
