// Push notifications go through Expo's push service, which forwards them to
// FCM (Android) and APNs (iOS). Only the token's owner device receives it.
import { prisma } from "../db";

export type PushMessage = { to: string; title: string; body: string; data?: Record<string, string> };

type Ticket = { status: "ok" | "error"; details?: { error?: string } };

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function sendViaExpo(messages: PushMessage[]): Promise<void> {
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batch.map((m) => ({ ...m, sound: "default" }))),
    });
    if (!res.ok) {
      console.error(`Expo push failed with ${res.status}`);
      continue;
    }
    const { data } = (await res.json()) as { data: Ticket[] };
    // Forget tokens of uninstalled apps so we stop sending to them.
    const dead = batch.filter((_, j) => data[j]?.details?.error === "DeviceNotRegistered").map((m) => m.to);
    if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
  }
}

/** Swappable so tests can capture notifications instead of sending them. */
export const pushSender: { send: (messages: PushMessage[]) => Promise<void> } = { send: sendViaExpo };

/** Sends the same notification to every device of the given users. */
export async function notifyUsers(userIds: string[], title: string, body: string, data?: Record<string, string>) {
  if (userIds.length === 0) return;
  const tokens = await prisma.pushToken.findMany({ where: { userId: { in: userIds } } });
  if (tokens.length === 0) return;
  await pushSender.send(tokens.map((t) => ({ to: t.token, title, body, data })));
}
