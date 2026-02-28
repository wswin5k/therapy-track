import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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
      title: "Therapy Track reminder",
      body: `${group.name} medications are due`,
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
