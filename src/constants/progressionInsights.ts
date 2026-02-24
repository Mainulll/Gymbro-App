import { MuscleGroup } from '../types';

// ─── Session Set History Types ─────────────────────────────────────────────

export interface SetWithEstimate {
  setId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
  estimated1RM: number | null; // Epley formula — null when weight=0 or reps>15
}

export interface SessionSetHistory {
  sessionId: string;
  sessionDate: string;
  sessionName: string;
  sets: SetWithEstimate[];
  maxWeightKg: number;
  best1RM: number | null;
  totalVolumeKg: number;
}

// ─── Epley 1RM Estimate ────────────────────────────────────────────────────

export function calcEpley1RM(weightKg: number, reps: number): number | null {
  if (weightKg <= 0 || reps <= 0 || reps > 15) return null;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

// ─── Trend Analysis ────────────────────────────────────────────────────────

export type TrendDirection = 'progressing' | 'stalling' | 'declining' | 'insufficient_data';

/**
 * Compare average of most-recent 3 values vs prior 3.
 * >3% improvement = progressing, >3% decline = declining, else stalling.
 */
export function analyzeTrend(values: number[]): TrendDirection {
  if (values.length < 4) return 'insufficient_data';
  const recent = values.slice(0, 3);
  const prior = values.slice(3, 6);
  if (prior.length < 1) return 'insufficient_data';
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length;
  if (priorAvg === 0) return 'insufficient_data';
  const changePct = (recentAvg - priorAvg) / priorAvg;
  if (changePct > 0.03) return 'progressing';
  if (changePct < -0.03) return 'declining';
  return 'stalling';
}

export function getProgressionAdvice(trend: TrendDirection, sessionCount: number): string {
  switch (trend) {
    case 'progressing':
      return sessionCount >= 6
        ? 'Great momentum! Add 2.5–5kg when you complete all sets with good form. Consider periodisation — every 4–6 weeks, deload at 60% to lock in gains.'
        : 'Strong start! Focus on consistent form and progressive overload. Add small weight increments (2.5kg) each session when all reps are completed cleanly.';
    case 'stalling':
      return 'Plateau detected. Try varying your rep range (switch from 3×5 to 4×8), add a top-down set, or use a microloading plate (1.25kg). A strategic deload week can also break through plateaus.';
    case 'declining':
      return 'Performance is dipping — check your recovery: aim for 7–9 hours sleep, ensure a calorie surplus or at maintenance, and reduce session frequency temporarily. Consider an active deload week.';
    case 'insufficient_data':
      return 'Log at least 4 sessions to unlock trend analysis and personalised coaching insights.';
  }
}

// ─── Rep Records ───────────────────────────────────────────────────────────

export interface RepRecord {
  repTarget: number;
  label: string;
  value: number | null;
  sessionDate: string | null;
}

/**
 * Calculate personal records across key rep targets.
 * Uses best actual weight for sets at ±1 rep of target, or estimated 1RM.
 */
export function calcRepRecords(sessions: SessionSetHistory[]): RepRecord[] {
  const targets = [
    { repTarget: 1, label: '1RM Est.' },
    { repTarget: 3, label: '3RM' },
    { repTarget: 5, label: '5RM' },
    { repTarget: 10, label: '10RM' },
    { repTarget: 20, label: '20RM' },
  ];

  return targets.map(({ repTarget, label }) => {
    let bestWeight: number | null = null;
    let bestDate: string | null = null;

    for (const sess of sessions) {
      for (const s of sess.sets) {
        if (s.isWarmup || s.weightKg <= 0) continue;

        let weight: number | null = null;
        if (repTarget === 1) {
          // Use Epley estimate
          weight = s.estimated1RM;
        } else {
          // Best actual weight within ±1 rep of target
          if (Math.abs(s.reps - repTarget) <= 1) {
            weight = s.weightKg;
          }
        }

        if (weight !== null && (bestWeight === null || weight > bestWeight)) {
          bestWeight = weight;
          bestDate = sess.sessionDate;
        }
      }
    }

    return { repTarget, label, value: bestWeight, sessionDate: bestDate };
  });
}

// ─── Coaching Tips by Muscle Group ─────────────────────────────────────────

export const COACHING_TIPS: Partial<Record<MuscleGroup, string[]>> = {
  chest: [
    'Keep your shoulder blades retracted and depressed throughout the press — this protects the rotator cuff and maximises chest activation.',
    'Touch the bar to your lower chest (not neck) and flare elbows at ~75°. Use a full stretch at the bottom for greater hypertrophy stimulus.',
    'For plateau-busting: add 2-second pause reps at the bottom to eliminate momentum and build starting strength.',
  ],
  back: [
    'Initiate every pull with your elbows — think "elbows to hips" rather than pulling with your hands. This ensures lat dominance over biceps.',
    'Maintain a neutral spine with a slight arch. Rounding under load is a common injury vector for the lower back.',
    'For lat width: use wide-grip pulldowns. For thickness: use close-grip rows. Alternate focus each training block.',
  ],
  shoulders: [
    'Press in a slight forward arc (~15° forward of vertical) to match the natural shoulder joint path and reduce impingement risk.',
    'Prioritise rear delt work — most lifters are anterior-dominant. Aim for 2:1 ratio of rear:front delt volume.',
    'For overhead press strength gains: try the Hatch method — 2 pressing days/week at different intensities (heavy/moderate).',
  ],
  biceps: [
    'Supinate your wrists at the top of every curl for full contraction. Keep elbows fixed — swinging reduces tension on the bicep.',
    'Incline dumbbell curls stretch the long head maximally — include this variation for complete bicep development.',
    'Train biceps 2–3× per week with 8–15 rep range for hypertrophy. Add a stretch-focused set (spider curl) and a peak-contraction set (concentration curl).',
  ],
  triceps: [
    'Triceps are ~2/3 of upper arm mass — prioritise them for arm size. Close-grip bench and dips are the best mass builders.',
    'Overhead tricep extensions target the long head (largest). Include this alongside pushdowns for full development.',
    'Lock out every rep fully to maximise tricep recruitment. Partial reps leave the long head understimulated.',
  ],
  quads: [
    'Squat depth matters: hit parallel or below to fully activate quads and glutes. Partial squats develop only the top range.',
    'For quad isolation: place feet shoulder-width with toes slightly out, and stay upright (high-bar squat or goblet squat).',
    'Progressive overload on quads: increase weight weekly by 2.5–5kg on squats. Spanish squats and leg press are excellent accessory work.',
  ],
  hamstrings: [
    'Nordic curls are one of the most effective hamstring exercises for injury prevention and strength — add 2–3 sets weekly.',
    'Romanian deadlifts target hamstrings through the hip hinge. Control the eccentric (3 seconds down) for maximum stimulus.',
    'Hamstrings function as both knee flexors and hip extensors — train both angles: leg curls (knee flex) + RDLs (hip ext).',
  ],
  glutes: [
    'Hip thrust: drive through your heels, squeeze hard at the top for 1 second. Full hip extension is key — don\'t let hips sag.',
    'Bulgarian split squats are arguably the best single-leg glute builder. Go deep — front shin vertical, knee tracking over toes.',
    'Progressive overload is crucial: glutes respond well to both heavy compound work (≤8 reps) and higher rep ranges (15–20).',
  ],
  core: [
    'Brace your core by creating 360° intra-abdominal pressure — imagine you\'re about to take a punch. Hold through every rep.',
    'Anti-rotation exercises (Pallof press, dead bugs) are more functional for athletic performance than crunches.',
    'Heavy compound lifts (squat, deadlift, overhead press) already train the core hard. Dedicated core work: 2–3 sets of 3–4 exercises 2× per week is sufficient.',
  ],
  forearms: [
    'Grip strength is often the limiting factor in deadlifts and rows. Train it directly: farmer\'s carries, towel pull-ups, and wrist curls.',
    'Reverse curls target the brachioradialis and build forearm thickness. Add 2–3 sets after bicep work.',
    'Grip work: 3–4 sets of dead hangs (30–60 seconds) will rapidly improve grip strength and shoulder health.',
  ],
  calves: [
    'Calves require high training frequency (3–5× per week) and high reps (15–25) due to their slow-twitch fibre composition.',
    'Full range of motion is critical: get a complete stretch at the bottom and rise fully on the toes at the top.',
    'Train calves with both straight-leg (gastrocnemius) and bent-knee (soleus) exercises: standing calf raise + seated calf raise.',
  ],
  full_body: [
    'On full-body sessions, prioritise compound movements: squat, hip hinge, push, pull, carry. This covers all patterns efficiently.',
    'Alternate intensity: heavy upper/light lower one day, light upper/heavy lower the next. Reduces CNS fatigue.',
    'Rest 2–3 minutes between compound sets to ensure adequate recovery for quality reps.',
  ],
  cardio: [
    'Zone 2 cardio (conversational pace, 60–70% max HR) builds aerobic base without impairing strength adaptations.',
    'HIIT: limit to 2 sessions per week maximum to avoid cortisol elevation and interference with muscle growth.',
    'Don\'t neglect recovery: active recovery walks (20–30 min) on off-days improve blood flow and reduce soreness.',
  ],
};
