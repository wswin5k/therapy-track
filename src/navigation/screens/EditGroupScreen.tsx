import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import RNDateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  useRoute,
  useNavigation,
  useTheme,
  useFocusEffect,
} from "@react-navigation/native";
import type { RootStackParamList } from "../index";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Group } from "../../models/Schedule";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { dbInsertGroup, dbUpdateGroup } from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import {
  scheduleGroupNotification,
  cancelGroupNotification,
  requestNotificationPermissions,
} from "../../services/notificationService";

type EditGroupScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditGroupScreen"
>;

const DEFAULT_GROUP_COLOR = "#808080"; // Gray

function formatTimeToString(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseTimeString(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes);
  return date;
}

export function EditGroupScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const db = useSQLiteContext();
  const navigation = useNavigation<EditGroupScreenNavigationProp>();
  const theme = useTheme();

  const [name, setName] = React.useState("");
  const [isReminderOn, setIsReminderOn] = React.useState(false);
  const [reminderTime, setReminderTime] = React.useState<string | null>(null);
  const [isTimePickerOpened, setIsTimePickerOpened] = React.useState(false);

  const [nameError, setNameError] = React.useState(false);
  const [reminderTimeError, setReminderTimeError] = React.useState(false);

  const [group, setGroup] = React.useState<Group | null>(null);
  const [isEditMode, setIsEditMode] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const params = route.params as { group?: Group };
      const groupInit = params?.group;

      if (groupInit) {
        setIsEditMode(true);
        setGroup(groupInit);
        setName(groupInit.name);
        setIsReminderOn(groupInit.isReminderOn);
        setReminderTime(groupInit.reminderTime);
      } else {
        setIsEditMode(false);
        setGroup(null);
        setName("");
        setIsReminderOn(false);
        setReminderTime(null);
      }
    }, [route.params]),
  );

  const handleSelectTime = () => {
    setIsTimePickerOpened(true);
  };

  const handleTimeChange = (event: DateTimePickerEvent, newDate?: Date) => {
    setIsTimePickerOpened(false);
    if (event.type === "dismissed") {
    } else if (newDate) {
      const timeStr = formatTimeToString(newDate);
      setReminderTime(timeStr);
      if (reminderTimeError) setReminderTimeError(false);
    }
  };

  const validate = (): boolean => {
    let isValid = true;

    if (!name.trim()) {
      setNameError(true);
      isValid = false;
    } else {
      setNameError(false);
    }

    if (isReminderOn && !reminderTime) {
      setReminderTimeError(true);
      isValid = false;
    } else {
      setReminderTimeError(false);
    }

    return isValid;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    const groupData = {
      name: name.trim(),
      color: group?.color ?? DEFAULT_GROUP_COLOR,
      isReminderOn,
      reminderTime: isReminderOn ? reminderTime : null,
    };

    let groupId: number;

    if (isEditMode && group) {
      await dbUpdateGroup(db, {
        ...groupData,
        dbId: group.dbId,
      });
      groupId = group.dbId;
    } else {
      groupId = await dbInsertGroup(db, groupData);
    }

    if (isReminderOn && reminderTime) {
      await scheduleGroupNotification({
        name: groupData.name,
        dbId: groupId,
        reminderTime: reminderTime,
      });
    } else {
      await cancelGroupNotification(groupId);
    }

    navigation.goBack();
  };

  const handleReminderToggle = async (value: boolean) => {
    if (value) {
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        setIsReminderOn(true);
      }
    } else {
      setIsReminderOn(false);
      setReminderTimeError(false);
    }
  };

  const getTimePickerValue = (): Date => {
    if (reminderTime) {
      return parseTimeString(reminderTime);
    }
    return new Date();
  };

  return (
    <DefaultMainContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("Group Name")}
        </Text>
        <TextInput
          placeholder={t("e.g. After lunch")}
          placeholderTextColor={theme.colors.textTertiary}
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
            nameError
              ? { borderColor: theme.colors.error, borderWidth: 1 }
              : {},
          ]}
          onChangeText={(text: string) => {
            setName(text);
            if (nameError) setNameError(false);
          }}
          value={name}
        />
        {nameError && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {t("Group name is required")}
          </Text>
        )}

        <View style={styles.switchRow}>
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t("Enable Reminder")}
          </Text>
          <Switch
            value={isReminderOn}
            onValueChange={handleReminderToggle}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor="#fff"
          />
        </View>

        {isReminderOn && (
          <>
            <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
              {t("Reminder Time")}
            </Text>
            <TouchableOpacity
              onPress={handleSelectTime}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                reminderTimeError && {
                  borderColor: theme.colors.error,
                  borderWidth: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.inputText,
                  {
                    color: reminderTime
                      ? theme.colors.text
                      : theme.colors.textTertiary,
                  },
                ]}
              >
                {reminderTime ? reminderTime : t("Select time")}
              </Text>
            </TouchableOpacity>
            {reminderTimeError && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {t("Reminder time is required when reminder is enabled")}
              </Text>
            )}
          </>
        )}

        {isTimePickerOpened && (
          <RNDateTimePicker
            mode="time"
            value={getTimePickerValue()}
            onChange={handleTimeChange}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.saveButtonText}>{t("Save")}</Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
  },
  headerLabel: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 60,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    justifyContent: "center",
  },
  inputText: {
    fontSize: 16,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    zIndex: 1,
  },
  saveButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
});
