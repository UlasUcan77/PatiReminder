import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Asks for notification permission and sends this device's Expo push token to
 * the API, so reminders reach it even when the app is closed. Push needs a
 * physical device and an EAS project id (run `eas init`); without them the
 * app still works, it just doesn't receive reminders.
 */
export async function registerForPushNotifications(): Promise<"registered" | "denied" | "unavailable"> {
  if (Platform.OS === "web" || !Device.isDevice) return "unavailable";

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Hatırlatmalar",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const status = current.granted ? current.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return "denied";

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("No EAS project id: run `eas init` to enable push notifications.");
    return "unavailable";
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
    return "registered";
  } catch (err) {
    console.warn("Could not register for push notifications", err);
    return "unavailable";
  }
}
