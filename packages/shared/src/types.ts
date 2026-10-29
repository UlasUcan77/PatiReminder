// Shapes of API responses. Dates travel as ISO 8601 strings.
import type { Species } from "./schemas";

export type ISODate = string;

export type Member = { id: string; name: string; role: "OWNER" | "MEMBER" };

export type Household = {
  id: string;
  name: string;
  role: "OWNER" | "MEMBER";
  members: Member[];
};

export type Invite = { code: string; expiresAt: ISODate };

export type Pet = {
  id: string;
  householdId: string;
  name: string;
  species: Species;
  breed: string | null;
  birthDate: ISODate | null;
};

export type Vaccination = {
  id: string;
  petId: string;
  name: string;
  administeredAt: ISODate | null;
  dueAt: ISODate | null;
  vetName: string | null;
  notes: string | null;
};

export type Medication = {
  id: string;
  petId: string;
  name: string;
  dosage: string;
  intervalHours: number;
  startsAt: ISODate;
  endsAt: ISODate | null;
  notes: string | null;
  active: boolean;
};

export type DoseStatus = "PENDING" | "GIVEN" | "SKIPPED";

/** One scheduled dose, whether or not anyone has recorded it yet. */
export type DoseSlot = {
  medicationId: string;
  medicationName: string;
  dosage: string;
  petId: string;
  petName: string;
  scheduledFor: ISODate;
  status: DoseStatus;
  doseId: string | null;
  givenAt: ISODate | null;
  givenBy: { id: string; name: string } | null;
};

export type WeightEntry = { id: string; petId: string; kg: number; measuredAt: ISODate };

export type VetVisit = {
  id: string;
  petId: string;
  visitedAt: ISODate;
  clinic: string | null;
  reason: string | null;
  notes: string | null;
};

export type UpcomingVaccination = Vaccination & { petName: string };

export type HealthRecord = {
  pet: Pet;
  vaccinations: Vaccination[];
  medications: Medication[];
  weights: WeightEntry[];
  visits: VetVisit[];
};

/** Sent over Socket.IO to everyone in a household when its data changes. */
export type HouseholdChange = {
  householdId: string;
  entity: "household" | "pet" | "vaccination" | "medication" | "dose" | "weight" | "visit";
  petId: string | null;
  actor: { id: string; name: string };
};

export const HOUSEHOLD_CHANGED = "household:changed";
