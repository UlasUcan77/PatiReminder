import { ApiError } from "@patireminder/shared";

const DAY = 86400000;

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "—";

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export const formatDateTime = (iso: string) => `${formatDate(iso)} ${formatTime(iso)}`;

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY);

/** Whole days from today to the given date (negative when it has passed). */
export const daysUntil = (iso: string) =>
  Math.round((startOfDay(new Date(iso)).getTime() - startOfDay().getTime()) / DAY);

export function dueLabel(iso: string): { text: string; tone: "ok" | "warn" | "danger" } {
  const days = daysUntil(iso);
  if (days < 0) return { text: `${-days} gün gecikti`, tone: "danger" };
  if (days === 0) return { text: "Bugün", tone: "danger" };
  if (days === 1) return { text: "Yarın", tone: "warn" };
  if (days <= 7) return { text: `${days} gün sonra`, tone: "warn" };
  return { text: `${days} gün sonra`, tone: "ok" };
}

// <input type="date"> gives "YYYY-MM-DD". Parse it as local noon so the day
// never shifts when converted to UTC.
export const dateInputToIso = (value: string) => (value ? new Date(`${value}T12:00:00`).toISOString() : null);
export const isoToDateInput = (iso: string | null) => (iso ? toLocalInput(iso).slice(0, 10) : "");

export const dateTimeInputToIso = (value: string) => new Date(value).toISOString();
export const isoToDateTimeInput = (iso: string) => toLocalInput(iso).slice(0, 16);

function toLocalInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
}

export const SPECIES_EMOJI: Record<string, string> = { DOG: "🐶", CAT: "🐱", OTHER: "🐾" };
export const SPECIES_LABEL: Record<string, string> = { DOG: "Köpek", CAT: "Kedi", OTHER: "Diğer" };

/** Turns API errors into a sentence for the user. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "E-posta veya şifre hatalı.";
    if (err.status === 409 && err.message.includes("Email")) return "Bu e-posta zaten kayıtlı.";
    if (err.status === 404 && err.message.includes("Invite")) return "Davet kodu geçersiz ya da süresi dolmuş.";
    if (err.status === 400 && err.message.includes("only household")) return "Tek evinizden ayrılamazsınız.";
    if (err.status === 400) {
      const issues = (err.body as { issues?: Record<string, string[]> } | null)?.issues;
      const first = issues && Object.values(issues).flat()[0];
      return first ? `Kontrol edin: ${first}` : "Girilen bilgileri kontrol edin.";
    }
    return err.message;
  }
  return "Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.";
}
