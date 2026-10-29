import { useState } from "react";
import { Alert, Share, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { errorMessage, formatDate, type Household, type Invite } from "@patireminder/shared";
import { Badge, Button, Card, ErrorText, Field, Row, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function FamilyScreen() {
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const [code, setCode] = useState("");
  const households = useQuery({ queryKey: ["households"], queryFn: api.households });
  const join = useMutation({
    mutationFn: api.joinHousehold,
    onSuccess: (h) => {
      setCode("");
      void queryClient.invalidateQueries();
      Alert.alert("Katıldınız", `${h.name} evindeki hayvanları artık görebilirsiniz.`);
    },
  });

  return (
    <Screen refreshing={households.isFetching} onRefresh={() => households.refetch()}>
      <T muted>Aynı evdeki herkes aynı hayvanları görür ve kim hangi dozu verdi anında öğrenir.</T>
      {households.data?.map((h) => (
        <HouseholdCard key={h.id} household={h} canLeave={households.data.length > 1} />
      ))}

      <Card title="Bir eve katıl">
        <Field
          label="Davet kodu"
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
          placeholder="ABC123"
        />
        <ErrorText>{join.error ? errorMessage(join.error) : null}</ErrorText>
        <Button kind="primary" title="Katıl" onPress={() => join.mutate(code)} loading={join.isPending} />
      </Card>

      <Card>
        <T muted small>
          {user?.name} · {user?.email}
        </T>
        <Button kind="danger" title="Çıkış yap" onPress={signOut} />
      </Card>
    </Screen>
  );
}

function HouseholdCard({ household, canLeave }: { household: Household; canLeave: boolean }) {
  const queryClient = useQueryClient();
  const [invite, setInvite] = useState<Invite | null>(null);
  const createInvite = useMutation({ mutationFn: () => api.createInvite(household.id), onSuccess: setInvite });
  const leave = useMutation({
    mutationFn: () => api.leaveHousehold(household.id),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (err) => Alert.alert("Ayrılamadınız", errorMessage(err)),
  });

  return (
    <Card title={household.name}>
      {household.members.map((m) => (
        <Row key={m.id}>
          <View style={{ flex: 1 }}>
            <T bold>{m.name}</T>
          </View>
          <Badge text={m.role === "OWNER" ? "Ev sahibi" : "Üye"} tone={m.role === "OWNER" ? "ok" : "muted"} />
        </Row>
      ))}
      {invite ? (
        <View style={{ gap: 8 }}>
          <T size={30} bold center>
            {invite.code}
          </T>
          <T small muted center>
            {formatDate(invite.expiresAt)} tarihine kadar geçerli
          </T>
          <Button
            title="Kodu paylaş"
            onPress={() => Share.share({ message: `PatiReminder'da evimize katıl: davet kodu ${invite.code}` })}
          />
        </View>
      ) : (
        <Button title="Aile üyesi davet et" onPress={() => createInvite.mutate()} loading={createInvite.isPending} />
      )}
      {canLeave && (
        <Button
          small
          kind="danger"
          title="Evden ayrıl"
          onPress={() =>
            Alert.alert("Evden ayrıl", `${household.name} evinden ayrılmak istiyor musunuz?`, [
              { text: "Vazgeç", style: "cancel" },
              { text: "Ayrıl", style: "destructive", onPress: () => leave.mutate() },
            ])
          }
        />
      )}
    </Card>
  );
}
