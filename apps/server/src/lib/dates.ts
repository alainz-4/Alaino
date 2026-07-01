import { addDays, isValid, parseISO } from "date-fns";

export function parseMonthKey(monthKey: string): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const start = createUtcDate(year, month, 1);
  const lastDay = new Date(Date.UTC(year, month, 0, 12, 0, 0, 0)).getUTCDate();

  return {
    start,
    end: createUtcDate(year, month, lastDay)
  };
}

export function parseDateString(input: string): Date {
  const date = parseISO(`${input}T12:00:00.000Z`);
  if (!isValid(date)) {
    throw new Error(`Invalid date: ${input}`);
  }

  return date;
}

export function formatMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function eachDateInclusive(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function createUtcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}
