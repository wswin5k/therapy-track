/* The functions assume that date is represented as a Date object
 * with all time fields set to 0. To get the actual day functions utilizing
 * local time zone should be used. */

export function normalizeToDateOnly(date: Date): Date {
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getTodayDateOnly(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function dayDifference(firstTime: Date, secondDate: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(
    Math.abs((firstTime.getTime() - secondDate.getTime()) / oneDay),
  );
}

export function isEqualDateOnly(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate() &&
    first.getTimezoneOffset() === second.getTimezoneOffset()
  );
}

export function isLessOrEqualDateOnly(first: Date, second: Date): boolean {
  return first.getTime() <= second.getTime();
}

export function serializeDateOnly(value: Date): string {
  return value.toLocaleDateString();
}

export function deserializeDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function serializeDateOnlyNullable(value: Date | null): string | null {
  return value === null ? null : serializeDateOnly(value);
}

export function deserializeDateOnlyNullable(value: string | null): Date | null {
  if (value !== null) {
    return deserializeDateOnly(value);
  } else {
    return null;
  }
}
