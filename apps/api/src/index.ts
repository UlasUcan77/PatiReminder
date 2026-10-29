import { createApp } from "./app";
import { config } from "./config";
import { prisma } from "./db";

const server = createApp().listen(config.PORT, () => {
  console.log(`PatiReminder API listening on :${config.PORT}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
