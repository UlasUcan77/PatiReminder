import { Router } from "express";
import { pushTokenSchema } from "@patireminder/shared";
import { prisma } from "../db";
import { currentUser } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const pushTokensRouter = Router();

// A device token belongs to whoever signed in on it last.
pushTokensRouter.post("/", validateBody(pushTokenSchema), async (req, res) => {
  const user = currentUser(req);
  await prisma.pushToken.upsert({
    where: { token: req.body.token },
    create: { token: req.body.token, platform: req.body.platform, userId: user.id },
    update: { userId: user.id, platform: req.body.platform },
  });
  res.status(204).end();
});
