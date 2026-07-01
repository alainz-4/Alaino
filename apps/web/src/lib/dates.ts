import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";

export function currentMonthKey(date = new Date()): string {
  return format(date, "yyyy-MM");
}

export function monthToDate(monthKey: string): Date {
  return new Date(`${monthKey}-01T12:00:00.000Z`);
}

export function monthDays(monthKey: string): Date[] {
  const start = startOfMonth(monthToDate(monthKey));
  const end = endOfMonth(start);
  const days: Date[] = [];
  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
    days.push(cursor);
  }
  return days;
}

export function shiftMonth(monthKey: string, offset: number): string {
  return format(addMonths(monthToDate(monthKey), offset), "yyyy-MM");
}

export function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function humanDate(dateKeyValue: string): string {
  return formatDisplayDate(dateKeyValue);
}

export function formatDisplayDate(value: string | Date | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00.000Z`) : value;
  return format(date, "dd/MM/yyyy");
}
