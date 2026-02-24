/**
 * One-shot "pending prefill" for the calories screen.
 * Set before navigating back; consumed once on focus.
 */

export interface CaloriePrefill {
  meal: string;
  foodName: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  servingSize: string;
  servingUnit: string;
  // Optional extended macros
  fiber?: string;
  sugar?: string;
  sodium?: string;
  saturatedFat?: string;
  // Optional vitamins & minerals
  vitaminD?: string;
  vitaminB12?: string;
  vitaminC?: string;
  iron?: string;
  calcium?: string;
  magnesium?: string;
  potassium?: string;
  zinc?: string;
}

let pending: CaloriePrefill | null = null;

export function setPendingCaloriePrefill(data: CaloriePrefill): void {
  pending = data;
}

export function consumePendingCaloriePrefill(): CaloriePrefill | null {
  const data = pending;
  pending = null;
  return data;
}
