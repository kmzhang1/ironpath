import * as XLSX from 'xlsx';
import type { FullProgram, LifterProfile } from '@/types';
import { matchExerciseToLift, calculateWorkingWeight } from './liftingMath';

interface ExcelRow {
  Week: number;
  Day: number;
  Exercise: string;
  Sets: number;
  Reps: string;
  RPE: number;
  'Calculated Load': string;
  'Rest (sec)': number;
  Notes: string;
}

/**
 * Generates an Excel training log from a program
 * Calculates loads based on 1RM and RPE for main lifts
 */
export function generateExcelLog(program: FullProgram, profile: LifterProfile): void {
  const rows: ExcelRow[] = [];

  // Iterate through weeks -> sessions -> exercises
  program.weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      session.exercises.forEach((exercise) => {
        // Match exercise to lift category
        const liftCategory = matchExerciseToLift(exercise.name);

        let calculatedLoad = 'N/A';

        if (liftCategory) {
          // Get the 1RM for this lift
          const oneRepMax = profile.oneRepMax[liftCategory];

          // Parse reps (could be "5" or "8-10" or "AMRAP")
          const repsMatch = exercise.reps.match(/(\d+)/);
          if (repsMatch) {
            const reps = parseInt(repsMatch[1], 10);

            // Calculate weight using RPE chart
            const weight = calculateWorkingWeight(oneRepMax, reps, exercise.rpeTarget);

            calculatedLoad = `${weight} ${profile.biometrics.unit}`;
          } else if (exercise.reps.toUpperCase().includes('AMRAP')) {
            // For AMRAP, suggest a conservative weight (RPE 8 equivalent)
            const weight = calculateWorkingWeight(oneRepMax, 5, 8);
            calculatedLoad = `~${weight} ${profile.biometrics.unit} (AMRAP)`;
          }
        }

        rows.push({
          Week: week.weekNumber,
          Day: session.dayNumber,
          Exercise: exercise.name,
          Sets: exercise.sets,
          Reps: exercise.reps,
          RPE: exercise.rpeTarget,
          'Calculated Load': calculatedLoad,
          'Rest (sec)': exercise.restSeconds,
          Notes: exercise.notes || '',
        });
      });
    });
  });

  // Create worksheet from rows
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // Week
    { wch: 6 },  // Day
    { wch: 25 }, // Exercise
    { wch: 6 },  // Sets
    { wch: 10 }, // Reps
    { wch: 6 },  // RPE
    { wch: 15 }, // Calculated Load
    { wch: 10 }, // Rest
    { wch: 35 }, // Notes
  ];

  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Training Log');

  // Add a summary sheet
  const summaryData = [
    ['IronPath AI - Training Program'],
    [''],
    ['Athlete', profile.name],
    ['Program', program.title],
    ['Created', new Date(program.createdAt).toLocaleDateString()],
    [''],
    ['1RM Squat', `${profile.oneRepMax.squat} ${profile.biometrics.unit}`],
    ['1RM Bench Press', `${profile.oneRepMax.bench} ${profile.biometrics.unit}`],
    ['1RM Deadlift', `${profile.oneRepMax.deadlift} ${profile.biometrics.unit}`],
    ['Total', `${profile.oneRepMax.squat + profile.oneRepMax.bench + profile.oneRepMax.deadlift} ${profile.biometrics.unit}`],
    [''],
    ['Bodyweight', `${profile.biometrics.bodyweight} ${profile.biometrics.unit}`],
    ['Age', profile.biometrics.age],
    ['Sex', profile.biometrics.sex],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Generate filename with date
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `IronPath_Program_${dateStr}.xlsx`;

  // Write file and trigger download
  XLSX.writeFile(workbook, filename);
}
