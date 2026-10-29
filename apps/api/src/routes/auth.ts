import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  loginSchema,
  registerSchema,
  type AuthResponse,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from "@patireminder/shared";
import { prisma } from "../db";
import { HttpError } from "../lib/http-error";
import { signToken } from "../lib/token";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const BCRYPT_ROUNDS = 12;

function toPublicUser(user: PublicUser): PublicUser {
  return { id: user.id, name: user.name, email: user.email, timezone: user.timezone };
}

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), async (req, res) => {
  const input = req.body as RegisterInput;

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, "Email is already registered");

  // Every new user starts with their own household, so they can add a pet
  // right away and invite family members into it later.
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      timezone: input.timezone,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      memberships: {
        create: { role: "OWNER", household: { create: { name: `${input.name}'s home` } } },
      },
    },
  });

  const body: AuthResponse = { token: signToken(user.id), user: toPublicUser(user) };
  res.status(201).json(body);
});

authRouter.post("/login", validateBody(loginSchema), async (req, res) => {
  const input = req.body as LoginInput;
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Same message for unknown email and wrong password, so the endpoint
  // cannot be used to find out which emails are registered.
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }

  const body: AuthResponse = { token: signToken(user.id), user: toPublicUser(user) };
  res.json(body);
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(401, "Unauthorized");
  res.json(toPublicUser(user));
});
