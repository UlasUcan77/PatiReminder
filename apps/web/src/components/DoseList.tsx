import { Fragment, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DoseSlot } from "@patireminder/shared";
import { api } from "../lib/api";
import { alreadyRecordedMessage, dayLabel, errorMessage, formatTime } from "../lib/format";

type Props = { doses: DoseSlot[]; showPet?: boolean; emptyText: string };

export function DoseList({ doses, showPet = false, emptyText }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const record = useMutation({
    mutationFn: (vars: { slot: DoseSlot; status: "GIVEN" | "SKIPPED" }) =>
      api.recordDose(vars.slot.medicationId, { scheduledFor: vars.slot.scheduledFor, status: vars.status }),
    onError: (err) => {
      // Someone else in the family got there first: say who, don't double up.
      setError(alreadyRecordedMessage(err) ?? errorMessage(err));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["doses"] }),
  });

  const undo = useMutation({
    mutationFn: (doseId: string) => api.undoDose(doseId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["doses"] }),
  });

  if (doses.length === 0) return <p className="empty">{emptyText}</p>;

  return (
    <>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {doses.map((slot, i) => {
          const late = slot.status === "PENDING" && new Date(slot.scheduledFor) < new Date();
          const day = dayLabel(slot.scheduledFor);
          const newDay = i === 0 || dayLabel(doses[i - 1].scheduledFor) !== day;
          return (
            <Fragment key={`${slot.medicationId}-${slot.scheduledFor}`}>
              {newDay && <li className="day">{day}</li>}
              <li>
                <span className="time">{formatTime(slot.scheduledFor)}</span>
                <div className="main">
                  <strong>
                    {showPet && `${slot.petName} · `}
                    {slot.medicationName}
                  </strong>
                  <span className="muted small">
                    {slot.dosage}
                    {slot.status !== "PENDING" &&
                      ` · ${slot.givenBy?.name ?? ""} ${slot.status === "GIVEN" ? "verdi" : "atladı"}${
                        slot.givenAt ? `, ${formatTime(slot.givenAt)}` : ""
                      }`}
                  </span>
                </div>
                {slot.status === "PENDING" ? (
                  <div className="actions">
                    {late && <span className="badge danger">Gecikti</span>}
                    <button
                      className="primary"
                      disabled={record.isPending}
                      onClick={() => {
                        setError(null);
                        record.mutate({ slot, status: "GIVEN" });
                      }}
                    >
                      Verdim
                    </button>
                    <button disabled={record.isPending} onClick={() => record.mutate({ slot, status: "SKIPPED" })}>
                      Atla
                    </button>
                  </div>
                ) : (
                  <div className="actions">
                    <span className={`badge ${slot.status === "GIVEN" ? "ok" : "muted"}`}>
                      {slot.status === "GIVEN" ? "Verildi" : "Atlandı"}
                    </span>
                    <button
                      className="link small"
                      disabled={undo.isPending}
                      onClick={() => slot.doseId && undo.mutate(slot.doseId)}
                    >
                      Geri al
                    </button>
                  </div>
                )}
              </li>
            </Fragment>
          );
        })}
      </ul>
    </>
  );
}
