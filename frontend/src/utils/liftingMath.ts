/**
 * RPE to Percentage Chart (Tuscherer's RPE Scale)
 * Maps RPE values to percentage of 1RM based on reps
 */
const RPE_CHART: Record<number, Record<number, number>> = {
  10: { 1: 100, 2: 95.5, 3: 92.2, 4: 89.2, 5: 86.3, 6: 83.7, 7: 81.1, 8: 78.6, 9: 76.2, 10: 74.0 },
  9.5: { 1: 97.8, 2: 93.9, 3: 90.7, 4: 87.8, 5: 85.0, 6: 82.4, 7: 79.9, 8: 77.4, 9: 75.1, 10: 72.9 },
  9: { 1: 95.5, 2: 92.2, 3: 89.2, 4: 86.3, 5: 83.7, 6: 81.1, 7: 78.6, 8: 76.2, 9: 74.0, 10: 71.8 },
  8.5: { 1: 93.9, 2: 90.7, 3: 87.8, 4: 85.0, 5: 82.4, 6: 79.9, 7: 77.4, 8: 75.1, 9: 72.9, 10: 70.7 },
  8: { 1: 92.2, 2: 89.2, 3: 86.3, 4: 83.7, 5: 81.1, 6: 78.6, 7: 76.2, 8: 74.0, 9: 71.8, 10: 69.7 },
  7.5: { 1: 90.7, 2: 87.8, 3: 85.0, 4: 82.4, 5: 79.9, 6: 77.4, 7: 75.1, 8: 72.9, 9: 70.7, 10: 68.6 },
  7: { 1: 89.2, 2: 86.3, 3: 83.7, 4: 81.1, 5: 78.6, 6: 76.2, 7: 74.0, 8: 71.8, 9: 69.7, 10: 67.6 },
  6.5: { 1: 87.8, 2: 85.0, 3: 82.4, 4: 79.9, 5: 77.4, 6: 75.1, 7: 72.9, 8: 70.7, 9: 68.6, 10: 66.6 },
  6: { 1: 86.3, 2: 83.7, 3: 81.1, 4: 78.6, 5: 76.2, 6: 74.0, 7: 71.8, 8: 69.7, 9: 67.6, 10: 65.6 },
};

/**
 * Calculate estimated 1RM from weight, reps, and RPE
 */
export function calculateOneRepMax(weight: number, reps: number, rpe: number): number {
  const clampedReps = Math.max(1, Math.min(reps, 10));
  const clampedRPE = Math.max(6, Math.min(rpe, 10));

  // Round RPE to nearest 0.5
  const roundedRPE = Math.round(clampedRPE * 2) / 2;

  const percentage = RPE_CHART[roundedRPE]?.[clampedReps] || 75;

  return Math.round((weight / percentage) * 100);
}

/**
 * Calculate working weight from 1RM, reps, and RPE
 */
export function calculateWorkingWeight(oneRepMax: number, reps: number, rpe: number): number {
  const clampedReps = Math.max(1, Math.min(reps, 10));
  const clampedRPE = Math.max(6, Math.min(rpe, 10));

  // Round RPE to nearest 0.5
  const roundedRPE = Math.round(clampedRPE * 2) / 2;

  const percentage = RPE_CHART[roundedRPE]?.[clampedReps] || 75;

  return Math.round((oneRepMax * percentage) / 100);
}

/**
 * Calculate DOTS score (IPF formula)
 * Used to compare lifters of different bodyweights
 */
export function calculateDOTS(
  bodyweight: number,
  total: number,
  sex: 'male' | 'female',
  unit: 'kg' | 'lbs' = 'kg'
): number {
  // Convert to kg if needed
  let bw = unit === 'lbs' ? bodyweight * 0.453592 : bodyweight;
  let totalKg = unit === 'lbs' ? total * 0.453592 : total;

  // DOTS coefficients
  const coefficients = {
    male: {
      a: -0.0000010930,
      b: 0.0007391293,
      c: -0.1918759221,
      d: 24.0900756,
      e: -307.75076,
    },
    female: {
      a: -0.0000010706,
      b: 0.0005158568,
      c: -0.1126655495,
      d: 13.6175032,
      e: -57.96288,
    },
  };

  const coeff = coefficients[sex];

  // Calculate denominator
  const denominator =
    coeff.a * Math.pow(bw, 4) +
    coeff.b * Math.pow(bw, 3) +
    coeff.c * Math.pow(bw, 2) +
    coeff.d * bw +
    coeff.e;

  // DOTS = Total / Denominator * 500
  const dots = (totalKg / denominator) * 500;

  return Math.round(dots * 100) / 100;
}

/**
 * Match exercise name to main lift category
 * Handles variations like "Pause Squat", "Close Grip Bench", etc.
 */
export function matchExerciseToLift(exerciseName: string): 'squat' | 'bench' | 'deadlift' | null {
  const name = exerciseName.toLowerCase();

  // Squat variations
  if (
    name.includes('squat') ||
    name.includes('front squat') ||
    name.includes('box squat') ||
    name.includes('pause squat') ||
    name.includes('tempo squat') ||
    name.includes('pin squat') ||
    name.includes('safety bar squat') ||
    name.includes('ssb squat')
  ) {
    return 'squat';
  }

  // Bench variations
  if (
    name.includes('bench') ||
    name.includes('press') && (
      name.includes('bench') ||
      name.includes('close grip') ||
      name.includes('wide grip') ||
      name.includes('pause bench') ||
      name.includes('spoto') ||
      name.includes('floor press')
    )
  ) {
    return 'bench';
  }

  // Deadlift variations
  if (
    name.includes('deadlift') ||
    name.includes('dead lift') ||
    name.includes('deficit') && name.includes('pull') ||
    name.includes('block pull') ||
    name.includes('rack pull') ||
    name.includes('romanian') && (name.includes('deadlift') || name.includes('rdl')) ||
    name.includes('stiff leg') && name.includes('deadlift') ||
    name.includes('sumo') && name.includes('deadlift')
  ) {
    return 'deadlift';
  }

  return null;
}

/**
 * Convert weight between kg and lbs
 */
export function convertWeight(weight: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number {
  if (from === to) return weight;

  if (from === 'kg' && to === 'lbs') {
    return Math.round(weight * 2.20462 * 10) / 10;
  }

  if (from === 'lbs' && to === 'kg') {
    return Math.round(weight * 0.453592 * 10) / 10;
  }

  return weight;
}
