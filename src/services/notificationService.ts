import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
  TimestampTrigger,
  EventType,
  EventDetail,
} from "@notifee/react-native";
import { Platform } from "react-native";

const CHANNEL_ID = "therapy-track-group-reminders";

function getNotificationIdentifier(groupId: number): string {
  return `group-reminder-${groupId}`;
}

async function createNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: "Therapy Track Group Reminders",
      importance: AndroidImportance.HIGH,
      vibration: true,
      vibrationPattern: [300, 500],
      lights: true,
      lightColor: "#72b4bc",
      sound: "default",
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  await createNotificationChannel();

  const settings = await notifee.getNotificationSettings();

  if (settings.authorizationStatus === AuthorizationStatus.AUTHORIZED) {
    return true;
  }

  const newSettings = await notifee.requestPermission();

  return newSettings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
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

  await createNotificationChannel();

  const now = new Date();
  const scheduledDate = new Date();
  scheduledDate.setHours(hour, minute, 0, 0);

  if (scheduledDate.getTime() <= now.getTime()) {
    scheduledDate.setDate(scheduledDate.getDate() + 1);
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: scheduledDate.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
    alarmManager: false,
  };

  await notifee.createTriggerNotification(
    {
      id: identifier,
      title: "Therapy Track reminder",
      body: `${group.name} medications are due`,
      data: { groupId: String(group.dbId) },
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: "default",
        },
        sound: "default",
        vibrationPattern: [300, 500],
        lightUpScreen: true,
      },
      ios: {
        sound: "default",
        categoryId: CHANNEL_ID,
      },
    },
    trigger,
  );

  return identifier;
}

export async function cancelGroupNotification(groupId: number): Promise<void> {
  const identifier = getNotificationIdentifier(groupId);
  await notifee.cancelNotification(identifier);
}
