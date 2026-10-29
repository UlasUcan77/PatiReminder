import { randomInt } from "node:crypto";
import { Router } from "express";
import { joinHouseholdSchema, renameHouseholdSchema, type Household, type Invite } from "@patireminder/shared";
import { prisma } from "../db";
import { requireMembership } from "../lib/access";
import { publishChange } from "../lib/events";
import { HttpError } from "../lib/http-error";
import { param } from "../lib/params";
import { currentUser } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const INVITE_TTL_DAYS = 7;
// No 0/O or 1/I, so codes are easy to read out loud.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const newCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

async function loadHousehold(householdId: string, userId: string): Promise<Household> {
  const household = await prisma.household.findUniqueOrThrow({
    where: { id: householdId },
    include: { members: { include: { user: true }, orderBy: { joinedAt: "asc" } } },
  });
  const role = household.members.find((m) => m.userId === userId)?.role ?? "MEMBER";
  return {
    id: household.id,
    name: household.name,
    role,
    members: household.members.map((m) => ({ id: m.userId, name: m.user.name, role: m.role })),
  };
}

export const householdsRouter = Router();

householdsRouter.get("/", async (req, res) => {
  const user = currentUser(req);
  const memberships = await prisma.householdMember.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
  });
  res.json(await Promise.all(memberships.map((m) => loadHousehold(m.householdId, user.id))));
});

householdsRouter.patch("/:id", validateBody(renameHouseholdSchema), async (req, res) => {
  const user = currentUser(req);
  const id = param(req, "id");
  await requireMembership(id, user.id);
  await prisma.household.update({ where: { id }, data: { name: req.body.name } });
  publishChange(id, "household", user);
  res.json(await loadHousehold(id, user.id));
});

householdsRouter.post("/:id/invites", async (req, res) => {
  const user = currentUser(req);
  const id = param(req, "id");
  await requireMembership(id, user.id);

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const taken = await prisma.householdInvite.findUnique({ where: { code } });
    if (taken) continue;
    await prisma.householdInvite.create({ data: { code, householdId: id, createdById: user.id, expiresAt } });
    const invite: Invite = { code, expiresAt: expiresAt.toISOString() };
    res.status(201).json(invite);
    return;
  }
  throw new HttpError(503, "Could not create an invite code, try again");
});

householdsRouter.post("/join", validateBody(joinHouseholdSchema), async (req, res) => {
  const user = currentUser(req);
  const invite = await prisma.householdInvite.findUnique({ where: { code: req.body.code } });
  if (!invite || invite.expiresAt < new Date()) throw new HttpError(404, "Invite code is invalid or expired");

  await prisma.householdMember.upsert({
    where: { userId_householdId: { userId: user.id, householdId: invite.householdId } },
    create: { userId: user.id, householdId: invite.householdId, role: "MEMBER" },
    update: {},
  });
  publishChange(invite.householdId, "household", user);
  res.json(await loadHousehold(invite.householdId, user.id));
});

householdsRouter.delete("/:id/membership", async (req, res) => {
  const user = currentUser(req);
  const id = param(req, "id");
  const membership = await requireMembership(id, user.id);

  const count = await prisma.householdMember.count({ where: { userId: user.id } });
  if (count === 1) throw new HttpError(400, "You cannot leave your only household");

  await prisma.$transaction(async (tx) => {
    await tx.householdMember.delete({ where: { userId_householdId: { userId: user.id, householdId: id } } });
    const remaining = await tx.householdMember.findMany({ where: { householdId: id }, orderBy: { joinedAt: "asc" } });
    if (remaining.length === 0) {
      await tx.household.delete({ where: { id } });
    } else if (membership.role === "OWNER" && !remaining.some((m) => m.role === "OWNER")) {
      // Hand ownership to whoever has been in the household the longest.
      await tx.householdMember.update({
        where: { userId_householdId: { userId: remaining[0].userId, householdId: id } },
        data: { role: "OWNER" },
      });
    }
  });
  publishChange(id, "household", user);
  res.status(204).end();
});
