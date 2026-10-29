import { useState } from "react";
import { Alert, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  describeInterval,
  dueLabel,
  errorMessage,
  formatDate,
  SPECIES_EMOJI,
  SPECIES_LABEL,
  startOfDay,
} from "@patireminder/shared";
import { DoseList } from "@/components/DoseList";
import { Badge, Button, Card, Empty, Row, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";
import { shareHealthRecord } from "@/lib/health-record";

function confirmDelete(what: string, onConfirm: () => void) {
  Alert.alert("Silinsin mi?", `${what} silinecek. Bu geri alınamaz.`, [
    { text: "Vazgeç", style: "cancel" },
    { text: "Sil", style: "destructive", onPress: onConfirm },
  ]);
}

export default function PetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries();
  const today = startOfDay();
  const [sharing, setSharing] = useState(false);

  const pet = useQuery({ queryKey: ["pets", id], queryFn: () => api.pet(id) });
  const doses = useQuery({
    queryKey: ["doses", id, today.toISOString()],
    queryFn: () => api.doses(today, addDays(today, 2), id),
  });
  const meds = useQuery({ queryKey: ["medications", id], queryFn: () => api.medications(id) });
  const vaccinations = useQuery({ queryKey: ["vaccinations", id], queryFn: () => api.vaccinations(id) });
  const weights = useQuery({ queryKey: ["weights", id], queryFn: () => api.weights(id) });
  const visits = useQuery({ queryKey: ["visits", id], queryFn: () => api.visits(id) });

  const toggleMed = useMutation({
    mutationFn: (m: { id: string; active: boolean }) => api.updateMedication(m.id, { active: m.active }),
    onSuccess: invalidate,
  });
  const deleteMed = useMutation({ mutationFn: api.deleteMedication, onSuccess: invalidate });
  const deleteVaccination = useMutation({ mutationFn: api.deleteVaccination, onSuccess: invalidate });
  const deleteWeight = useMutation({ mutationFn: api.deleteWeight, onSuccess: invalidate });
  const deleteVisit = useMutation({ mutationFn: api.deleteVisit, onSuccess: invalidate });
  const deletePet = useMutation({
    mutationFn: () => api.deletePet(id),
    onSuccess: () => {
      void invalidate();
      router.back();
    },
  });

  if (!pet.data) return <Screen>{pet.isError ? <Empty>Hayvan bulunamadı.</Empty> : <Empty>Yükleniyor…</Empty>}</Screen>;
  const p = pet.data;
  const lastWeight = weights.data?.[weights.data.length - 1];

  return (
    <Screen refreshing={pet.isFetching} onRefresh={invalidate}>
      <Stack.Screen options={{ title: p.name }} />
      <View style={{ gap: 2 }}>
        <T size={26} bold>
          {SPECIES_EMOJI[p.species]} {p.name}
        </T>
        <T muted>
          {[p.breed ?? SPECIES_LABEL[p.species], p.birthDate && `Doğum: ${formatDate(p.birthDate)}`]
            .filter(Boolean)
            .join(" · ")}
        </T>
      </View>
      <Button
        title="Sağlık karnesini paylaş (PDF)"
        loading={sharing}
        onPress={async () => {
          setSharing(true);
          try {
            await shareHealthRecord(id);
          } catch (err) {
            Alert.alert("Karne oluşturulamadı", errorMessage(err));
          } finally {
            setSharing(false);
          }
        }}
      />

      <Card title="Dozlar" right={<Button small title="+ İlaç" onPress={() => router.push(`/pet/${id}/medication`)} />}>
        <DoseList doses={doses.data ?? []} emptyText="Planlanmış doz yok." />
      </Card>

      <Card title="İlaçlar">
        {meds.data?.length ? (
          meds.data.map((m) => (
            <Row key={m.id}>
              <View style={{ flex: 1, gap: 2 }}>
                <T bold>{m.name}</T>
                <T small muted>
                  {m.dosage} · {describeInterval(m.intervalHours)}
                  {m.endsAt ? ` · ${formatDate(m.endsAt)} tarihine kadar` : ""}
                </T>
              </View>
              <View style={{ gap: 6 }}>
                <Button
                  small
                  title={m.active ? "Durdur" : "Devam"}
                  onPress={() => toggleMed.mutate({ id: m.id, active: !m.active })}
                />
                <Button
                  small
                  kind="danger"
                  title="Sil"
                  onPress={() => confirmDelete(`${m.name} ve doz geçmişi`, () => deleteMed.mutate(m.id))}
                />
              </View>
            </Row>
          ))
        ) : (
          <Empty>Kayıtlı ilaç yok.</Empty>
        )}
      </Card>

      <Card title="Aşılar" right={<Button small title="+ Aşı" onPress={() => router.push(`/pet/${id}/vaccination`)} />}>
        {vaccinations.data?.length ? (
          vaccinations.data.map((v) => {
            const due = v.dueAt ? dueLabel(v.dueAt) : null;
            return (
              <Row key={v.id}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T bold>{v.name}</T>
                  <T small muted>
                    {v.administeredAt ? `Yapıldı: ${formatDate(v.administeredAt)}` : "Henüz yapılmadı"}
                    {v.dueAt ? ` · Sonraki: ${formatDate(v.dueAt)}` : ""}
                  </T>
                  {due && <Badge text={due.text} tone={due.tone} />}
                </View>
                <View style={{ gap: 6 }}>
                  {v.dueAt && (
                    <Button
                      small
                      kind="primary"
                      title="Yapıldı"
                      onPress={() =>
                        router.push({ pathname: `/pet/${id}/vaccination`, params: { replaces: v.id, name: v.name } })
                      }
                    />
                  )}
                  <Button
                    small
                    kind="danger"
                    title="Sil"
                    onPress={() => confirmDelete(`${v.name} kaydı`, () => deleteVaccination.mutate(v.id))}
                  />
                </View>
              </Row>
            );
          })
        ) : (
          <Empty>Kayıtlı aşı yok.</Empty>
        )}
      </Card>

      <Card title="Kilo" right={<Button small title="+ Kilo" onPress={() => router.push(`/pet/${id}/weight`)} />}>
        {lastWeight ? (
          <>
            <T size={28} bold>
              {lastWeight.kg} kg
            </T>
            <T small muted>
              Son ölçüm: {formatDate(lastWeight.measuredAt)}
            </T>
            {[...(weights.data ?? [])].reverse().map((w) => (
              <Row key={w.id}>
                <View style={{ flex: 1 }}>
                  <T>{w.kg} kg</T>
                </View>
                <T small muted>
                  {formatDate(w.measuredAt)}
                </T>
                <Button small kind="danger" title="Sil" onPress={() => deleteWeight.mutate(w.id)} />
              </Row>
            ))}
          </>
        ) : (
          <Empty>Henüz ölçüm yok.</Empty>
        )}
      </Card>

      <Card
        title="Veteriner"
        right={<Button small title="+ Ziyaret" onPress={() => router.push(`/pet/${id}/visit`)} />}
      >
        {visits.data?.length ? (
          visits.data.map((v) => (
            <Row key={v.id}>
              <View style={{ flex: 1, gap: 2 }}>
                <T bold>{v.reason ?? "Ziyaret"}</T>
                <T small muted>
                  {[formatDate(v.visitedAt), v.clinic].filter(Boolean).join(" · ")}
                </T>
                {v.notes && <T small>{v.notes}</T>}
              </View>
              <Button small kind="danger" title="Sil" onPress={() => deleteVisit.mutate(v.id)} />
            </Row>
          ))
        ) : (
          <Empty>Kayıtlı ziyaret yok.</Empty>
        )}
      </Card>

      <Button
        kind="danger"
        title={`${p.name} kaydını sil`}
        onPress={() => confirmDelete(`${p.name} ve tüm kayıtları`, () => deletePet.mutate())}
      />
    </Screen>
  );
}
