import { EventEmitter } from "node:events";
import type { HouseholdChange } from "@patireminder/shared";
import type { TokenUser } from "./token";

// Routes publish changes here; the Socket.IO layer forwards them to clients.
// Keeping the two apart lets the routes run in tests without a socket server.
export const householdEvents = new EventEmitter();

export function publishChange(
  householdId: string,
  entity: HouseholdChange["entity"],
  actor: TokenUser,
  petId: string | null = null,
) {
  const change: HouseholdChange = { householdId, entity, petId, actor: { id: actor.id, name: actor.name } };
  householdEvents.emit("change", change);
}
