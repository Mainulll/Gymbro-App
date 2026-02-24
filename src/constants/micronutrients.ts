import { MicroNutrient, DailyMicroSummary } from '../types';
import { Colors } from './theme';

export const MICRO_NUTRIENTS: MicroNutrient[] = [
  {
    key: 'vitaminDMcg',
    label: 'Vitamin D',
    unit: 'mcg',
    rdaMale: 15,
    rdaFemale: 15,
    color: Colors.amber,
    foodSources: ['Salmon', 'Egg yolks', 'Fortified milk', 'Tuna'],
    deficiencyWarning:
      'Low Vitamin D impairs testosterone production, reduces muscle protein synthesis, and weakens bone density — all critical for gym performance.',
    supplementTip:
      'Take 1,000–2,000 IU Vitamin D3 daily with a fatty meal. Pair with Vitamin K2 (100mcg) to direct calcium to bones. Test levels every 6 months.',
  },
  {
    key: 'vitaminB12Mcg',
    label: 'Vitamin B12',
    unit: 'mcg',
    rdaMale: 2.4,
    rdaFemale: 2.4,
    color: Colors.teal,
    foodSources: ['Beef', 'Sardines', 'Eggs', 'Greek yogurt'],
    deficiencyWarning:
      'B12 deficiency causes fatigue, poor oxygen delivery to muscles, and nerve damage. Plant-based athletes are especially at risk.',
    supplementTip:
      'Take 500–1,000mcg methylcobalamin (not cyanocobalamin) daily. Sublingual absorption is superior. Best taken in the morning.',
  },
  {
    key: 'vitaminCMg',
    label: 'Vitamin C',
    unit: 'mg',
    rdaMale: 90,
    rdaFemale: 75,
    color: Colors.coral,
    foodSources: ['Bell peppers', 'Kiwi', 'Oranges', 'Broccoli'],
    deficiencyWarning:
      'Vitamin C is essential for collagen synthesis — critical for tendon and ligament health. Deficiency increases injury risk and slows recovery.',
    supplementTip:
      'Take 500mg–1g daily split into two doses. Take after training to support collagen synthesis. Avoid megadoses over 2g (GI issues).',
  },
  {
    key: 'ironMg',
    label: 'Iron',
    unit: 'mg',
    rdaMale: 8,
    rdaFemale: 18,
    color: Colors.coral,
    foodSources: ['Red meat', 'Lentils', 'Spinach', 'Pumpkin seeds'],
    deficiencyWarning:
      'Iron deficiency (anaemia) severely limits oxygen transport to muscles, causing rapid fatigue, reduced VO2 max, and poor training adaptations.',
    supplementTip:
      'Supplement only if blood tests confirm deficiency — iron overload is harmful. If needed, take 18–27mg ferrous bisglycinate with Vitamin C, away from calcium.',
  },
  {
    key: 'calciumMg',
    label: 'Calcium',
    unit: 'mg',
    rdaMale: 1000,
    rdaFemale: 1000,
    color: Colors.accent,
    foodSources: ['Dairy', 'Sardines (with bones)', 'Tofu', 'Almonds'],
    deficiencyWarning:
      'Calcium is required for muscle contractions. Chronic deficiency leads to stress fractures, muscle cramps, and long-term osteoporosis.',
    supplementTip:
      'Aim to get calcium from food. If supplementing, use calcium citrate (500mg max per dose) taken with Vitamin D3. Spread doses — body absorbs max ~500mg at once.',
  },
  {
    key: 'magnesiumMg',
    label: 'Magnesium',
    unit: 'mg',
    rdaMale: 400,
    rdaFemale: 310,
    color: Colors.mint,
    foodSources: ['Dark chocolate', 'Avocado', 'Almonds', 'Leafy greens'],
    deficiencyWarning:
      'Over 70% of people are deficient. Magnesium is involved in 300+ enzymatic reactions including ATP production, muscle relaxation, and cortisol regulation.',
    supplementTip:
      'Take 200–400mg magnesium glycinate or malate before bed — improves sleep quality and recovery. Avoid magnesium oxide (poor absorption, causes diarrhoea).',
  },
  {
    key: 'potassiumMg',
    label: 'Potassium',
    unit: 'mg',
    rdaMale: 3400,
    rdaFemale: 2600,
    color: Colors.pink,
    foodSources: ['Banana', 'Sweet potato', 'Avocado', 'Coconut water'],
    deficiencyWarning:
      'Potassium regulates fluid balance and muscle contractions. Low levels cause muscle cramps, weakness, and poor endurance — especially after sweating.',
    supplementTip:
      'Prioritise food sources (banana ~450mg, sweet potato ~950mg). If supplementing, take no more than 100mg per dose. Electrolyte powders containing potassium are ideal post-workout.',
  },
  {
    key: 'zincMg',
    label: 'Zinc',
    unit: 'mg',
    rdaMale: 11,
    rdaFemale: 8,
    color: Colors.teal,
    foodSources: ['Oysters', 'Beef', 'Pumpkin seeds', 'Chickpeas'],
    deficiencyWarning:
      'Zinc is critical for testosterone production, immune function, and protein synthesis. Intense training increases zinc losses through sweat.',
    supplementTip:
      'Take 15–30mg zinc bisglycinate or zinc picolinate daily. Avoid taking with calcium or iron (compete for absorption). ZMA (Zinc + Magnesium + B6) before bed is a popular stack.',
  },
];

export type MicroStatus = 'excellent' | 'good' | 'low' | 'missing';

export function getMicroStatus(value: number | null, rda: number): MicroStatus {
  if (value === null || value === 0) return 'missing';
  const pct = value / rda;
  if (pct >= 1.0) return 'excellent';
  if (pct >= 0.75) return 'good';
  return 'low';
}

export function getRDA(n: MicroNutrient, sex: 'male' | 'female' | null): number {
  return sex === 'female' ? n.rdaFemale : n.rdaMale;
}

export function emptyMicroSummary(date: string): DailyMicroSummary {
  return {
    date,
    vitaminDMcg: 0,
    vitaminB12Mcg: 0,
    vitaminCMg: 0,
    ironMg: 0,
    calciumMg: 0,
    magnesiumMg: 0,
    potassiumMg: 0,
    zincMg: 0,
  };
}
