import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday, isYesterday } from 'date-fns';

export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

export function getWeekEnd(date: Date = new Date()): Date {
  return endOfWeek(date, { weekStartsOn: 1 }); // Sunday
}

export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDateTimeISO(date: Date): string {
  return date.toISOString();
}

export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
}

export function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'h:mm a');
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDurationMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export function getDayName(date: Date): string {
  return format(date, 'EEEE'); // "Monday", "Tuesday", etc.
}

export function getShortDayName(date: Date): string {
  return format(date, 'EEE'); // "Mon", "Tue", etc.
}

export function getWeekLabel(weekStart: Date): string {
  const weekEnd = getWeekEnd(weekStart);
  return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`;
}

export function getPreviousWeekStart(weekStart: Date): Date {
  return subWeeks(weekStart, 1);
}

export function getNextWeekStart(weekStart: Date): Date {
  return addWeeks(weekStart, 1);
}

export function isCurrentWeek(weekStart: Date): boolean {
  const currentWeekStart = getWeekStart();
  return formatDateISO(weekStart) === formatDateISO(currentWeekStart);
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}
