import jwt from "jsonwebtoken";
import { config } from "../config";

const EXPIRES_IN = "30d";

export type TokenUser = { id: string; name: string };

// The name rides along in the token so real-time events and notifications can
// say who did something without an extra database query.
export function signToken(user: TokenUser): string {
  return jwt.sign({ sub: user.id, name: user.name }, config.JWT_SECRET, { expiresIn: EXPIRES_IN });
}

/** Returns the user, or null if the token is missing, expired or forged. */
export function verifyToken(token: string): TokenUser | null {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    if (typeof payload !== "object" || typeof payload.sub !== "string") return null;
    return { id: payload.sub, name: typeof payload.name === "string" ? payload.name : "" };
  } catch {
    return null;
  }
}
