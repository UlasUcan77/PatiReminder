// Web-only helpers for <input type="date"> and <input type="datetime-local">.
// Everything else comes from the shared package.
export {
  addDays,
  alreadyRecordedMessage,
  dayLabel,
  daysUntil,
  dueLabel,
  errorMessage,
  formatDate,
  formatTime,
  SPECIES_EMOJI,
  SPECIES_LABEL,
  startOfDay,
} from "@patireminder/shared";

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
