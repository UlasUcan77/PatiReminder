import { z } from "zod";

// Optional free text: trims, and turns "" into null so clients can clear a
// field. A missing field stays undefined, so partial updates leave it alone.
const text = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v === undefined ? undefined : v || null));

const date = z.coerce.date();
// null and "" must be checked before coercion: z.coerce.date() would turn
// null into 1 January 1970.
const optionalDate = z
  .union([z.null(), z.literal(""), z.coerce.date()])
  .optional()
  .transform((v) => (v instanceof Date ? v : v === undefined ? undefined : null));

export const speciesValues = ["DOG", "CAT", "OTHER"] as const;
export type Species = (typeof speciesValues)[number];

export const petSchema = z.object({
  householdId: z.string().optional(),
  name: z.string().trim().min(1).max(60),
  species: z.enum(speciesValues).default("DOG"),
  breed: text(60),
  birthDate: optionalDate,
});
export const petUpdateSchema = petSchema.omit({ householdId: true }).partial();
export type PetInput = z.input<typeof petSchema>;

export const vaccinationSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    administeredAt: optionalDate,
    dueAt: optionalDate,
    vetName: text(80),
    notes: text(),
    // Set when this shot fulfils an earlier record's due date; that record's
    // due date is then cleared so it stops showing as upcoming or overdue.
    replacesId: z.string().optional(),
  })
  .refine((v) => v.administeredAt || v.dueAt, {
    message: "Enter the date it was given, the next due date, or both",
    path: ["dueAt"],
  });
export const vaccinationUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  administeredAt: optionalDate,
  dueAt: optionalDate,
  vetName: text(80).optional(),
  notes: text().optional(),
});
export type VaccinationInput = z.input<typeof vaccinationSchema>;

const medicationFields = {
  name: z.string().trim().min(1).max(80),
  dosage: z.string().trim().min(1).max(80),
  // Every N hours from `startsAt`: 24 = daily, 12 = twice a day, 168 = weekly.
  intervalHours: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 60),
  startsAt: date,
  endsAt: optionalDate,
  notes: text(),
  active: z.boolean().default(true),
};
export const medicationSchema = z.object(medicationFields).refine((m) => !m.endsAt || m.endsAt > m.startsAt, {
  message: "End date must be after the start date",
  path: ["endsAt"],
});
export const medicationUpdateSchema = z.object(medicationFields).partial();
export type MedicationInput = z.input<typeof medicationSchema>;

export const doseStatusValues = ["GIVEN", "SKIPPED"] as const;
export const doseSchema = z.object({
  scheduledFor: date,
  status: z.enum(doseStatusValues).default("GIVEN"),
});
export type DoseInput = z.input<typeof doseSchema>;

export const weightSchema = z.object({
  kg: z.coerce.number().positive().max(200),
  measuredAt: date,
});
export type WeightInput = z.input<typeof weightSchema>;

export const vetVisitSchema = z.object({
  visitedAt: date,
  clinic: text(80),
  reason: text(120),
  notes: text(1000),
});
export type VetVisitInput = z.input<typeof vetVisitSchema>;

export const joinHouseholdSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "Invite codes are 6 letters or digits"),
});

export const renameHouseholdSchema = z.object({ name: z.string().trim().min(1).max(60) });

export const pushTokenSchema = z.object({
  token: z.string().min(1).max(200),
  platform: z.enum(["ios", "android", "web"]),
});

export const rangeSchema = z
  .object({ from: date, to: date })
  .refine((r) => r.to > r.from && r.to.getTime() - r.from.getTime() <= 62 * 24 * 3600 * 1000, {
    message: "Range must be positive and at most 62 days",
  });
