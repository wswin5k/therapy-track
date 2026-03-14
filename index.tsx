import "@expo/metro-runtime"; // Necessary for Fast Refresh on Web
import { registerRootComponent } from "expo";
import "./i18n";
import { App } from "./src/App";
import notifee, { EventDetail, EventType } from "@notifee/react-native";

notifee.onBackgroundEvent(
  async ({ type, detail }: { type: EventType; detail: EventDetail }) => {
    const { notification } = detail;

    if (!notification || !notification.id) {
      return Promise.resolve();
    }

    if (type === EventType.ACTION_PRESS) {
      return await notifee.cancelNotification(notification.id);
    }
  },
);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
