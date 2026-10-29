import { useState } from "react";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { errorMessage, SPECIES_LABEL, speciesValues, type Species } from "@patireminder/shared";
import { Button, Card, Chips, DateField, ErrorText, Field, Screen } from "@/components/ui";
import { api } from "@/lib/api";

const SPECIES_OPTIONS = speciesValues.map((s) => [s, SPECIES_LABEL[s]] as const);

export default function AddPetScreen() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("DOG");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const create = useMutation({
    mutationFn: api.createPet,
    onSuccess: (pet) => {
      void queryClient.invalidateQueries({ queryKey: ["pets"] });
      router.replace(`/pet/${pet.id}`);
    },
  });

  return (
    <Screen>
      <Card>
        <Field label="Adı" value={name} onChangeText={setName} autoFocus />
        <Chips label="Tür" options={SPECIES_OPTIONS} value={species} onChange={setSpecies} />
        <Field label="Irk" value={breed} onChangeText={setBreed} />
        <DateField label="Doğum tarihi" value={birthDate} onChange={setBirthDate} optional />
        <ErrorText>{create.error ? errorMessage(create.error) : null}</ErrorText>
        <Button
          kind="primary"
          title="Kaydet"
          disabled={!name.trim()}
          loading={create.isPending}
          onPress={() => create.mutate({ name, species, breed, birthDate })}
        />
      </Card>
    </Screen>
  );
}
