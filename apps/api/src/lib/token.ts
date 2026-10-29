import jwt from "jsonwebtoken";
import { config } from "../config";

const EXPIRES_IN = "7d";

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, { expiresIn: EXPIRES_IN });
}

/** Returns the user id, or null if the token is missing, expired or forged. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
