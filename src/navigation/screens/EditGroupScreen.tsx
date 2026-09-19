import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import RNDateTimePicker, {
  DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import {
  useRoute,
  useNavigation,
  useTheme,
  useFocusEffect,
} from "@react-navigation/native";
import type { RootStackParamList } from "../index";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Group } from "../../models/Frequency";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import {
  dbGetGroups,
  dbInsertGroup,
  dbUpdateGroup,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import {
  scheduleGroupNotification,
  cancelGroupNotification,
  requestNotificationPermissions,
} from "../../services/notificationService";
import { isEqualLowerCase } from "../utils";
import { NAME_MAX_LENGTH, VALID_NAME } from "../../validationConstants";
import { ERROR_BORDER_WIDTH } from "../commonConsts";
import { eStyles, EDIT_PRESSABLE_HEIGHT } from "../../commonStyles";

type EditGroupScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditGroupScreen"
>;

const DEFAULT_GROUP_COLOR = "#808080";

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

  // when modyfing a group we don't want to check for duplicate names
  const [initialName, setInitialName] = React.useState<string | null>(null);
  const [groupsNames, setGroupsNames] = React.useState<string[]>([]);

  const loadData = React.useCallback(async () => {
    const groups = await dbGetGroups(db);
    setGroupsNames(groups.map((g) => g.name.toLowerCase()));
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      const params = route.params as { group?: Group };
      const groupInit = params?.group;

      if (groupInit) {
        setIsEditMode(true);
        setGroup(groupInit);
        setName(groupInit.name);
        setInitialName(groupInit.name);
        setIsReminderOn(groupInit.isReminderOn);
        setReminderTime(groupInit.reminderTime);
      } else {
        setIsEditMode(false);
        setGroup(null);
        setName("");
        setIsReminderOn(false);
        setReminderTime(null);
      }
      loadData();
    }, [loadData, route.params]),
  );

  const handleSelectTime = () => {
    setIsTimePickerOpened(true);
  };

  const handleTimeChange = (_: DateTimePickerChangeEvent, newDate?: Date) => {
    setIsTimePickerOpened(false);
    if (newDate) {
      const timeStr = formatTimeToString(newDate);
      setReminderTime(timeStr);
      if (reminderTimeError) setReminderTimeError(false);
    }
  };
  const handleTimeDismiss = () => {
    setIsTimePickerOpened(false);
  };

  const validate = (
    nameIsOkWhenNotChanged: boolean = false,
  ): {
    name: string;
    color: string;
    isReminderOn: boolean;
    reminderTime: string | null;
  } | null => {
    let isValid = true;

    let nameValidated = name.trim();
    const nameSameAsInitial = isEqualLowerCase(nameValidated, initialName);
    if (
      nameValidated &&
      ((nameValidated.length < NAME_MAX_LENGTH &&
        !groupsNames.includes(nameValidated.toLowerCase()) &&
        VALID_NAME.test(nameValidated)) ||
        (nameIsOkWhenNotChanged && nameSameAsInitial))
    ) {
      setNameError(false);
    } else {
      setNameError(true);
      isValid = false;
    }

    if (isReminderOn && !reminderTime) {
      setReminderTimeError(true);
      isValid = false;
    } else {
      setReminderTimeError(false);
    }

    if (isValid) {
      return {
        name: nameValidated,
        color: group?.color ?? DEFAULT_GROUP_COLOR,
        isReminderOn,
        reminderTime: isReminderOn ? reminderTime : null,
      };
    } else {
      return null;
    }
  };

  const handleSave = async () => {
    const groupData = validate(Boolean(isEditMode && group));

    if (!groupData) {
      return;
    }

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
      <ScrollView
        style={eStyles.editMainScrollContainer}
        contentContainerStyle={eStyles.editMainScrollContentContainer}
      >
        <View style={[styles.rowContainer]}>
          <TextInput
            placeholder="Group Name"
            placeholderTextColor={theme.colors.textTertiary}
            style={[
              eStyles.pressableTextInput,
              {
                borderColor: theme.colors.border,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              },
              nameError
                ? {
                    borderColor: theme.colors.error,
                    borderWidth: ERROR_BORDER_WIDTH,
                  }
                : {},
            ]}
            onChangeText={(text: string) => {
              setName(text);
              if (nameError) setNameError(false);
            }}
            value={name}
          />
        </View>
        <View style={styles.rowContainer}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
            {t("Enable reminder")}
          </Text>

          <Switch
            value={isReminderOn}
            onValueChange={handleReminderToggle}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.surface}
            style={styles.switch}
          />
        </View>

        {isReminderOn && (
          <View style={[styles.rowContainer]}>
            <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
              {t("Reminder time")}
            </Text>
            <TouchableOpacity
              onPress={handleSelectTime}
              style={[
                eStyles.timePressable,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                reminderTimeError && {
                  borderColor: theme.colors.error,
                  borderWidth: ERROR_BORDER_WIDTH,
                },
              ]}
            >
              <Text
                style={[
                  eStyles.pressableText,
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
          </View>
        )}

        {isTimePickerOpened && (
          <RNDateTimePicker
            mode="time"
            value={getTimePickerValue()}
            onValueChange={handleTimeChange}
            onDismiss={handleTimeDismiss}
          />
        )}
      </ScrollView>

      <View style={[eStyles.footer, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleSave}
          style={[
            eStyles.nextButton,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text style={eStyles.nextButtonText}>{t("Save")}</Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  switch: {
    transform: [{ scaleX: 1.4 }, { scaleY: 1.4 }],
    height: EDIT_PRESSABLE_HEIGHT,
  },
});
