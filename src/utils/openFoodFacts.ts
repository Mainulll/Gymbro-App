export interface FoodProduct {
  barcode: string;
  name: string;
  brand: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingSize: number;
  servingUnit: string;
}

/**
 * Look up a product by barcode using the Open Food Facts API.
 * Covers Australian and global products — no API key required.
 */
export async function lookupBarcode(barcode: string): Promise<FoodProduct | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit`;
    const res = await fetch(url, { headers: { 'User-Agent': 'GymBro/1.0' } });
    if (!res.ok) return null;

    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;

    const p = json.product;
    const n = p.nutriments ?? {};

    const caloriesPer100g =
      n['energy-kcal_100g'] ?? n['energy-kcal'] ?? (n['energy_100g'] ?? 0) / 4.184;
    const proteinPer100g = n.proteins_100g ?? n.proteins ?? 0;
    const carbsPer100g = n.carbohydrates_100g ?? n.carbohydrates ?? 0;
    const fatPer100g = n.fat_100g ?? n.fat ?? 0;

    // Parse serving size — fall back to 100 g
    let servingSize = parseFloat(p.serving_quantity) || 100;
    let servingUnit = p.serving_quantity_unit || 'g';
    if (!p.serving_quantity && p.serving_size) {
      // e.g. "30g" or "1 cup (240ml)"
      const match = p.serving_size.match(/^([\d.]+)\s*([a-zA-Z]+)/);
      if (match) {
        servingSize = parseFloat(match[1]) || 100;
        servingUnit = match[2];
      }
    }

    return {
      barcode,
      name: p.product_name ?? 'Unknown product',
      brand: p.brands ?? '',
      caloriesPer100g: Math.round(caloriesPer100g * 10) / 10,
      proteinPer100g: Math.round(proteinPer100g * 10) / 10,
      carbsPer100g: Math.round(carbsPer100g * 10) / 10,
      fatPer100g: Math.round(fatPer100g * 10) / 10,
      servingSize,
      servingUnit,
    };
  } catch {
    return null;
  }
}

/**
 * Scale nutriments from per-100g values to a given serving size.
 */
export function scaleNutrition(
  product: FoodProduct,
  servingSize: number,
): { calories: number; protein: number; carbs: number; fat: number } {
  const ratio = servingSize / 100;
  return {
    calories: Math.round(product.caloriesPer100g * ratio),
    protein: Math.round(product.proteinPer100g * ratio * 10) / 10,
    carbs: Math.round(product.carbsPer100g * ratio * 10) / 10,
    fat: Math.round(product.fatPer100g * ratio * 10) / 10,
  };
}
