import { env } from "./env";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's local day (YYYY-MM-DD) in the app timezone. Never derive from UTC. */
export function todayLocal(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: env.tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isValidDay(value: string | undefined): value is string {
  if (!value || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Calendar arithmetic on plain dates; UTC is used only as a neutral calculator. */
export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function formatDayLong(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDayShort(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Server clock in ms, sent to clients so they can correct their own clock skew. */
export function serverNowMs(): number {
  return Date.now();
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** 0 = sunday ... 6 = saturday for a plain calendar day. */
export function weekdayOf(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** Sunday of the week containing `day` (weekdays are 0 = sunday elsewhere). */
export function weekStartOf(day: string): string {
  return addDays(day, -weekdayOf(day));
}
