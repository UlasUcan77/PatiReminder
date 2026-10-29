import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { registerForPushNotifications } from "@/lib/notifications";
import { useHouseholdSync } from "@/lib/realtime";

// Everything inside (app) needs a signed-in user.
export default function AppLayout() {
  const { user, token, loading } = useAuth();
  const notice = useHouseholdSync(token, user?.id);

  useEffect(() => {
    if (user) void registerForPushNotifications();
  }, [user]);

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerBackTitle: "Geri" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pet/[id]/index" options={{ title: "" }} />
        <Stack.Screen name="add-pet" options={{ title: "Hayvan ekle", presentation: "modal" }} />
        <Stack.Screen name="pet/[id]/medication" options={{ title: "İlaç ekle", presentation: "modal" }} />
        <Stack.Screen name="pet/[id]/vaccination" options={{ title: "Aşı", presentation: "modal" }} />
        <Stack.Screen name="pet/[id]/weight" options={{ title: "Kilo ekle", presentation: "modal" }} />
        <Stack.Screen name="pet/[id]/visit" options={{ title: "Veteriner ziyareti", presentation: "modal" }} />
      </Stack>
      {notice && (
        <View pointerEvents="none" style={styles.toastWrap}>
          <Text style={styles.toast}>{notice}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: "absolute", left: 16, right: 16, bottom: 96, alignItems: "center" },
  toast: {
    backgroundColor: "#1f2328",
    color: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 14,
  },
});
