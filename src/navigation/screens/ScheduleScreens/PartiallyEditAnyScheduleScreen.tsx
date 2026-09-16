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
  DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { MedicineSchedule } from "../../../models/MedicineSchedule";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useTheme,
} from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import {
  dbGetAssessmentSchedule,
  dbGetMedicineSchedule,
  dbUpdateAssessmentSchedule,
  dbUpdateMedicineSchedule,
} from "../../../models/dbAccess";
import { DefaultMainContainer } from "../../../components/DefaultMainContainer";
import { AssessmentSchedule } from "../../../models/AssessmentSchedule";
import { gstyles, PRESSABLE_HEIGHT } from "../../../commonStyles";
import { getTodayDateOnly, toDisplayConcise } from "../../../dateOnlyUtils";
import { ERROR_BORDER_WIDTH } from "../../commonConsts";

export default function PartiallyEditAnyScheduleScreen() {
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

  const [schedule, setSchedule] = React.useState<
    MedicineSchedule | AssessmentSchedule | null
  >(null);

  useFocusEffect(
    React.useCallback(() => {
      const setData = async () => {
        const params = route.params as {
          scheduleId: number;
          scheduleType: "assessment" | "medicine";
        };
        const schedule =
          params.scheduleType === "medicine"
            ? await dbGetMedicineSchedule(db, params.scheduleId)
            : await dbGetAssessmentSchedule(db, params.scheduleId);

        setSchedule(schedule);
        if (schedule) {
          setStartDate(schedule.startDate);
          setEndDate(schedule.endDate);
        }
      };
      setData();
    }, [db, route.params]),
  );

  const handleSelectStartDate = () => {
    setIsStartDatePickerOpened(true);
  };
  const handleStartDateChange = (_: DateTimePickerChangeEvent, date?: Date) => {
    if (date) {
      setStartDate(date);
      setStartDateError(false);
    }
    setIsStartDatePickerOpened(false);
  };
  const handleStartDateDismiss = () => {
    setIsStartDatePickerOpened(false);
  };
  const handleStartDateClear = () => {
    setStartDate(null);
    setIsStartDatePickerOpened(false);
  };

  const handleSelectEndDate = () => {
    setIsEndDatePickerOpened(true);
  };
  const handleEndDateChange = (_: DateTimePickerChangeEvent, date?: Date) => {
    if (date) {
      setEndDate(date);
    }
    setIsEndDatePickerOpened(false);
  };
  const handeEndDateDismiss = () => {
    setIsEndDatePickerOpened(false);
  };
  const handeEndDateClear = () => {
    setEndDate(null);
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
        if (schedule instanceof MedicineSchedule) {
          await dbUpdateMedicineSchedule(db, {
            dbId: schedule.dbId,
            startDate,
            endDate,
          });
        } else {
          //schedule instanceof AssessmentSchdule
          await dbUpdateAssessmentSchedule(db, {
            dbId: schedule.dbId,
            startDate,
            endDate,
          });
        }
      }
    } else {
      throw Error("Reference schedule has not been set.");
    }

    navigation.goBack();
  };

  return (
    <DefaultMainContainer>
      <ScrollView
        style={gstyles.editScrollContainer}
        contentContainerStyle={gstyles.editScrollContentContainer}
      >
        <View style={styles.rowContainer}>
          <Text style={[gstyles.labelText, { color: theme.colors.text }]}>
            {t("Start date")}
          </Text>
          <TouchableOpacity
            onPress={handleSelectStartDate}
            style={[
              gstyles.datePressable,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              startDateError && {
                borderColor: theme.colors.error,
                borderWidth: ERROR_BORDER_WIDTH,
              },
            ]}
          >
            <Text style={[gstyles.pressableText, { color: theme.colors.text }]}>
              {startDate
                ? toDisplayConcise(startDate, i18n.resolvedLanguage)
                : t("Select date")}
            </Text>
          </TouchableOpacity>
        </View>
        {isStartDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={startDate ?? getTodayDateOnly()}
            onValueChange={handleStartDateChange}
            onDismiss={handleStartDateDismiss}
            neutralButton={{ label: "Clear", textColor: "" }}
            onNeutralButtonPress={handleStartDateClear}
          />
        ) : (
          ""
        )}

        <View style={styles.rowContainer}>
          <Text style={[gstyles.labelText, { color: theme.colors.text }]}>
            {t("End date")}
          </Text>
          <TouchableOpacity
            onPress={handleSelectEndDate}
            style={[
              gstyles.datePressable,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[gstyles.pressableText, { color: theme.colors.text }]}>
              {endDate
                ? toDisplayConcise(endDate, i18n.resolvedLanguage)
                : t("Infinitely")}
            </Text>
          </TouchableOpacity>
        </View>
        {isEndDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={endDate ?? getTodayDateOnly()}
            minimumDate={startDate ? startDate : undefined}
            onValueChange={handleEndDateChange}
            onDismiss={handeEndDateDismiss}
            neutralButton={{ label: "Clear", textColor: "" }}
            onNeutralButtonPress={handeEndDateClear}
          />
        ) : (
          ""
        )}
      </ScrollView>

      <View
        style={[
          gstyles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleSave}
          style={[
            gstyles.nextButton,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text style={gstyles.nextButtonText}>{t("Save")}</Text>
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
    height: PRESSABLE_HEIGHT,
    marginBottom: 20,
  },
});
