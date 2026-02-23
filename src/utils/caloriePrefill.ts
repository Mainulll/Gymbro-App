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
