import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { createNavigationContainerRef } from "@react-navigation/native";
import { DrawerTabsParamList, RootStackParamList } from "../navigation";
import { normalizeToDateOnly, serializeDateOnly } from "../dateOnlyUtils";

function getNotificationIdentifier(groupId: number): string {
  return `group-reminder-${groupId}`;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    if (existingStatus === Notifications.PermissionStatus.GRANTED) {
      return true;
    }

    const { status: newStatus } = await Notifications.requestPermissionsAsync();

    if (newStatus !== Notifications.PermissionStatus.GRANTED) {
      return false;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        "therapy-track-group-reminders",
        {
          name: "Therapy track group reminders",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#1D86E2",
          sound: "default",
        },
      );
    }
    return true;
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
}

export async function scheduleGroupNotification(group: {
  reminderTime: string;
  dbId: number;
  name: string;
}): Promise<string | null> {
  if (!group.reminderTime) {
    return null;
  }

  const [hourStr, minuteStr] = group.reminderTime.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isNaN(hour) || isNaN(minute)) {
    console.error("Invalid time format:", group.reminderTime);
    return null;
  }

  const identifier = getNotificationIdentifier(group.dbId);

  await cancelGroupNotification(group.dbId);

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: `${group.name} medications are due`,
      data: { groupId: group.dbId },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return identifier;
}

export async function cancelGroupNotification(groupId: number): Promise<void> {
  const identifier = getNotificationIdentifier(groupId);
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

// click on notification logic

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type HomeParams = DrawerTabsParamList["Home"];

let pendingHomeParams: HomeParams | null = null;

export function openHomeFromNotification(params: HomeParams) {
  // Save the params if navigation isn't ready yet.
  if (!navigationRef.isReady()) {
    pendingHomeParams = params;
    return;
  }

  navigationRef.navigate("DrawerTabs", {
    screen: "Home",
    params: params,
  });
}

export function flushPendingNavigation() {
  if (!navigationRef.isReady() || !pendingHomeParams) {
    return;
  }

  const params = pendingHomeParams;
  pendingHomeParams = null;
  navigationRef.navigate("DrawerTabs", {
    screen: "Home",
    params: params,
  });
}

let lastHandledNotification: {
  identifier: string | null;
  timestamp: number;
} | null = null;

function handleNotificationResponse(
  response: Notifications.NotificationResponse,
) {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return;
  }

  const request = response.notification.request;
  // Prevent the same notification being processed twice
  // by the live listener and cold-start lookup.
  const isLastNotificationRecent = (): boolean => {
    if (lastHandledNotification === null) {
      return false;
    }
    const nowTimestamp = new Date().getTime();
    return Math.abs(lastHandledNotification?.timestamp - nowTimestamp) < 30_000;
  };
  if (
    request.identifier === lastHandledNotification?.identifier &&
    isLastNotificationRecent()
  ) {
    return;
  }

  lastHandledNotification = {
    identifier: request.identifier,
    timestamp: new Date().getTime(),
  };

  const data = request.content.data;
  if (!(data && "groupId" in data && typeof data.groupId === "number")) {
    return;
  }

  const notificationDate = normalizeToDateOnly(
    new Date(response.notification.date),
  );

  openHomeFromNotification({
    selectedDate: serializeDateOnly(notificationDate),
    groupIdFromNotification: data.groupId,
  });
}

export function setupNotificationHandlers() {
  // Covers a notification tap that launched the app
  // from a terminated state.
  const response = Notifications.getLastNotificationResponse();
  if (response) {
    handleNotificationResponse(response);
  }

  const subscription = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse,
  );

  return () => subscription.remove();
}
