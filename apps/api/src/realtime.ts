import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { HOUSEHOLD_CHANGED, type HouseholdChange } from "@patireminder/shared";
import { config } from "./config";
import { prisma } from "./db";
import { householdEvents } from "./lib/events";
import { verifyToken } from "./lib/token";

// Each socket joins one room per household its user belongs to. When data in
// a household changes, everyone in that room is told to refresh it.
export function attachRealtime(server: HttpServer) {
  const io = new Server(server, { cors: { origin: config.CORS_ORIGIN.split(",") } });

  io.use((socket, next) => {
    const user = verifyToken(String(socket.handshake.auth?.token ?? ""));
    if (!user) return next(new Error("Unauthorized"));
    socket.data.user = user;
    next();
  });

  io.on("connection", async (socket) => {
    const userId: string = socket.data.user.id;
    socket.join(`user:${userId}`);
    const memberships = await prisma.householdMember.findMany({ where: { userId } });
    for (const m of memberships) socket.join(`household:${m.householdId}`);
  });

  householdEvents.on("change", async (change: HouseholdChange) => {
    if (change.entity === "household") {
      // Membership changed: move the actor's sockets in or out of the room.
      const member = await prisma.householdMember.findUnique({
        where: { userId_householdId: { userId: change.actor.id, householdId: change.householdId } },
      });
      const sockets = io.in(`user:${change.actor.id}`);
      if (member) sockets.socketsJoin(`household:${change.householdId}`);
      else sockets.socketsLeave(`household:${change.householdId}`);
    }
    io.to(`household:${change.householdId}`).emit(HOUSEHOLD_CHANGED, change);
  });

  return io;
}
