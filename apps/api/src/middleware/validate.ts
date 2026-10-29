import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

/** Parses `req.body` with the schema and replaces it with the parsed value. */
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid request body", issues: result.error.flatten().fieldErrors });
      return;
    }
    req.body = result.data;
    next();
  };
}
