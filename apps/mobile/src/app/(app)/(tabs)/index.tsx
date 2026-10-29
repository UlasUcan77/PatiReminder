import { View } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, dueLabel, formatDate, startOfDay } from "@patireminder/shared";
import { DoseList } from "@/components/DoseList";
import { Badge, Card, Empty, Row, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";

export default function TodayScreen() {
  const queryClient = useQueryClient();
  const today = startOfDay();
  const doses = useQuery({
    queryKey: ["doses", "today", today.toISOString()],
    queryFn: () => api.doses(today, addDays(today, 1)),
  });
  const upcoming = useQuery({ queryKey: ["vaccinations", "upcoming"], queryFn: () => api.upcomingVaccinations(60) });
  const pending = doses.data?.filter((d) => d.status === "PENDING").length ?? 0;

  return (
    <Screen refreshing={doses.isFetching} onRefresh={() => queryClient.invalidateQueries()}>
      <View style={{ gap: 2 }}>
        <T size={22} bold>
          {today.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
        </T>
        {doses.data && <T muted>{pending ? `${pending} doz bekliyor` : "Bekleyen doz yok"}</T>}
      </View>

      <Card title="İlaçlar">
        <DoseList doses={doses.data ?? []} showPet emptyText="Bugün verilecek ilaç yok." />
      </Card>

      <Card title="Yaklaşan aşılar">
        {upcoming.data?.length ? (
          upcoming.data.map((v) => {
            const due = dueLabel(v.dueAt!);
            return (
              <Row key={v.id} onPress={() => router.push(`/pet/${v.petId}`)}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T bold>
                    {v.petName} · {v.name}
                  </T>
                  <T small muted>
                    {formatDate(v.dueAt)}
                  </T>
                </View>
                <Badge text={due.text} tone={due.tone} />
              </Row>
            );
          })
        ) : (
          <Empty>Önümüzdeki 60 günde aşı yok.</Empty>
        )}
      </Card>
    </Screen>
  );
}
