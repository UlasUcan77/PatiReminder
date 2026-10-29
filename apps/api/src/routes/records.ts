// Update and delete endpoints for records addressed by their own id
// (/vaccinations/:id, /medications/:id, ...). Creating and listing them goes
// through the pet: see routes/pets.ts.
import { Router } from "express";
import {
  medicationSchema,
  medicationUpdateSchema,
  vaccinationUpdateSchema,
  type UpcomingVaccination,
} from "@patireminder/shared";
import { z } from "zod";
import { prisma } from "../db";
import { memberOf, requireMedication } from "../lib/access";
import { publishChange } from "../lib/events";
import { HttpError } from "../lib/http-error";
import { param, parseQuery } from "../lib/params";
import { currentUser } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const recordsRouter = Router();

const OVERDUE_LOOKBACK_DAYS = 90;

recordsRouter.get("/vaccinations/upcoming", async (req, res) => {
  const user = currentUser(req);
  const { days } = parseQuery(req, z.object({ days: z.coerce.number().int().min(1).max(365).default(60) }));
  const now = Date.now();
  const rows = await prisma.vaccination.findMany({
    where: {
      pet: { household: memberOf(user.id) },
      dueAt: { gte: new Date(now - OVERDUE_LOOKBACK_DAYS * 86400000), lte: new Date(now + days * 86400000) },
    },
    include: { pet: { select: { name: true } } },
    orderBy: { dueAt: "asc" },
  });
  const body: UpcomingVaccination[] = rows.map(({ pet, ...v }) => ({
    ...JSON.parse(JSON.stringify(v)),
    petName: pet.name,
  }));
  res.json(body);
});

recordsRouter.patch("/vaccinations/:id", validateBody(vaccinationUpdateSchema), async (req, res) => {
  const user = currentUser(req);
  const existing = await findVaccination(param(req, "id"), user.id);
  const updated = await prisma.vaccination.update({ where: { id: existing.id }, data: req.body });
  if (!updated.administeredAt && !updated.dueAt) throw new HttpError(400, "A vaccination needs at least one date");
  publishChange(existing.pet.householdId, "vaccination", user, existing.petId);
  res.json(updated);
});

recordsRouter.delete("/vaccinations/:id", async (req, res) => {
  const user = currentUser(req);
  const existing = await findVaccination(param(req, "id"), user.id);
  await prisma.vaccination.delete({ where: { id: existing.id } });
  publishChange(existing.pet.householdId, "vaccination", user, existing.petId);
  res.status(204).end();
});

recordsRouter.patch("/medications/:id", validateBody(medicationUpdateSchema), async (req, res) => {
  const user = currentUser(req);
  const existing = await requireMedication(param(req, "id"), user.id);
  // Re-check the full rule set against the merged result, so a partial
  // update cannot leave an end date before the start date.
  const merged = medicationSchema.safeParse({ ...existing, ...req.body });
  if (!merged.success) throw new HttpError(400, merged.error.issues[0]?.message ?? "Invalid medication");
  const updated = await prisma.medication.update({ where: { id: existing.id }, data: req.body });
  publishChange(existing.pet.householdId, "medication", user, existing.petId);
  res.json(updated);
});

recordsRouter.delete("/medications/:id", async (req, res) => {
  const user = currentUser(req);
  const existing = await requireMedication(param(req, "id"), user.id);
  await prisma.medication.delete({ where: { id: existing.id } });
  publishChange(existing.pet.householdId, "medication", user, existing.petId);
  res.status(204).end();
});

recordsRouter.delete("/weights/:id", async (req, res) => {
  const user = currentUser(req);
  const entry = await prisma.weightEntry.findFirst({
    where: { id: param(req, "id"), pet: { household: memberOf(user.id) } },
    include: { pet: true },
  });
  if (!entry) throw new HttpError(404, "Weight entry not found");
  await prisma.weightEntry.delete({ where: { id: entry.id } });
  publishChange(entry.pet.householdId, "weight", user, entry.petId);
  res.status(204).end();
});

recordsRouter.delete("/visits/:id", async (req, res) => {
  const user = currentUser(req);
  const visit = await prisma.vetVisit.findFirst({
    where: { id: param(req, "id"), pet: { household: memberOf(user.id) } },
    include: { pet: true },
  });
  if (!visit) throw new HttpError(404, "Vet visit not found");
  await prisma.vetVisit.delete({ where: { id: visit.id } });
  publishChange(visit.pet.householdId, "visit", user, visit.petId);
  res.status(204).end();
});

async function findVaccination(id: string, userId: string) {
  const vaccination = await prisma.vaccination.findFirst({
    where: { id, pet: { household: memberOf(userId) } },
    include: { pet: true },
  });
  if (!vaccination) throw new HttpError(404, "Vaccination not found");
  return vaccination;
}
