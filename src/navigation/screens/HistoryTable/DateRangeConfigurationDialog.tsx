import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_BORDER_RADIUS,
  ERROR_BORDER_WIDTH,
  eStyles,
  PRESSABLE_PADDING_HORIZONTAL,
  SECONDARY_PRESSABLE_HEIGHT,
} from "../../../commonStyles";
import RNDateTimePicker, {
  DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { getTodayDateOnly } from "../../../dateOnlyUtils";
import { ConfigurationDialog } from "./ConfigurationDialog";

export class DateRange {
  constructor(
    public startDate: Date | null,
    public endDate: Date | null,
  ) {}
}

interface DateRangeConfigurationDialogProps {
  onApply: (dateRange: DateRange) => void;
  onCancel: () => void;
}

export function DateRangeConfigurationDialog({
  onApply,
  onCancel,
}: DateRangeConfigurationDialogProps) {
  const { i18n, t } = useTranslation();
  const theme = useTheme();

  const [isStartDatePickerOpened, setIsStartDatePickerOpened] =
    React.useState<boolean>(false);
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [startDateError, setStartDateError] = React.useState<boolean>(false);
  const [isEndDatePickerOpened, setIsEndDatePickerOpened] =
    React.useState<boolean>(false);
  const [endDate, setEndDate] = React.useState<Date | null>(null);

  const formatDate = (date: Date, language: string | undefined): string => {
    return new Intl.DateTimeFormat(language, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

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

  const handleApply = () => {
    onApply(new DateRange(startDate, endDate));
  };

  return (
    <>
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
      {isEndDatePickerOpened ? (
        <RNDateTimePicker
          mode="date"
          value={endDate ?? startDate ?? getTodayDateOnly()}
          minimumDate={startDate ? startDate : undefined}
          onValueChange={handleEndDateChange}
          onDismiss={handeEndDateDismiss}
          neutralButton={{ label: "Clear", textColor: "" }}
          onNeutralButtonPress={handeEndDateClear}
        />
      ) : (
        ""
      )}
      <ConfigurationDialog
        title="Date Range"
        onApply={handleApply}
        onCancel={onCancel}
      >
        <View style={styles.dateRangeContainer}>
          <View style={styles.dateRow}>
            <Text style={[styles.labelText, { color: theme.colors.text }]}>
              {t("Start date")}
            </Text>
            <TouchableOpacity
              onPress={handleSelectStartDate}
              style={[
                eStyles.datePressable,
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
              <Text
                style={[eStyles.pressableText, { color: theme.colors.text }]}
              >
                {startDate
                  ? formatDate(startDate, i18n.resolvedLanguage)
                  : t("First record")}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateRow}>
            <Text style={[styles.labelText, { color: theme.colors.text }]}>
              {t("End date")}
            </Text>
            <TouchableOpacity
              onPress={handleSelectEndDate}
              style={[
                eStyles.datePressable,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[eStyles.pressableText, { color: theme.colors.text }]}
              >
                {endDate
                  ? formatDate(endDate, i18n.resolvedLanguage)
                  : t("Last record")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ConfigurationDialog>
    </>
  );
}
const styles = StyleSheet.create({
  labelText: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "400",
    paddingHorizontal: 0,
  },
  dateRangeContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    gap: 14,
  },
  dateRow: {
    width: "100%",
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  datePressable: {
    height: SECONDARY_PRESSABLE_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: PRESSABLE_PADDING_HORIZONTAL,
    justifyContent: "center",
    alignItems: "flex-end",
  },
});
