import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  useColorScheme,
  BackHandler,
} from "react-native";
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
import { Portal } from "@gorhom/portal";
import { floatToHexColor } from "../../utils";
import { applyNavigationBarTheme } from "../../../App";

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
  const colorScheme = useColorScheme();

  React.useEffect(() => {
    applyNavigationBarTheme(theme.colors.card, "dark", true);
    return () => {
      applyNavigationBarTheme(theme.colors.card, colorScheme, false);
    };
  }, [theme.colors.card, colorScheme]);

  React.useEffect(() => {
    const backAction = () => {
      onCancel();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [onCancel]);

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
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
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

            <ScrollView persistentScrollbar={true} style={styles.dialogContent}>
              {children}
            </ScrollView>
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

export class DisplayOptions {
  constructor(
    public expandAllRows: boolean,
    public showDaysWithoutEntries: boolean,
  ) {}
}

interface DisplayOptionsConfigurationDialogProps {
  initialDisplayOptions: DisplayOptions;
  onApply: (displayOptions: DisplayOptions) => void;
  onCancel: () => void;
}

export function DisplayOptionsConfigurationDialog({
  initialDisplayOptions,
  onApply,
  onCancel,
}: DisplayOptionsConfigurationDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [displayOptions, setDisplayOptions] = React.useState<DisplayOptions>(
    initialDisplayOptions,
  );

  const handleUpdateDisplayOptions = (updates: Partial<DisplayOptions>) => {
    setDisplayOptions((value) => {
      return { ...value, ...updates };
    });
  };
  const handleApply = () => {
    onApply(displayOptions);
  };

  return (
    <>
      <ConfigurationDialog
        title="Display Options"
        onApply={handleApply}
        onCancel={onCancel}
      >
        <View style={styles.optionsRowContainer}>
          <Text style={[styles.labelText, { color: theme.colors.text }]}>
            {t("Expand all rows")}
          </Text>
          <Switch
            value={displayOptions.expandAllRows}
            onValueChange={(value: boolean) =>
              handleUpdateDisplayOptions({ expandAllRows: value })
            }
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.surface}
            style={eStyles.switchPressable}
          />
        </View>
        <View style={styles.optionsRowContainer}>
          <Text style={[styles.labelText, { color: theme.colors.text }]}>
            {t("Show days without entries")}
          </Text>
          <Switch
            value={displayOptions.showDaysWithoutEntries}
            onValueChange={(value: boolean) =>
              handleUpdateDisplayOptions({
                showDaysWithoutEntries: value,
              })
            }
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.surface}
            style={eStyles.switchPressable}
          />
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
    maxHeight: "85%",
  },
  dialog: {
    borderRadius: DEFAULT_BORDER_RADIUS,
    maxHeight: "100%",
    width: "100%",
    alignItems: "center",
    borderWidth: 2,
  },
  dialogContent: {
    width: "100%",
    alignSelf: "center",
  },
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
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 20,
    textAlign: "center",
    textAlignVertical: "center",
    width: "100%",
  },
  button: {
    minWidth: "35%",
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: 16,
    marginVertical: 20,
    justifyContent: "center",
    alignItems: "center",
    height: SECONDARY_PRESSABLE_HEIGHT,
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
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 6,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "300",
  },
  optionsRowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
});
