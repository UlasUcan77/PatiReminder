import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { HOUSEHOLD_CHANGED, type HouseholdChange } from "@patireminder/shared";
import { API_URL } from "./api";

const MESSAGES: Record<HouseholdChange["entity"], string> = {
  dose: "bir dozu işaretledi",
  medication: "ilaçları güncelledi",
  vaccination: "aşıları güncelledi",
  pet: "bir hayvanı güncelledi",
  weight: "kilo ekledi",
  visit: "veteriner ziyareti ekledi",
  household: "aile bilgilerini güncelledi",
};

/** Refreshes on-screen data when someone else in the household changes it. */
export function useHouseholdSync(token: string | null, myId: string | undefined) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token }, transports: ["websocket"] });
    socket.on(HOUSEHOLD_CHANGED, (change: HouseholdChange) => {
      void queryClient.invalidateQueries();
      if (change.actor.id !== myId) setNotice(`${change.actor.name} ${MESSAGES[change.entity]}`);
    });
    return () => {
      socket.disconnect();
    };
  }, [token, myId, queryClient]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  return notice;
}
