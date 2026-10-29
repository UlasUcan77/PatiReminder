import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@patireminder/shared";
import { Button, Card, Chips, DateField, ErrorText, Field, Screen } from "@/components/ui";
import { api } from "@/lib/api";

const INTERVALS = [
  ["24", "Her gün"],
  ["12", "Günde 2 kez"],
  ["8", "Günde 3 kez"],
  ["48", "2 günde bir"],
  ["168", "Haftada bir"],
  ["720", "30 günde bir"],
] as const;

function nextFullHour() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

export default function AddMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [interval, setInterval] = useState<(typeof INTERVALS)[number][0]>("24");
  const [startsAt, setStartsAt] = useState<Date | null>(nextFullHour);
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const create = useMutation({
    mutationFn: () =>
      api.createMedication(id, { name, dosage, intervalHours: Number(interval), startsAt: startsAt!, endsAt, notes }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      router.back();
    },
  });

  return (
    <Screen>
      <Card>
        <Field label="İlaç" value={name} onChangeText={setName} placeholder="Örn. Antibiyotik" autoFocus />
        <Field label="Doz" value={dosage} onChangeText={setDosage} placeholder="Örn. 1 tablet" />
        <Chips label="Sıklık" options={INTERVALS} value={interval} onChange={setInterval} />
        <DateField label="İlk doz" mode="datetime" value={startsAt} onChange={setStartsAt} />
        <DateField label="Bitiş (isteğe bağlı)" mode="datetime" value={endsAt} onChange={setEndsAt} optional />
        <Field label="Not" value={notes} onChangeText={setNotes} placeholder="Örn. Yemekle birlikte" />
        <ErrorText>{create.error ? errorMessage(create.error) : null}</ErrorText>
        <Button
          kind="primary"
          title="İlaç ekle"
          disabled={!name.trim() || !dosage.trim() || !startsAt}
          loading={create.isPending}
          onPress={() => create.mutate()}
        />
      </Card>
    </Screen>
  );
}
