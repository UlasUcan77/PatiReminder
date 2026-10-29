// Builds the printable health record as a standalone HTML page. The web panel
// prints it to PDF in the browser and the mobile app turns it into a PDF with
// expo-print, so both produce the same document.
import { describeInterval } from "./schedule";
import type { HealthRecord } from "./types";

const SPECIES: Record<string, string> = { DOG: "Köpek", CAT: "Kedi", OTHER: "Diğer" };

const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

function table(headers: string[], rows: unknown[][], empty: string) {
  if (rows.length === 0) return `<p class="empty">${escape(empty)}</p>`;
  return `<table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${escape(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

export function renderHealthRecordHtml(record: HealthRecord, generatedAt = new Date()): string {
  const { pet, vaccinations, medications, weights, visits } = record;
  const facts = [
    ["Tür", SPECIES[pet.species] ?? pet.species],
    ["Irk", pet.breed ?? "—"],
    ["Doğum tarihi", day(pet.birthDate)],
    ["Son kilo", weights.length ? `${weights[weights.length - 1].kg} kg` : "—"],
  ];

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>${escape(pet.name)} — Sağlık Karnesi</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1f2328; margin: 32px; font-size: 13px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #d1242f; }
  .sub { color: #59636e; margin: 0 0 16px; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0; }
  dt { color: #59636e; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #d0d7de; vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #59636e; }
  .empty { color: #59636e; font-style: italic; }
  footer { margin-top: 32px; color: #8c959f; font-size: 11px; }
</style></head><body>
<h1>${escape(pet.name)}</h1>
<p class="sub">Sağlık karnesi · ${escape(day(generatedAt.toISOString()))}</p>
<dl>${facts.map(([k, v]) => `<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`).join("")}</dl>

<h2>Aşılar</h2>
${table(
  ["Aşı", "Yapıldı", "Sonraki", "Veteriner", "Not"],
  vaccinations.map((v) => [v.name, day(v.administeredAt), day(v.dueAt), v.vetName ?? "", v.notes ?? ""]),
  "Kayıtlı aşı yok.",
)}

<h2>İlaçlar</h2>
${table(
  ["İlaç", "Doz", "Sıklık", "Başlangıç", "Bitiş", "Durum"],
  medications.map((m) => [
    m.name,
    m.dosage,
    describeInterval(m.intervalHours),
    day(m.startsAt),
    day(m.endsAt),
    m.active ? "Devam ediyor" : "Bitti",
  ]),
  "Kayıtlı ilaç yok.",
)}

<h2>Veteriner ziyaretleri</h2>
${table(
  ["Tarih", "Klinik", "Sebep", "Not"],
  visits.map((v) => [day(v.visitedAt), v.clinic ?? "", v.reason ?? "", v.notes ?? ""]),
  "Kayıtlı ziyaret yok.",
)}

<h2>Kilo</h2>
${table(
  ["Tarih", "Kilo"],
  weights.map((w) => [day(w.measuredAt), `${w.kg} kg`]),
  "Kayıtlı ölçüm yok.",
)}

<footer>PatiReminder ile oluşturuldu. Bu belge veteriner tarafından verilen bilgilerin kaydıdır; tıbbi tavsiye içermez.</footer>
</body></html>`;
}
