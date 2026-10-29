import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { pushSender, type PushMessage } from "../src/lib/push";
import { runReminders } from "../src/reminders";
import { as, createPet, joinHousehold, resetDatabase, signUp, type TestUser } from "./helpers";

let sent: PushMessage[] = [];
const realSend = pushSender.send;

beforeEach(async () => {
  await resetDatabase();
  sent = [];
  pushSender.send = async (messages) => {
    sent.push(...messages);
  };
});
afterEach(() => {
  pushSender.send = realSend;
});
afterAll(() => prisma.$disconnect());

const START = new Date("2026-11-01T08:00:00Z");

async function setup() {
  const ulas = await signUp("Ulas");
  const ayse = await signUp("Ayse");
  await joinHousehold(ulas, ayse);
  const pet = await createPet(ulas);
  const med = await as(ulas).post(`/pets/${pet.id}/medications`, {
    name: "Antibiyotik",
    dosage: "1 tablet",
    intervalHours: 12,
    startsAt: START.toISOString(),
  });
  return { ulas, ayse, pet, medId: med.body.id as string };
}

async function registerDevice(user: TestUser, token: string) {
  await as(user).post("/push-tokens", { token, platform: "android" });
}

const day = (from: string, to: string) => `/doses?from=${from}&to=${to}`;

describe("doses", () => {
  it("lists the scheduled doses for a day", async () => {
    const { ulas } = await setup();
    const res = await as(ulas).get(day("2026-11-01T00:00:00Z", "2026-11-02T00:00:00Z"));
    expect(res.status).toBe(200);
    expect(res.body.map((d: { scheduledFor: string; status: string }) => [d.scheduledFor, d.status])).toEqual([
      ["2026-11-01T08:00:00.000Z", "PENDING"],
      ["2026-11-01T20:00:00.000Z", "PENDING"],
    ]);
  });

  it("records a dose once; a second person gets 409 with who gave it", async () => {
    const { ulas, ayse, medId } = await setup();
    const first = await as(ulas).post(`/medications/${medId}/doses`, { scheduledFor: START.toISOString() });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ status: "GIVEN", givenBy: { name: "Ulas" } });

    const second = await as(ayse).post(`/medications/${medId}/doses`, { scheduledFor: START.toISOString() });
    expect(second.status).toBe(409);
    expect(second.body.dose.givenBy.name).toBe("Ulas");
    expect(await prisma.medicationDose.count()).toBe(1);
  });

  it("only accepts times that are on the schedule", async () => {
    const { ulas, medId } = await setup();
    const res = await as(ulas).post(`/medications/${medId}/doses`, { scheduledFor: "2026-11-01T09:00:00Z" });
    expect(res.status).toBe(400);
  });

  it("can be undone", async () => {
    const { ulas, medId } = await setup();
    const given = await as(ulas).post(`/medications/${medId}/doses`, { scheduledFor: START.toISOString() });
    expect((await as(ulas).delete(`/doses/${given.body.doseId}`)).status).toBe(204);
    const res = await as(ulas).get(day("2026-11-01T00:00:00Z", "2026-11-01T12:00:00Z"));
    expect(res.body[0].status).toBe("PENDING");
  });

  it("tells the rest of the family when a dose is given", async () => {
    const { ulas, ayse, medId } = await setup();
    await registerDevice(ulas, "ExponentPushToken[ulas]");
    await registerDevice(ayse, "ExponentPushToken[ayse]");

    await as(ulas).post(`/medications/${medId}/doses`, { scheduledFor: START.toISOString() });
    await new Promise((r) => setTimeout(r, 50));

    expect(sent.map((m) => m.to)).toEqual(["ExponentPushToken[ayse]"]);
    expect(sent[0].body).toContain("Ulas");
  });

  it("keeps the history of a stopped medication but drops its pending doses", async () => {
    const { ulas, medId } = await setup();
    await as(ulas).post(`/medications/${medId}/doses`, { scheduledFor: START.toISOString() });
    await as(ulas).patch(`/medications/${medId}`, { active: false });

    const res = await as(ulas).get(day("2026-11-01T00:00:00Z", "2026-11-02T00:00:00Z"));
    expect(res.body.map((d: { status: string }) => d.status)).toEqual(["GIVEN"]);
  });

  it("rejects an update that would end a medication before it starts", async () => {
    const { ulas, medId } = await setup();
    const res = await as(ulas).patch(`/medications/${medId}`, { endsAt: "2026-10-01T00:00:00Z" });
    expect(res.status).toBe(400);
  });
});

describe("reminders", () => {
  it("send a dose reminder to every member's device exactly once", async () => {
    const { ulas, ayse } = await setup();
    await registerDevice(ulas, "ExponentPushToken[ulas]");
    await registerDevice(ayse, "ExponentPushToken[ayse]");

    const twoMinutesLate = new Date(START.getTime() + 2 * 60_000);
    expect(await runReminders(twoMinutesLate)).toBe(1);
    expect(await runReminders(twoMinutesLate)).toBe(0);
    expect(sent.map((m) => m.to).sort()).toEqual(["ExponentPushToken[ayse]", "ExponentPushToken[ulas]"]);
    expect(sent[0].title).toBe("Boncuk: Antibiyotik zamanı");
  });

  it("skip doses that were already given", async () => {
    const { ulas, medId } = await setup();
    await registerDevice(ulas, "ExponentPushToken[ulas]");
    await as(ulas).post(`/medications/${medId}/doses`, { scheduledFor: START.toISOString() });
    sent = [];

    expect(await runReminders(new Date(START.getTime() + 60_000))).toBe(0);
    expect(sent).toEqual([]);
  });

  it("skip doses that are too far in the past", async () => {
    const { ulas } = await setup();
    await registerDevice(ulas, "ExponentPushToken[ulas]");
    expect(await runReminders(new Date(START.getTime() + 60 * 60_000))).toBe(0);
  });

  it("remind about a vaccine a week ahead and again the day before", async () => {
    const { ulas, pet } = await setup();
    await prisma.medication.updateMany({ data: { active: false } });
    await registerDevice(ulas, "ExponentPushToken[ulas]");
    const dueAt = new Date("2026-12-10T09:00:00Z");
    await as(ulas).post(`/pets/${pet.id}/vaccinations`, { name: "Kuduz", dueAt: dueAt.toISOString() });

    const weekBefore = new Date(dueAt.getTime() - 6.5 * 86400000);
    expect(await runReminders(weekBefore)).toBe(1);
    expect(await runReminders(weekBefore)).toBe(0);
    expect(sent[0].body).toBe("Aşıya 7 gün kaldı.");

    const dayBefore = new Date(dueAt.getTime() - 12 * 3600000);
    expect(await runReminders(dayBefore)).toBe(1);
    expect(sent[1].body).toBe("Aşı yarın.");
  });
});
