import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import { app, resetDatabase } from "./helpers";

const user = { name: "Ulaş", email: "ulas@example.com", password: "correct-horse-battery" };

beforeEach(resetDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /health", () => {
  it("reports ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("POST /auth/register", () => {
  it("creates the user with their own household and returns a token", async () => {
    const res = await request(app).post("/auth/register").send(user);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: "Ulaş", email: "ulas@example.com", timezone: "Europe/Istanbul" });
    expect(res.body.user).not.toHaveProperty("passwordHash");

    const memberships = await prisma.householdMember.findMany({ where: { userId: res.body.user.id } });
    expect(memberships).toHaveLength(1);
    expect(memberships[0].role).toBe("OWNER");
  });

  it("normalises the email and rejects a duplicate", async () => {
    await request(app).post("/auth/register").send(user);
    const res = await request(app)
      .post("/auth/register")
      .send({ ...user, email: "  ULAS@example.com " });
    expect(res.status).toBe(409);
  });

  it("rejects a short password", async () => {
    const res = await request(app).post("/auth/register").send({ ...user, password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.issues).toHaveProperty("password");
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/auth/register").send(user);
  });

  it("returns a token for the right password", async () => {
    const res = await request(app).post("/auth/login").send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const wrongPassword = await request(app).post("/auth/login").send({ email: user.email, password: "nope-nope" });
    const unknownEmail = await request(app).post("/auth/login").send({ email: "who@example.com", password: "nope-nope" });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});

describe("GET /auth/me", () => {
  it("requires a valid token", async () => {
    expect((await request(app).get("/auth/me")).status).toBe(401);
    expect((await request(app).get("/auth/me").set("Authorization", "Bearer forged")).status).toBe(401);
  });

  it("returns the signed-in user", async () => {
    const { body } = await request(app).post("/auth/register").send(user);
    const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
  });
});
