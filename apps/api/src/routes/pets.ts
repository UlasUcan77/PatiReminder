import { Router } from "express";
import {
  medicationSchema,
  petSchema,
  petUpdateSchema,
  vaccinationSchema,
  vetVisitSchema,
  weightSchema,
  type HealthRecord,
} from "@patireminder/shared";
import type { z } from "zod";
import { prisma } from "../db";
import { memberOf, requireMembership, requirePet } from "../lib/access";
import { publishChange } from "../lib/events";
import { HttpError } from "../lib/http-error";
import { param } from "../lib/params";
import { toWeight } from "../lib/serialize";
import { currentUser } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const petsRouter = Router();

petsRouter.get("/", async (req, res) => {
  const user = currentUser(req);
  res.json(await prisma.pet.findMany({ where: { household: memberOf(user.id) }, orderBy: { createdAt: "asc" } }));
});

petsRouter.post("/", validateBody(petSchema), async (req, res) => {
  const user = currentUser(req);
  const { householdId: requested, ...data } = req.body as z.output<typeof petSchema>;

  let householdId = requested;
  if (householdId) {
    await requireMembership(householdId, user.id);
  } else {
    const first = await prisma.householdMember.findFirst({ where: { userId: user.id }, orderBy: { joinedAt: "asc" } });
    if (!first) throw new HttpError(400, "Create or join a household first");
    householdId = first.householdId;
  }

  const pet = await prisma.pet.create({ data: { ...data, birthDate: data.birthDate ?? null, householdId } });
  publishChange(householdId, "pet", user, pet.id);
  res.status(201).json(pet);
});

petsRouter.get("/:id", async (req, res) => {
  res.json(await requirePet(param(req, "id"), currentUser(req).id));
});

petsRouter.patch("/:id", validateBody(petUpdateSchema), async (req, res) => {
  const user = currentUser(req);
  const pet = await requirePet(param(req, "id"), user.id);
  const updated = await prisma.pet.update({ where: { id: pet.id }, data: req.body });
  publishChange(pet.householdId, "pet", user, pet.id);
  res.json(updated);
});

petsRouter.delete("/:id", async (req, res) => {
  const user = currentUser(req);
  const pet = await requirePet(param(req, "id"), user.id);
  await prisma.pet.delete({ where: { id: pet.id } });
  publishChange(pet.householdId, "pet", user, pet.id);
  res.status(204).end();
});

petsRouter.get("/:id/record", async (req, res) => {
  const pet = await requirePet(param(req, "id"), currentUser(req).id);
  const [vaccinations, medications, weights, visits] = await Promise.all([
    prisma.vaccination.findMany({ where: { petId: pet.id }, orderBy: [{ administeredAt: "desc" }, { dueAt: "desc" }] }),
    prisma.medication.findMany({ where: { petId: pet.id }, orderBy: { startsAt: "desc" } }),
    prisma.weightEntry.findMany({ where: { petId: pet.id }, orderBy: { measuredAt: "asc" } }),
    prisma.vetVisit.findMany({ where: { petId: pet.id }, orderBy: { visitedAt: "desc" } }),
  ]);
  // JSON serialisation turns Dates into ISO strings, matching HealthRecord.
  const record = JSON.parse(
    JSON.stringify({ pet, vaccinations, medications, weights: weights.map(toWeight), visits }),
  ) as HealthRecord;
  res.json(record);
});

// --- Records that hang off a pet -------------------------------------------

petsRouter.get("/:id/vaccinations", async (req, res) => {
  const pet = await requirePet(param(req, "id"), currentUser(req).id);
  res.json(
    await prisma.vaccination.findMany({
      where: { petId: pet.id },
      orderBy: [{ administeredAt: { sort: "desc", nulls: "first" } }, { dueAt: "asc" }],
    }),
  );
});

petsRouter.post("/:id/vaccinations", validateBody(vaccinationSchema), async (req, res) => {
  const user = currentUser(req);
  const pet = await requirePet(param(req, "id"), user.id);
  const { replacesId, ...data } = req.body as z.output<typeof vaccinationSchema>;

  const vaccination = await prisma.$transaction(async (tx) => {
    if (replacesId) {
      const { count } = await tx.vaccination.updateMany({ where: { id: replacesId, petId: pet.id }, data: { dueAt: null } });
      if (count === 0) throw new HttpError(404, "Vaccination to replace not found");
    }
    return tx.vaccination.create({
      data: { ...data, administeredAt: data.administeredAt ?? null, dueAt: data.dueAt ?? null, petId: pet.id },
    });
  });
  publishChange(pet.householdId, "vaccination", user, pet.id);
  res.status(201).json(vaccination);
});

petsRouter.get("/:id/medications", async (req, res) => {
  const pet = await requirePet(param(req, "id"), currentUser(req).id);
  res.json(
    await prisma.medication.findMany({ where: { petId: pet.id }, orderBy: [{ active: "desc" }, { startsAt: "desc" }] }),
  );
});

petsRouter.post("/:id/medications", validateBody(medicationSchema), async (req, res) => {
  const user = currentUser(req);
  const pet = await requirePet(param(req, "id"), user.id);
  const data = req.body as z.output<typeof medicationSchema>;
  const medication = await prisma.medication.create({ data: { ...data, endsAt: data.endsAt ?? null, petId: pet.id } });
  publishChange(pet.householdId, "medication", user, pet.id);
  res.status(201).json(medication);
});

petsRouter.get("/:id/weights", async (req, res) => {
  const pet = await requirePet(param(req, "id"), currentUser(req).id);
  const weights = await prisma.weightEntry.findMany({ where: { petId: pet.id }, orderBy: { measuredAt: "asc" } });
  res.json(weights.map(toWeight));
});

petsRouter.post("/:id/weights", validateBody(weightSchema), async (req, res) => {
  const user = currentUser(req);
  const pet = await requirePet(param(req, "id"), user.id);
  const entry = await prisma.weightEntry.create({ data: { ...req.body, petId: pet.id } });
  publishChange(pet.householdId, "weight", user, pet.id);
  res.status(201).json(toWeight(entry));
});

petsRouter.get("/:id/visits", async (req, res) => {
  const pet = await requirePet(param(req, "id"), currentUser(req).id);
  res.json(await prisma.vetVisit.findMany({ where: { petId: pet.id }, orderBy: { visitedAt: "desc" } }));
});

petsRouter.post("/:id/visits", validateBody(vetVisitSchema), async (req, res) => {
  const user = currentUser(req);
  const pet = await requirePet(param(req, "id"), user.id);
  const visit = await prisma.vetVisit.create({ data: { ...req.body, petId: pet.id } });
  publishChange(pet.householdId, "visit", user, pet.id);
  res.status(201).json(visit);
});
