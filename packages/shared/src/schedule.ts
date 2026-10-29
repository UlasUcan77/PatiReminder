// Doses are not stored ahead of time. A medication is a rule ("every N hours
// from startsAt until endsAt"), and the slots are computed from it. Only a dose
// that someone records (given or skipped) becomes a row in the database.

export type Schedule = {
  startsAt: Date;
  endsAt: Date | null;
  intervalHours: number;
};

const HOUR = 3600 * 1000;
const MAX_SLOTS = 2000;

/** All dose times in [from, to). */
export function doseSlots(schedule: Schedule, from: Date, to: Date): Date[] {
  const start = schedule.startsAt.getTime();
  const step = schedule.intervalHours * HOUR;
  const end = Math.min(to.getTime(), schedule.endsAt ? schedule.endsAt.getTime() + 1 : Infinity);

  const first = Math.max(0, Math.ceil((from.getTime() - start) / step));
  const slots: Date[] = [];
  for (let t = start + first * step; t < end && slots.length < MAX_SLOTS; t += step) {
    slots.push(new Date(t));
  }
  return slots;
}

/** True if `at` is exactly one of the schedule's dose times. */
export function isDoseSlot(schedule: Schedule, at: Date): boolean {
  const offset = at.getTime() - schedule.startsAt.getTime();
  if (offset < 0 || offset % (schedule.intervalHours * HOUR) !== 0) return false;
  return !schedule.endsAt || at <= schedule.endsAt;
}

export function describeInterval(hours: number): string {
  if (hours === 24) return "Her gün";
  if (hours === 168) return "Haftada bir";
  if (hours < 24 && 24 % hours === 0) return `Günde ${24 / hours} kez`;
  if (hours % 24 === 0) return `${hours / 24} günde bir`;
  return `${hours} saatte bir`;
}
