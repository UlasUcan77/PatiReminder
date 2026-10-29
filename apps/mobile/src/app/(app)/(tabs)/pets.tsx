import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SPECIES_EMOJI, SPECIES_LABEL } from "@patireminder/shared";
import { Button, Card, Empty, Row, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";

export default function PetsScreen() {
  const pets = useQuery({ queryKey: ["pets"], queryFn: api.pets });

  return (
    <Screen refreshing={pets.isFetching} onRefresh={() => pets.refetch()}>
      <Card>
        {pets.data?.length ? (
          pets.data.map((pet) => (
            <Row key={pet.id} onPress={() => router.push(`/pet/${pet.id}`)}>
              <T size={28}>{SPECIES_EMOJI[pet.species]}</T>
              <View style={{ flex: 1 }}>
                <T bold>{pet.name}</T>
                <T small muted>
                  {pet.breed ?? SPECIES_LABEL[pet.species]}
                </T>
              </View>
              <T muted>›</T>
            </Row>
          ))
        ) : (
          <Empty>{pets.isLoading ? "Yükleniyor…" : "Henüz hayvan eklemediniz."}</Empty>
        )}
      </Card>
      <Button kind="primary" title="+ Hayvan ekle" onPress={() => router.push("/add-pet")} />
    </Screen>
  );
}
