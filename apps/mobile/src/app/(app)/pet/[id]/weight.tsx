import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@patireminder/shared";
import { Button, Card, DateField, ErrorText, Field, Screen } from "@/components/ui";
import { api } from "@/lib/api";

export default function AddWeightScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [kg, setKg] = useState("");
  const [measuredAt, setMeasuredAt] = useState<Date | null>(new Date());
  const value = Number(kg.replace(",", "."));
  const add = useMutation({
    mutationFn: () => api.addWeight(id, { kg: value, measuredAt: measuredAt! }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      router.back();
    },
  });

  return (
    <Screen>
      <Card>
        <Field
          label="Kilo (kg)"
          value={kg}
          onChangeText={setKg}
          keyboardType="decimal-pad"
          placeholder="12,5"
          autoFocus
        />
        <DateField label="Tarih" value={measuredAt} onChange={setMeasuredAt} />
        <ErrorText>{add.error ? errorMessage(add.error) : null}</ErrorText>
        <Button
          kind="primary"
          title="Kaydet"
          disabled={!(value > 0) || !measuredAt}
          loading={add.isPending}
          onPress={() => add.mutate()}
        />
      </Card>
    </Screen>
  );
}
