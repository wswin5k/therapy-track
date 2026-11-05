import React from "react";
import { StyleSheet, Modal, View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_BORDER_RADIUS,
  ERROR_BORDER_WIDTH,
  eStyles,
} from "../../../commonStyles";
import RNDateTimePicker, {
  DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { getTodayDateOnly, toDisplayConcise } from "../../../dateOnlyUtils";

interface AssessmentInputDialogProps {
  children: React.ReactNode;
  title: string;
  onApply: () => void;
  onCancel: () => void;
}

export function ConfigurationDialog({
  children,
  title,
  onApply,
  onCancel,
}: AssessmentInputDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const handleSave = () => {
    onApply();
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modal}
        >
          <View
            style={[
              styles.dialog,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Text
                style={[
                  styles.closeButtonText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                ✕
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {title}
            </Text>
            {children}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={handleSave}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: theme.colors.textOnPrimary },
                ]}
              >
                {t("Save")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

interface DateRangeConfigurationDialogProps {
  onApply: () => void;
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
      <ConfigurationDialog
        title="Date Range"
        onApply={onApply}
        onCancel={onCancel}
      >
        <View style={styles.dateRangeContainer}>
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
            <Text style={[eStyles.pressableText, { color: theme.colors.text }]}>
              {startDate
                ? toDisplayConcise(startDate, i18n.resolvedLanguage)
                : t("First record")}
            </Text>
          </TouchableOpacity>
          <Text style={[eStyles.labelText, {color: theme.colors.text}]}>{t("To")}</Text>
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
            <Text style={[eStyles.pressableText, { color: theme.colors.text }]}>
              {endDate
                ? toDisplayConcise(endDate, i18n.resolvedLanguage)
                : t("Last record")}
            </Text>
          </TouchableOpacity>
        </View>
      </ConfigurationDialog>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    width: "100%",
  },
  modal: {
    width: 400,
    maxWidth: "85%",
    maxHeight: "65%",
  },
  dialog: {
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: 20,
    paddingVertical: 20,
    maxHeight: "100%",
    width: "100%",
    alignItems: "center",
  },
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 14,
    textAlign: "center",
    height: 30,
    textAlignVertical: "center",
    width: "100%",
  },
  marginContainer: {
    height: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    gap: 20,
    height: 44,
  },
  button: {
    flexShrink: 1,
    width: "50%",
    paddingHorizontal: 16,
    borderRadius: DEFAULT_BORDER_RADIUS,
    justifyContent: "center",
    height: 44,
  },
  clearButton: {
    borderWidth: 1.5,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "500",
    width: "100%",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 0,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 6,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "300",
  },
});
