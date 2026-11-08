import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_BORDER_RADIUS,
  ERROR_BORDER_WIDTH,
  eStyles,
  PRESSABLE_PADDING_HORIZONTAL,
  SECONDARY_EDIT_PRESSABLE_HEIGHT,
} from "../../../commonStyles";
import RNDateTimePicker, {
  DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { getTodayDateOnly } from "../../../dateOnlyUtils";
import { Portal } from "@gorhom/portal";
import SystemNavigationBar from "react-native-system-navigation-bar";
import { floatToHexColor } from "../../utils";

const TRANSPARENCY_ALPHA = 0.7;
const TRANSPARENCY_ALPHA_HEX = floatToHexColor(TRANSPARENCY_ALPHA);

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

  React.useEffect(() => {
    SystemNavigationBar.setBarColor(
      theme.colors.card + TRANSPARENCY_ALPHA_HEX,
      {
        bar: "navigation",
        translucent: true,
      },
    );
    return () => {
      SystemNavigationBar.setBarColor(theme.colors.card, {
        bar: "navigation",
        translucent: false,
      });
    };
  }, [theme.colors.card]);

  const handleSave = () => {
    onApply();
  };

  return (
    <Portal>
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
                {t("Apply")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Portal>
  );
}

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
            <Text
              style={[
                eStyles.labelText,
                { paddingHorizontal: 10 },
                { color: theme.colors.text },
              ]}
            >
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
            <Text
              style={[
                eStyles.labelText,
                { paddingHorizontal: 10 },
                { color: theme.colors.text },
              ]}
            >
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
  overlay: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    backgroundColor: "#000000" + TRANSPARENCY_ALPHA_HEX,
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
    borderWidth: 1,
  },
  dateRangeContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    gap: 14,
  },
  dateRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  datePressable: {
    height: SECONDARY_EDIT_PRESSABLE_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: PRESSABLE_PADDING_HORIZONTAL,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    height: 30,
    textAlignVertical: "center",
    width: "100%",
  },
  button: {
    flexShrink: 1,
    width: "50%",
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: 16,
    marginTop: 24,
    justifyContent: "center",
    height: SECONDARY_EDIT_PRESSABLE_HEIGHT,
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
