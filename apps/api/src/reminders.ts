// The reminder job. It runs every minute inside the API process and works
// from the database alone, so reminders reach phones even when the app is
// closed, and nothing is lost if the server restarts.
import { Prisma } from "@prisma/client";
import { doseSlots } from "@patireminder/shared";
import { prisma } from "./db";
import { notifyUsers } from "./lib/push";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
// A dose reminder may go out up to this late (e.g. after a restart); older
// ones are skipped rather than arriving long after the fact.
const DOSE_GRACE = 10 * MINUTE;
const VACCINE_NOTICE = 7 * DAY;

/** Records that a reminder was sent; false if another run already sent it. */
async function claim(key: string): Promise<boolean> {
  try {
    await prisma.reminderLog.create({ data: { key } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
    throw err;
  }
}

const householdMembers = { household: { include: { members: { select: { userId: true } } } } } as const;

export async function runReminders(now = new Date()) {
  let sent = 0;
  const from = new Date(now.getTime() - DOSE_GRACE);

  const medications = await prisma.medication.findMany({
    where: { active: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: from } }] },
    include: { pet: { include: householdMembers }, doses: { where: { scheduledFor: { gte: from, lte: now } } } },
  });
  for (const med of medications) {
    const recorded = new Set(med.doses.map((d) => d.scheduledFor.getTime()));
    for (const slot of doseSlots(med, from, new Date(now.getTime() + 1))) {
      if (recorded.has(slot.getTime())) continue;
      if (!(await claim(`dose:${med.id}:${slot.toISOString()}`))) continue;
      await notifyUsers(
        med.pet.household.members.map((m) => m.userId),
        `${med.pet.name}: ${med.name} zamanı`,
        `${med.dosage}. Verdikten sonra uygulamada işaretleyin.`,
        { petId: med.petId },
      );
      sent++;
    }
  }

  const vaccinations = await prisma.vaccination.findMany({
    where: { dueAt: { gt: now, lte: new Date(now.getTime() + VACCINE_NOTICE) } },
    include: { pet: { include: householdMembers } },
  });
  for (const vac of vaccinations) {
    const dueAt = vac.dueAt!;
    const daysLeft = Math.ceil((dueAt.getTime() - now.getTime()) / DAY);
    // Two reminders per due date: a week ahead and the day before.
    const stage = daysLeft <= 1 ? "1d" : "7d";
    if (!(await claim(`vaccine:${vac.id}:${dueAt.toISOString()}:${stage}`))) continue;
    await notifyUsers(
      vac.pet.household.members.map((m) => m.userId),
      `${vac.pet.name}: ${vac.name} aşısı yaklaşıyor`,
      daysLeft <= 1 ? "Aşı yarın." : `Aşıya ${daysLeft} gün kaldı.`,
      { petId: vac.petId },
    );
    sent++;
  }

  return sent;
}

export function startReminderLoop() {
  const tick = () => runReminders().catch((err) => console.error("Reminder run failed", err));
  void tick();
  return setInterval(tick, MINUTE);
}
