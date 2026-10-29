import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@patireminder/shared";
import { Button, Card, DateField, ErrorText, Field, Screen } from "@/components/ui";
import { api } from "@/lib/api";

export default function AddVisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [visitedAt, setVisitedAt] = useState<Date | null>(new Date());
  const [clinic, setClinic] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const add = useMutation({
    mutationFn: () => api.addVisit(id, { visitedAt: visitedAt!, clinic, reason, notes }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      router.back();
    },
  });

  return (
    <Screen>
      <Card>
        <DateField label="Tarih" value={visitedAt} onChange={setVisitedAt} />
        <Field label="Klinik" value={clinic} onChangeText={setClinic} />
        <Field label="Sebep" value={reason} onChangeText={setReason} placeholder="Örn. Yıllık kontrol" />
        <Field label="Notlar" value={notes} onChangeText={setNotes} multiline style={{ minHeight: 80 }} />
        <ErrorText>{add.error ? errorMessage(add.error) : null}</ErrorText>
        <Button
          kind="primary"
          title="Kaydet"
          disabled={!visitedAt}
          loading={add.isPending}
          onPress={() => add.mutate()}
        />
      </Card>
    </Screen>
  );
}
