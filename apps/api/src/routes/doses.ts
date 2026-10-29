import { Router } from "express";
import { Prisma } from "@prisma/client";
import { doseSchema, doseSlots, isDoseSlot, rangeSchema, type DoseInput, type DoseSlot } from "@patireminder/shared";
import { z } from "zod";
import { prisma } from "../db";
import { memberOf, requireMedication } from "../lib/access";
import { publishChange } from "../lib/events";
import { HttpError } from "../lib/http-error";
import { param, parseQuery } from "../lib/params";
import { notifyUsers } from "../lib/push";
import { currentUser } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

type RecordedDose = Prisma.MedicationDoseGetPayload<{ include: { givenBy: { select: { id: true; name: true } } } }>;

function toSlot(
  med: { id: string; name: string; dosage: string; petId: string; pet: { name: string } },
  scheduledFor: Date,
  dose: RecordedDose | undefined,
): DoseSlot {
  return {
    medicationId: med.id,
    medicationName: med.name,
    dosage: med.dosage,
    petId: med.petId,
    petName: med.pet.name,
    scheduledFor: scheduledFor.toISOString(),
    status: dose?.status ?? "PENDING",
    doseId: dose?.id ?? null,
    givenAt: dose?.givenAt?.toISOString() ?? null,
    givenBy: dose?.givenBy ?? null,
  };
}

export const dosesRouter = Router();

// Every dose in the range for the user's pets: the scheduled ones merged with
// whatever the household has already recorded.
dosesRouter.get("/doses", async (req, res) => {
  const user = currentUser(req);
  const { from, to } = parseQuery(req, rangeSchema);
  const { petId } = parseQuery(req, z.object({ petId: z.string().optional() }).passthrough());

  const medications = await prisma.medication.findMany({
    where: { pet: { household: memberOf(user.id) }, ...(petId ? { petId } : {}) },
    include: {
      pet: { select: { name: true } },
      doses: {
        where: { scheduledFor: { gte: from, lt: to } },
        include: { givenBy: { select: { id: true, name: true } } },
      },
    },
  });

  const slots: DoseSlot[] = [];
  for (const med of medications) {
    const recorded = new Map(med.doses.map((d) => [d.scheduledFor.getTime(), d]));
    // A stopped medication has no pending doses, but its history still shows.
    const times = med.active ? doseSlots(med, from, to) : [];
    const all = new Set([...times.map((t) => t.getTime()), ...recorded.keys()]);
    for (const t of all) slots.push(toSlot(med, new Date(t), recorded.get(t)));
  }
  slots.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor) || a.petName.localeCompare(b.petName));
  res.json(slots);
});

dosesRouter.post("/medications/:id/doses", validateBody(doseSchema), async (req, res) => {
  const user = currentUser(req);
  const med = await requireMedication(param(req, "id"), user.id);
  const input = req.body as Required<DoseInput> & { scheduledFor: Date };

  if (!isDoseSlot(med, input.scheduledFor)) throw new HttpError(400, "That time is not one of this medication's doses");

  let dose: RecordedDose;
  try {
    dose = await prisma.medicationDose.create({
      data: {
        medicationId: med.id,
        scheduledFor: input.scheduledFor,
        status: input.status,
        givenAt: new Date(),
        givenById: user.id,
      },
      include: { givenBy: { select: { id: true, name: true } } },
    });
  } catch (err) {
    // The unique (medicationId, scheduledFor) index: someone recorded this
    // dose a moment ago. Tell the client who, instead of a second record.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.medicationDose.findUniqueOrThrow({
        where: { medicationId_scheduledFor: { medicationId: med.id, scheduledFor: input.scheduledFor } },
        include: { givenBy: { select: { id: true, name: true } } },
      });
      res.status(409).json({ error: "This dose was already recorded", dose: toSlot(med, existing.scheduledFor, existing) });
      return;
    }
    throw err;
  }

  publishChange(med.pet.householdId, "dose", user, med.petId);
  if (input.status === "GIVEN") {
    const others = await prisma.householdMember.findMany({
      where: { householdId: med.pet.householdId, userId: { not: user.id } },
    });
    void notifyUsers(
      others.map((m) => m.userId),
      `${med.pet.name}: ${med.name} verildi`,
      `${user.name} verdi, tekrar vermeyin.`,
      { petId: med.petId },
    ).catch((err) => console.error("Dose notification failed", err));
  }
  res.status(201).json(toSlot(med, dose.scheduledFor, dose));
});

dosesRouter.delete("/doses/:id", async (req, res) => {
  const user = currentUser(req);
  const dose = await prisma.medicationDose.findFirst({
    where: { id: param(req, "id"), medication: { pet: { household: memberOf(user.id) } } },
    include: { medication: { include: { pet: true } } },
  });
  if (!dose) throw new HttpError(404, "Dose not found");
  await prisma.medicationDose.delete({ where: { id: dose.id } });
  publishChange(dose.medication.pet.householdId, "dose", user, dose.medication.petId);
  res.status(204).end();
});
