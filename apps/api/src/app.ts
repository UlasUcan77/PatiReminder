import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { requireAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/error";
import { authRouter } from "./routes/auth";
import { dosesRouter } from "./routes/doses";
import { householdsRouter } from "./routes/households";
import { petsRouter } from "./routes/pets";
import { pushTokensRouter } from "./routes/push-tokens";
import { recordsRouter } from "./routes/records";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN.split(",") }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/auth", authRouter);
  app.use("/households", requireAuth, householdsRouter);
  app.use("/pets", requireAuth, petsRouter);
  app.use("/push-tokens", requireAuth, pushTokensRouter);
  app.use(requireAuth, dosesRouter, recordsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(errorHandler);

  return app;
}
