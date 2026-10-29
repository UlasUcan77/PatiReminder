import type { Request, RequestHandler } from "express";
import { HttpError } from "../lib/http-error";
import { verifyToken, type TokenUser } from "../lib/token";

declare global {
  namespace Express {
    interface Request {
      user?: TokenUser;
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const user = token ? verifyToken(token) : null;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = user;
  next();
};

/** The signed-in user; only call this in routes behind `requireAuth`. */
export function currentUser(req: Request): TokenUser {
  if (!req.user) throw new HttpError(401, "Unauthorized");
  return req.user;
}
