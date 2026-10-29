import type { Request } from "express";
import type { ZodTypeAny, z } from "zod";
import { HttpError } from "./http-error";

export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || !value) throw new HttpError(400, `Missing ${name}`);
  return value;
}

/** Parses the query string; Express 5 makes `req.query` read-only, so this returns a new object. */
export function parseQuery<S extends ZodTypeAny>(req: Request, schema: S): z.output<S> {
  const result = schema.safeParse(req.query);
  if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid query");
  return result.data;
}
