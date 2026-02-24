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
  // Vitamins & minerals (null = not in API data)
  vitaminDPer100g: number | null;
  vitaminB12Per100g: number | null;
  vitaminCPer100g: number | null;
  ironPer100g: number | null;
  calciumPer100g: number | null;
  magnesiumPer100g: number | null;
  potassiumPer100g: number | null;
  zincPer100g: number | null;
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

    // Vitamins & minerals — bracket notation required (hyphens in key names)
    const vitaminDRaw: number | null = n['vitamin-d_100g'] ?? n['vitamin-d'] ?? null;
    const vitaminB12Raw: number | null = n['vitamin-b12_100g'] ?? n['vitamin-b12'] ?? null;
    const vitaminCRaw: number | null = n['vitamin-c_100g'] ?? n['vitamin-c'] ?? null;
    const ironRaw: number | null = n['iron_100g'] ?? n['iron'] ?? null;
    const calciumRaw: number | null = n['calcium_100g'] ?? n['calcium'] ?? null;
    const magnesiumRaw: number | null = n['magnesium_100g'] ?? n['magnesium'] ?? null;
    const potassiumRaw: number | null = n['potassium_100g'] ?? n['potassium'] ?? null;
    const zincRaw: number | null = n['zinc_100g'] ?? n['zinc'] ?? null;

    // Open Food Facts stores minerals in kg/100g — convert to mg; vitamins to mcg
    function toMg(val: number | null): number | null {
      if (val === null) return null;
      return val < 0.1 ? Math.round(val * 1000 * 100) / 100 : val;
    }
    function toMcg(val: number | null): number | null {
      if (val === null) return null;
      return val < 0.001 ? Math.round(val * 1_000_000 * 100) / 100 : val;
    }

    // Parse serving size — fall back to 100 g
    let servingSize = parseFloat(p.serving_quantity) || 100;
    let servingUnit = p.serving_quantity_unit || 'g';
    if (!p.serving_quantity && p.serving_size) {
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
      vitaminDPer100g: toMcg(vitaminDRaw),
      vitaminB12Per100g: toMcg(vitaminB12Raw),
      vitaminCPer100g: toMg(vitaminCRaw),
      ironPer100g: toMg(ironRaw),
      calciumPer100g: toMg(calciumRaw),
      magnesiumPer100g: toMg(magnesiumRaw),
      potassiumPer100g: toMg(potassiumRaw),
      zincPer100g: toMg(zincRaw),
    };
  } catch {
    return null;
  }
}

function scaleNullable(value: number | null, ratio: number): number | null {
  if (value === null) return null;
  return Math.round(value * ratio * 100) / 100;
}

/**
 * Scale nutriments from per-100g values to a given serving size.
 */
export function scaleNutrition(
  product: FoodProduct,
  servingSize: number,
): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  vitaminD: number | null;
  vitaminB12: number | null;
  vitaminC: number | null;
  iron: number | null;
  calcium: number | null;
  magnesium: number | null;
  potassium: number | null;
  zinc: number | null;
} {
  const ratio = servingSize / 100;
  return {
    calories: Math.round(product.caloriesPer100g * ratio),
    protein: Math.round(product.proteinPer100g * ratio * 10) / 10,
    carbs: Math.round(product.carbsPer100g * ratio * 10) / 10,
    fat: Math.round(product.fatPer100g * ratio * 10) / 10,
    vitaminD: scaleNullable(product.vitaminDPer100g, ratio),
    vitaminB12: scaleNullable(product.vitaminB12Per100g, ratio),
    vitaminC: scaleNullable(product.vitaminCPer100g, ratio),
    iron: scaleNullable(product.ironPer100g, ratio),
    calcium: scaleNullable(product.calciumPer100g, ratio),
    magnesium: scaleNullable(product.magnesiumPer100g, ratio),
    potassium: scaleNullable(product.potassiumPer100g, ratio),
    zinc: scaleNullable(product.zincPer100g, ratio),
  };
}

/** Returns true if the product has any vitamin/mineral data */
export function hasVitaminData(product: FoodProduct): boolean {
  return (
    product.vitaminDPer100g !== null ||
    product.vitaminB12Per100g !== null ||
    product.vitaminCPer100g !== null ||
    product.ironPer100g !== null ||
    product.calciumPer100g !== null ||
    product.magnesiumPer100g !== null ||
    product.potassiumPer100g !== null ||
    product.zincPer100g !== null
  );
}
