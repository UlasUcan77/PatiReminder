import { Text } from "react-native";
import { Tabs } from "expo-router";
import { useColors } from "@/components/theme";

const icon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
  };

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        headerStyle: { backgroundColor: c.surface },
        headerTitleStyle: { color: c.text },
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Bugün", tabBarIcon: icon("💊") }} />
      <Tabs.Screen name="pets" options={{ title: "Hayvanlar", tabBarIcon: icon("🐾") }} />
      <Tabs.Screen name="family" options={{ title: "Aile", tabBarIcon: icon("👨‍👩‍👧") }} />
    </Tabs>
  );
}
