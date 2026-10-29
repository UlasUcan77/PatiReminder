import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

export const app = createApp();

export async function resetDatabase() {
  await prisma.reminderLog.deleteMany();
  await prisma.household.deleteMany();
  await prisma.user.deleteMany();
}

export type TestUser = { id: string; token: string; householdId: string; name: string };

export async function signUp(name: string): Promise<TestUser> {
  const res = await request(app)
    .post("/auth/register")
    .send({ name, email: `${name.toLowerCase()}@example.com`, password: "a-long-enough-password" });
  if (res.status !== 201) throw new Error(`sign up failed: ${res.status} ${JSON.stringify(res.body)}`);
  const membership = await prisma.householdMember.findFirstOrThrow({ where: { userId: res.body.user.id } });
  return { id: res.body.user.id, token: res.body.token, householdId: membership.householdId, name };
}

/** Supertest bound to a signed-in user. */
export function as(user: TestUser) {
  const auth = { Authorization: `Bearer ${user.token}` };
  return {
    get: (path: string) => request(app).get(path).set(auth),
    post: (path: string, body: object = {}) => request(app).post(path).set(auth).send(body),
    patch: (path: string, body: object) => request(app).patch(path).set(auth).send(body),
    delete: (path: string) => request(app).delete(path).set(auth),
  };
}

export async function createPet(user: TestUser, name = "Boncuk") {
  const res = await as(user).post("/pets", { name, species: "DOG" });
  if (res.status !== 201) throw new Error(`create pet failed: ${res.status}`);
  return res.body as { id: string; householdId: string };
}

export async function joinHousehold(owner: TestUser, member: TestUser) {
  const invite = await as(owner).post(`/households/${owner.householdId}/invites`);
  await as(member).post("/households/join", { code: invite.body.code });
}
