import type { Prisma } from "@prisma/client";
import type { WeightEntry } from "@patireminder/shared";

// Prisma returns Decimal for weights; the API speaks plain numbers.
export function toWeight(entry: { id: string; petId: string; kg: Prisma.Decimal; measuredAt: Date }): WeightEntry {
  return { id: entry.id, petId: entry.petId, kg: Number(entry.kg), measuredAt: entry.measuredAt.toISOString() };
}
