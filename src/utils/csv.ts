import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SQLiteDatabase } from 'expo-sqlite';
import { CSVExportOptions } from '../types';
import { getExportSets } from '../db/queries/sets';
import { getCalorieEntriesForDateRange } from '../db/queries/calories';
import { formatDateISO, getDayName, getWeekEnd } from './date';
import { format } from 'date-fns';

function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCSV(headers: string[], rows: (string | number | null)[][]): string {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map((row) => row.map(escapeCSV).join(','));
  // UTF-8 BOM + CRLF line endings for Excel compatibility
  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

export async function generateAndShareCSV(
  db: SQLiteDatabase,
  options: CSVExportOptions,
): Promise<void> {
  const weekStart = options.weekStartDate;
  const weekEnd = getWeekEnd(weekStart);
  const startStr = formatDateISO(weekStart) + 'T00:00:00.000Z';
  const endStr = formatDateISO(weekEnd) + 'T23:59:59.999Z';
  const startDate = formatDateISO(weekStart);
  const endDate = formatDateISO(weekEnd);

  const filePrefix = `GymBro_${formatDateISO(weekStart)}_to_${formatDateISO(weekEnd)}`;
  const cacheDir = FileSystem.cacheDirectory!;

  const filesToShare: string[] = [];

  if (options.includeWorkouts) {
    const sets = await getExportSets(db, startStr, endStr);
    const headers = [
      'Date', 'Day', 'Workout Name', 'Duration (min)', 'Total Volume (kg)',
      'Exercise', 'Set', 'Type', 'Weight (kg)', 'Reps', 'RPE', 'Completed At',
    ];
    const rows = sets.map((s: any) => {
      const sessionDate = s.started_at.split('T')[0];
      const sessionDay = getDayName(new Date(s.started_at));
      const durationMin = Math.round((s.duration_seconds ?? 0) / 60);
      return [
        sessionDate,
        sessionDay,
        s.session_name,
        durationMin || '',
        s.total_volume_kg || '',
        s.exercise_name,
        s.set_number,
        s.is_warmup ? 'Warmup' : 'Working',
        s.weight_kg ?? '',
        s.reps ?? '',
        s.rpe ?? '',
        s.completed_at ? s.completed_at.split('.')[0].replace('T', ' ') : '',
      ];
    });
    const csv = rowsToCSV(headers, rows);
    const workoutPath = `${cacheDir}${filePrefix}_Workouts.csv`;
    await FileSystem.writeAsStringAsync(workoutPath, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    filesToShare.push(workoutPath);
  }

  if (options.includeCalories) {
    const entries = await getCalorieEntriesForDateRange(db, startDate, endDate);
    const headers = [
      'Date', 'Day', 'Meal', 'Food',
      'Calories (kcal)', 'Protein (g)', 'Carbs (g)', 'Fat (g)',
      'Serving Size', 'Serving Unit',
    ];
    const rows = entries.map((e) => [
      e.date,
      getDayName(new Date(e.date)),
      e.mealType.charAt(0).toUpperCase() + e.mealType.slice(1),
      e.foodName,
      e.calories,
      e.proteinG,
      e.carbsG,
      e.fatG,
      e.servingSize,
      e.servingUnit,
    ]);
    const csv = rowsToCSV(headers, rows);
    const calPath = `${cacheDir}${filePrefix}_Calories.csv`;
    await FileSystem.writeAsStringAsync(calPath, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    filesToShare.push(calPath);
  }

  if (filesToShare.length === 0) return;

  // Share the first file (iOS share sheet handles one at a time well)
  await Sharing.shareAsync(filesToShare[0], {
    mimeType: 'text/csv',
    dialogTitle: `GymBro Export — ${format(weekStart, 'MMM d')} to ${format(weekEnd, 'MMM d, yyyy')}`,
    UTI: 'public.comma-separated-values-text',
  });

  // Share second file if exists
  if (filesToShare[1]) {
    await Sharing.shareAsync(filesToShare[1], {
      mimeType: 'text/csv',
      dialogTitle: `GymBro Calories — ${format(weekStart, 'MMM d')} to ${format(weekEnd, 'MMM d, yyyy')}`,
      UTI: 'public.comma-separated-values-text',
    });
  }
}
