import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import RNDateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Schedule } from "../../models/Schedule";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useTheme,
} from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import {
  dbGetScheduleWithMedicine,
  dbUpdateSchedule,
} from "../../models/dbAccess";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";

export default function PartiallyEditScheduleScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const db = useSQLiteContext();

  const [isStartDatePickerOpened, setIsStartDatePickerOpened] =
    React.useState<boolean>(false);
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [startDateError, setStartDateError] = React.useState<boolean>(false);
  const [isEndDatePickerOpened, setIsEndDatePickerOpened] =
    React.useState<boolean>(false);
  const [endDate, setEndDate] = React.useState<Date | null>(null);

  const [schedule, setSchedule] = React.useState<Schedule | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const setData = async () => {
        const params = route.params as {
          scheduleId: number;
        };
        const schedule = await dbGetScheduleWithMedicine(db, params.scheduleId);

        setSchedule(schedule);
        if (schedule) {
          setStartDate(schedule.startDate);
          setEndDate(schedule.endDate);
        }
      };
      setData();
    }, []),
  );

  const handleSelectStartDate = () => {
    setIsStartDatePickerOpened(true);
  };

  const handleStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      setStartDate(null);
    } else if (date) {
      setStartDate(date);
      setStartDateError(false);
    }
    setIsStartDatePickerOpened(false);
  };

  const handleSelectEndDate = () => {
    setIsEndDatePickerOpened(true);
  };

  const handleEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      setEndDate(null);
    } else if (date) {
      setEndDate(date);
    }
    setIsEndDatePickerOpened(false);
  };

  const handleSave = async () => {
    setStartDateError(false);
    if (!startDate) {
      setStartDateError(true);
      return;
    }
    if (endDate && startDate > endDate) {
      setStartDateError(true);
      return;
    }
    if (schedule) {
      if (startDate !== schedule.startDate || endDate !== schedule.endDate) {
        await dbUpdateSchedule(db, {
          dbId: schedule.dbId,
          startDate,
          endDate,
        });
      }
    } else {
      throw Error("Reference schedule has not been set.");
    }
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "HomeTabs",
          state: {
            routes: [{ name: "SchedulesList" }],
          },
        },
      ],
    });
  };

  return (
    <DefaultMainContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("Start date")}
        </Text>
        <TouchableOpacity
          onPress={handleSelectStartDate}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
            startDateError && {
              borderColor: theme.colors.error,
              borderWidth: 2,
            },
          ]}
        >
          <Text style={[styles.inputText, { color: theme.colors.text }]}>
            {startDate ? startDate.toDateString() : "Select date"}
          </Text>
        </TouchableOpacity>
        {isStartDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={new Date()}
            onChange={handleStartDateChange}
          />
        ) : (
          ""
        )}

        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("End date")}
        </Text>
        <TouchableOpacity
          onPress={handleSelectEndDate}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.inputText, { color: theme.colors.text }]}>
            {endDate ? endDate.toDateString() : "Select date"}
          </Text>
        </TouchableOpacity>
        {isEndDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={new Date()}
            minimumDate={startDate ? startDate : undefined}
            onChange={handleEndDateChange}
          />
        ) : (
          ""
        )}
        {/* 
        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("That's 2 weeks")}
        </Text> */}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    marginBottom: 10,
  },
  inputText: {
    fontSize: 16,
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
});
