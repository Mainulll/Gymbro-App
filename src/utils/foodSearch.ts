/**
 * Food search utility using Open Food Facts search API.
 * Works globally with strong Australian, US, and international coverage.
 * No API key required.
 */

export interface FoodSearchResult {
  id: string;            // product barcode or unique code
  name: string;
  brand?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingSize: number;   // grams or ml
  servingUnit: string;
  // Vitamins & minerals (nullable = not in database)
  vitaminDPer100g: number | null;
  vitaminB12Per100g: number | null;
  vitaminCPer100g: number | null;
  ironPer100g: number | null;
  calciumPer100g: number | null;
  magnesiumPer100g: number | null;
  potassiumPer100g: number | null;
  zincPer100g: number | null;
}

const OFV_FIELDS = [
  'product_name', 'brands', 'code',
  'nutriments', 'serving_quantity', 'serving_quantity_unit',
].join(',');

function toMg(raw: number | undefined | null): number | null {
  if (raw == null) return null;
  // Open Food Facts stores minerals in g/100g — convert to mg
  return raw < 0.1 ? Math.round(raw * 1000 * 100) / 100 : raw;
}

function toMcg(raw: number | undefined | null): number | null {
  if (raw == null) return null;
  // Convert g/100g → mcg/100g (multiply by 1,000,000); already mcg if > 0.001
  return raw < 0.001 ? Math.round(raw * 1_000_000 * 100) / 100 : raw;
}

function parseProduct(p: Record<string, unknown>): FoodSearchResult | null {
  const name = (p.product_name as string | undefined)?.trim();
  if (!name) return null;

  const n = (p.nutriments ?? {}) as Record<string, number>;
  const cal = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? (n['energy_100g'] ?? n['energy'] ?? 0) / 4.184;
  if (!cal || cal <= 0) return null;

  const rawServing = p.serving_quantity;
  const servingSize = typeof rawServing === 'number' && rawServing > 0 ? rawServing : 100;
  const servingUnit = (p.serving_quantity_unit as string | undefined) ?? 'g';

  return {
    id: (p.code as string | undefined) ?? String(Math.random()),
    name,
    brand: (p.brands as string | undefined)?.split(',')[0]?.trim() || undefined,
    caloriesPer100g: Math.round(cal),
    proteinPer100g: Math.round((n['proteins_100g'] ?? n.proteins ?? 0) * 10) / 10,
    carbsPer100g: Math.round((n['carbohydrates_100g'] ?? n.carbohydrates ?? 0) * 10) / 10,
    fatPer100g: Math.round((n['fat_100g'] ?? n.fat ?? 0) * 10) / 10,
    servingSize,
    servingUnit,
    vitaminDPer100g: toMcg(n['vitamin-d_100g'] ?? n['vitamin-d']),
    vitaminB12Per100g: toMcg(n['vitamin-b12_100g'] ?? n['vitamin-b12']),
    vitaminCPer100g: toMg(n['vitamin-c_100g'] ?? n['vitamin-c']),
    ironPer100g: toMg(n['iron_100g'] ?? n['iron']),
    calciumPer100g: toMg(n['calcium_100g'] ?? n['calcium']),
    magnesiumPer100g: toMg(n['magnesium_100g'] ?? n['magnesium']),
    potassiumPer100g: toMg(n['potassium_100g'] ?? n['potassium']),
    zincPer100g: toMg(n['zinc_100g'] ?? n['zinc']),
  };
}

export async function searchFood(query: string): Promise<FoodSearchResult[]> {
  if (!query.trim()) return [];
  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '25',
      fields: OFV_FIELDS,
    });
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`,
      { headers: { 'User-Agent': 'GymBro/1.0' } },
    );
    if (!res.ok) return [];
    const json = await res.json() as { products?: Record<string, unknown>[] };
    if (!Array.isArray(json.products)) return [];
    return json.products
      .map(parseProduct)
      .filter((r): r is FoodSearchResult => r !== null);
  } catch {
    return [];
  }
}

/** Scale per-100g values to a given serving size */
export function scaleSearchResult(
  result: FoodSearchResult,
  servingSize: number,
): {
  calories: number; protein: number; carbs: number; fat: number;
  vitaminD: number | null; vitaminB12: number | null; vitaminC: number | null;
  iron: number | null; calcium: number | null; magnesium: number | null;
  potassium: number | null; zinc: number | null;
} {
  const r = servingSize / 100;
  const sc = (v: number | null) => v !== null ? Math.round(v * r * 100) / 100 : null;
  return {
    calories: Math.round(result.caloriesPer100g * r),
    protein: Math.round(result.proteinPer100g * r * 10) / 10,
    carbs: Math.round(result.carbsPer100g * r * 10) / 10,
    fat: Math.round(result.fatPer100g * r * 10) / 10,
    vitaminD: sc(result.vitaminDPer100g),
    vitaminB12: sc(result.vitaminB12Per100g),
    vitaminC: sc(result.vitaminCPer100g),
    iron: sc(result.ironPer100g),
    calcium: sc(result.calciumPer100g),
    magnesium: sc(result.magnesiumPer100g),
    potassium: sc(result.potassiumPer100g),
    zinc: sc(result.zincPer100g),
  };
}
