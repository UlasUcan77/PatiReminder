import { Fragment, useState } from "react";
import { View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { alreadyRecordedMessage, dayLabel, errorMessage, formatTime, type DoseSlot } from "@patireminder/shared";
import { api } from "../lib/api";
import { Badge, Button, Empty, ErrorText, Row, T } from "./ui";

export function DoseList({ doses, showPet, emptyText }: { doses: DoseSlot[]; showPet?: boolean; emptyText: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["doses"] });

  const record = useMutation({
    mutationFn: (v: { slot: DoseSlot; status: "GIVEN" | "SKIPPED" }) =>
      api.recordDose(v.slot.medicationId, { scheduledFor: v.slot.scheduledFor, status: v.status }),
    // A family member got there first: say who, don't record it twice.
    onError: (err) => setError(alreadyRecordedMessage(err) ?? errorMessage(err)),
    onSettled: refresh,
  });
  const undo = useMutation({ mutationFn: api.undoDose, onSettled: refresh });

  if (doses.length === 0) return <Empty>{emptyText}</Empty>;

  return (
    <View>
      <ErrorText>{error}</ErrorText>
      {doses.map((slot, i) => {
        const day = dayLabel(slot.scheduledFor);
        const newDay = i === 0 || dayLabel(doses[i - 1].scheduledFor) !== day;
        const late = slot.status === "PENDING" && new Date(slot.scheduledFor) < new Date();
        return (
          <Fragment key={`${slot.medicationId}-${slot.scheduledFor}`}>
            {newDay && (
              <View style={{ paddingTop: i === 0 ? 0 : 12, paddingBottom: 4 }}>
                <T small muted bold>
                  {day.toLocaleUpperCase("tr-TR")}
                </T>
              </View>
            )}
            <Row>
              <View style={{ width: 48 }}>
                <T bold>{formatTime(slot.scheduledFor)}</T>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T bold>
                  {showPet ? `${slot.petName} · ` : ""}
                  {slot.medicationName}
                </T>
                <T small muted>
                  {slot.dosage}
                  {slot.status !== "PENDING" &&
                    ` · ${slot.givenBy?.name ?? ""} ${slot.status === "GIVEN" ? "verdi" : "atladı"}${
                      slot.givenAt ? `, ${formatTime(slot.givenAt)}` : ""
                    }`}
                </T>
                {late && <Badge text="Gecikti" tone="danger" />}
              </View>
              {slot.status === "PENDING" ? (
                <View style={{ gap: 6 }}>
                  <Button
                    small
                    kind="primary"
                    title="Verdim"
                    disabled={record.isPending}
                    onPress={() => {
                      setError(null);
                      record.mutate({ slot, status: "GIVEN" });
                    }}
                  />
                  <Button
                    small
                    title="Atla"
                    disabled={record.isPending}
                    onPress={() => record.mutate({ slot, status: "SKIPPED" })}
                  />
                </View>
              ) : (
                <View style={{ gap: 6, alignItems: "flex-end" }}>
                  <Badge
                    text={slot.status === "GIVEN" ? "Verildi" : "Atlandı"}
                    tone={slot.status === "GIVEN" ? "ok" : "muted"}
                  />
                  <Button
                    small
                    title="Geri al"
                    disabled={undo.isPending}
                    onPress={() => slot.doseId && undo.mutate(slot.doseId)}
                  />
                </View>
              )}
            </Row>
          </Fragment>
        );
      })}
    </View>
  );
}
