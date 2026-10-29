import { createServer } from "node:http";
import { createApp } from "./app";
import { config } from "./config";
import { prisma } from "./db";
import { attachRealtime } from "./realtime";
import { startReminderLoop } from "./reminders";

const server = createServer(createApp());
const io = attachRealtime(server);
const reminders = config.REMINDERS_ENABLED ? startReminderLoop() : null;

server.listen(config.PORT, () => {
  console.log(`PatiReminder API listening on :${config.PORT}`);
});

async function shutdown() {
  if (reminders) clearInterval(reminders);
  io.close();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
