// Every pet belongs to a household, and a user may only touch pets in
// households they are a member of. These helpers are the single place that
// rule is enforced. They answer 404 rather than 403, so ids from other
// households cannot be probed.
import { prisma } from "../db";
import { HttpError } from "./http-error";

export const memberOf = (userId: string) => ({ members: { some: { userId } } });

export async function requireMembership(householdId: string, userId: string) {
  const membership = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
  });
  if (!membership) throw new HttpError(404, "Household not found");
  return membership;
}

export async function requirePet(petId: string, userId: string) {
  const pet = await prisma.pet.findFirst({ where: { id: petId, household: memberOf(userId) } });
  if (!pet) throw new HttpError(404, "Pet not found");
  return pet;
}

export async function requireMedication(medicationId: string, userId: string) {
  const medication = await prisma.medication.findFirst({
    where: { id: medicationId, pet: { household: memberOf(userId) } },
    include: { pet: true },
  });
  if (!medication) throw new HttpError(404, "Medication not found");
  return medication;
}
