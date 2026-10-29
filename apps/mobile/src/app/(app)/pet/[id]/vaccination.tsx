import { useState } from "react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@patireminder/shared";
import { Button, Card, DateField, ErrorText, Field, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";

// Adds a vaccination. Opened from "Yapıldı" it records the shot that
// fulfils an existing due date (`replaces`), which then stops showing as due.
export default function VaccinationScreen() {
  const { id, replaces, name: replacedName } = useLocalSearchParams<{ id: string; replaces?: string; name?: string }>();
  const queryClient = useQueryClient();
  const [name, setName] = useState(replacedName ?? "");
  const [administeredAt, setAdministeredAt] = useState<Date | null>(replaces ? new Date() : null);
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [vetName, setVetName] = useState("");
  const [notes, setNotes] = useState("");
  const create = useMutation({
    mutationFn: () =>
      api.createVaccination(id, { name, administeredAt, dueAt, vetName, notes, replacesId: replaces || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      router.back();
    },
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: replaces ? `${replacedName} yapıldı` : "Aşı ekle" }} />
      <T small muted>
        Tarihleri veterinerinizin söylediği gibi girin. Uygulama aşı takvimi önermez.
      </T>
      <Card>
        <Field label="Aşı" value={name} onChangeText={setName} placeholder="Örn. Kuduz" />
        <DateField label="Yapıldığı tarih" value={administeredAt} onChange={setAdministeredAt} optional />
        <DateField label="Sonraki tarih" value={dueAt} onChange={setDueAt} optional />
        <Field label="Veteriner" value={vetName} onChangeText={setVetName} />
        <Field label="Not" value={notes} onChangeText={setNotes} />
        <ErrorText>{create.error ? errorMessage(create.error) : null}</ErrorText>
        <Button
          kind="primary"
          title="Kaydet"
          disabled={!name.trim() || (!administeredAt && !dueAt)}
          loading={create.isPending}
          onPress={() => create.mutate()}
        />
      </Card>
    </Screen>
  );
}
