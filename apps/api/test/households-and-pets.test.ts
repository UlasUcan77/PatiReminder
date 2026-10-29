import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { as, createPet, joinHousehold, resetDatabase, signUp } from "./helpers";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe("pets", () => {
  it("are created in the user's household and listed for them", async () => {
    const ulas = await signUp("Ulas");
    const pet = await createPet(ulas, "Boncuk");
    expect(pet.householdId).toBe(ulas.householdId);

    const list = await as(ulas).get("/pets");
    expect(list.body.map((p: { name: string }) => p.name)).toEqual(["Boncuk"]);
  });

  it("are invisible to people outside the household", async () => {
    const ulas = await signUp("Ulas");
    const stranger = await signUp("Stranger");
    const pet = await createPet(ulas);

    expect((await as(stranger).get("/pets")).body).toEqual([]);
    expect((await as(stranger).get(`/pets/${pet.id}`)).status).toBe(404);
    expect((await as(stranger).patch(`/pets/${pet.id}`, { name: "Mine" })).status).toBe(404);
    expect((await as(stranger).delete(`/pets/${pet.id}`)).status).toBe(404);
    expect((await as(stranger).post(`/pets/${pet.id}/vaccinations`, { name: "Kuduz", dueAt: new Date() })).status).toBe(
      404,
    );
  });

  it("cannot be created in someone else's household", async () => {
    const ulas = await signUp("Ulas");
    const stranger = await signUp("Stranger");
    const res = await as(stranger).post("/pets", { name: "Sneaky", householdId: ulas.householdId });
    expect(res.status).toBe(404);
  });

  it("return a full health record", async () => {
    const ulas = await signUp("Ulas");
    const pet = await createPet(ulas);
    await as(ulas).post(`/pets/${pet.id}/vaccinations`, { name: "Karma", administeredAt: "2026-01-10" });
    await as(ulas).post(`/pets/${pet.id}/weights`, { kg: 12.4, measuredAt: "2026-02-01" });
    await as(ulas).post(`/pets/${pet.id}/visits`, { visitedAt: "2026-02-01", reason: "Kontrol" });

    const record = await as(ulas).get(`/pets/${pet.id}/record`);
    expect(record.status).toBe(200);
    expect(record.body.vaccinations).toHaveLength(1);
    expect(record.body.weights[0].kg).toBe(12.4);
    expect(record.body.visits[0].reason).toBe("Kontrol");
  });
});

describe("households", () => {
  it("let a family member join with an invite code and share pets", async () => {
    const ulas = await signUp("Ulas");
    const ayse = await signUp("Ayse");
    const pet = await createPet(ulas);

    const invite = await as(ulas).post(`/households/${ulas.householdId}/invites`);
    expect(invite.status).toBe(201);
    expect(invite.body.code).toMatch(/^[A-Z2-9]{6}$/);

    const joined = await as(ayse).post("/households/join", { code: invite.body.code.toLowerCase() });
    expect(joined.status).toBe(200);
    expect(joined.body.members.map((m: { name: string }) => m.name)).toEqual(["Ulas", "Ayse"]);

    expect((await as(ayse).get(`/pets/${pet.id}`)).status).toBe(200);
  });

  it("reject expired invite codes", async () => {
    const ulas = await signUp("Ulas");
    const ayse = await signUp("Ayse");
    const invite = await as(ulas).post(`/households/${ulas.householdId}/invites`);
    await prisma.householdInvite.update({
      where: { code: invite.body.code },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect((await as(ayse).post("/households/join", { code: invite.body.code })).status).toBe(404);
  });

  it("do not let you leave your only household", async () => {
    const ulas = await signUp("Ulas");
    expect((await as(ulas).delete(`/households/${ulas.householdId}/membership`)).status).toBe(400);
  });

  it("pass ownership on when the owner leaves", async () => {
    const ulas = await signUp("Ulas");
    const ayse = await signUp("Ayse");
    await joinHousehold(ulas, ayse);

    expect((await as(ulas).delete(`/households/${ulas.householdId}/membership`)).status).toBe(400);
    // Ulas can leave once he belongs to another household.
    await joinHousehold(ayse, ulas);
    expect((await as(ulas).delete(`/households/${ulas.householdId}/membership`)).status).toBe(204);

    const households = await as(ayse).get("/households");
    const shared = households.body.find((h: { id: string }) => h.id === ulas.householdId);
    expect(shared.members).toEqual([{ id: ayse.id, name: "Ayse", role: "OWNER" }]);
  });
});

describe("vaccinations", () => {
  it("clear the old due date when a new shot replaces it", async () => {
    const ulas = await signUp("Ulas");
    const pet = await createPet(ulas);
    const soon = new Date(Date.now() + 3 * 86400000).toISOString();
    const first = await as(ulas).post(`/pets/${pet.id}/vaccinations`, {
      name: "Kuduz",
      administeredAt: "2025-11-01",
      dueAt: soon,
    });

    let upcoming = await as(ulas).get("/vaccinations/upcoming");
    expect(upcoming.body.map((v: { id: string; petName: string }) => [v.id, v.petName])).toEqual([
      [first.body.id, "Boncuk"],
    ]);

    await as(ulas).post(`/pets/${pet.id}/vaccinations`, {
      name: "Kuduz",
      administeredAt: new Date().toISOString(),
      dueAt: "2027-11-01",
      replacesId: first.body.id,
    });

    upcoming = await as(ulas).get("/vaccinations/upcoming");
    expect(upcoming.body).toEqual([]);
  });

  it("need at least one date", async () => {
    const ulas = await signUp("Ulas");
    const pet = await createPet(ulas);
    expect((await as(ulas).post(`/pets/${pet.id}/vaccinations`, { name: "Kuduz" })).status).toBe(400);
  });
});
