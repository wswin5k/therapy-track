import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { DISABLED_OPACITY, ERROR_BORDER_WIDTH } from "../commonConsts";
import { useTranslation } from "react-i18next";
import SmallNumberStepper from "../../components/SmallNumberStepper";
import { mixColors } from "../utils";
import { eStyles } from "../../commonStyles";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Frequency, IntervalUnit } from "../../models/Frequency";

export const TEXT_MAX_LENGTH = 200;

export enum CustomFrequencyType {
  XTimesADay = "XTimesASay",
  EveryXDays = "EveryXDays",
  EveryXWeeks = "EveryXWeeks",
  SpecificDaysOfTheWeek = "SpecificDaysOfTheWeek",
}

export function EditCustomFrequencyScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();

  const [frequencyType, setFrequencyType] = React.useState<CustomFrequencyType>(
    CustomFrequencyType.XTimesADay,
  );
  const [timesADay, setTimesADay] = React.useState<number>(4);
  const [daysNumber, setDaysNumber] = React.useState<number>(3);
  const [weeksNumber, setWeeksNumber] = React.useState<number>(3);
  const [selectedWeekdays, setSelectedWeekdays] = React.useState<number[]>([]);

  const [selectedWeekdaysError, setSelectedWeekdaysError] =
    React.useState<boolean>(false);
  const weekdays = React.useMemo(() => {
    const language = i18n.resolvedLanguage || i18n.language;
    const localeObj = new Intl.Locale(language);

    // first day of week 1 = Mon,weekdaysSelectionContainer ..., 7 = Sun
    const firstDayOfWeek =
      (localeObj.getWeekInfo?.()?.firstDay ?? localeObj.firstDay ?? 7) % 7;

    // Sunday, Jan 4, 2026
    const baseDate = new Date(2026, 0, 4);
    const formatterNarrow = new Intl.DateTimeFormat(language, {
      weekday: "narrow",
    });
    const formatterShort = new Intl.DateTimeFormat(language, {
      weekday: "short",
    });

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(baseDate);
      const dayIndex = (firstDayOfWeek + i) % 7;
      date.setDate(baseDate.getDate() + dayIndex);
      return {
        nameNarrow: formatterNarrow.format(date),
        nameShort: formatterShort.format(date),
        index: dayIndex,
      };
    });
  }, [i18n.resolvedLanguage, i18n.language]);

  const handleApply = () => {
    if (
      selectedWeekdays.length === 0 &&
      frequencyType === CustomFrequencyType.SpecificDaysOfTheWeek
    ) {
      setSelectedWeekdaysError(true);
      return;
    } else {
      setSelectedWeekdaysError(false);
    }

    let customFrequency = null;
    switch (frequencyType) {
      case CustomFrequencyType.XTimesADay:
        customFrequency = {
          freq: new Frequency(IntervalUnit.day, 1, timesADay),
          doesurementOffsets: Array.from({ length: timesADay }, () => 0),
          label: `${timesADay} times a day`,
        };
        break;
      case CustomFrequencyType.EveryXDays:
        customFrequency = {
          freq: new Frequency(IntervalUnit.day, daysNumber, 1),
          doesurementOffsets: [0],
          label: `every ${daysNumber} ${t("day", { count: daysNumber })}`,
        };
        break;
      case CustomFrequencyType.EveryXWeeks:
        customFrequency = {
          freq: new Frequency(IntervalUnit.week, weeksNumber, 1),
          doesurementOffsets: [0],
          label: `every ${daysNumber} ${t("week", { count: weeksNumber })}`,
        };
        break;
      case CustomFrequencyType.SpecificDaysOfTheWeek:
        customFrequency = {
          freq: new Frequency(IntervalUnit.week, 1, selectedWeekdays.length),
          doesurementOffsets: selectedWeekdays,
          label: `every ${selectedWeekdays.map((idx) => weekdays.find((el) => el.index === idx)?.nameShort).join(", ")}`,
        };
        break;
    }
    const state = navigation.getState();
    if (state && customFrequency) {
      const previousRoute = state.routes[state.index - 1];
      if (previousRoute) {
        navigation.navigate(
          previousRoute.name,
          {
            customFrequency: customFrequency,
          },
          { merge: true, pop: true },
        );
      }
    }
  };

  const handleFrequencyTypeChange = (type: CustomFrequencyType) => {
    setFrequencyType(type);
  };

  const handleWeekdayPress = (index: number) => {
    setSelectedWeekdays((current) => {
      if (current.includes(index)) {
        return current.filter((el) => el !== index);
      } else {
        return [...current, index];
      }
    });
    setSelectedWeekdaysError(false);
  };

  const renderRadioButton = (type: CustomFrequencyType) => {
    return (
      <Ionicons
        name={
          frequencyType === type
            ? "radio-button-on-outline"
            : "radio-button-off"
        }
        style={[styles.radioButton, { color: theme.colors.textSecondary }]}
        onPress={() => handleFrequencyTypeChange(type)}
      />
    );
  };

  return (
    <DefaultMainContainer>
      <ScrollView
        style={eStyles.editMainScrollContainer}
        contentContainerStyle={eStyles.editMainScrollContentContainer}
      >
        <View style={[styles.frequencyItemContainer]}>
          {renderRadioButton(CustomFrequencyType.XTimesADay)}
          <View
            style={[
              styles.frequencyItemLabelContainer,
              frequencyType !== CustomFrequencyType.XTimesADay && {
                opacity: DISABLED_OPACITY,
              },
            ]}
          >
            <View style={styles.xTimesStepperContainer}>
              <SmallNumberStepper
                defaultValue={timesADay}
                onChange={(value) => setTimesADay(value)}
                fractionalStepsBelowZero={false}
                min={1}
                max={24}
                disabled={frequencyType !== CustomFrequencyType.XTimesADay}
              />
            </View>
            <Text style={[styles.labelText, { color: theme.colors.text }]}>
              {t("times a day")}
            </Text>
          </View>
        </View>

        <View style={[styles.frequencyItemContainer]}>
          {renderRadioButton(CustomFrequencyType.EveryXDays)}
          <View
            style={[
              styles.frequencyItemLabelContainer,
              frequencyType !== CustomFrequencyType.EveryXDays && {
                opacity: DISABLED_OPACITY,
              },
            ]}
          >
            <Text style={[styles.labelText, { color: theme.colors.text }]}>
              {t("every")}
            </Text>
            <View style={styles.everyXStepperContainer}>
              <SmallNumberStepper
                defaultValue={daysNumber}
                onChange={(value) => setDaysNumber(value)}
                fractionalStepsBelowZero={false}
                min={1}
                max={1000}
                disabled={frequencyType !== CustomFrequencyType.EveryXDays}
              />
            </View>
            <Text style={[styles.labelText, { color: theme.colors.text }]}>
              {t("day", { count: daysNumber })}
            </Text>
          </View>
        </View>
        <View style={[styles.frequencyItemContainer]}>
          {renderRadioButton(CustomFrequencyType.EveryXWeeks)}
          <View
            style={[
              styles.frequencyItemLabelContainer,
              frequencyType !== CustomFrequencyType.EveryXWeeks && {
                opacity: DISABLED_OPACITY,
              },
            ]}
          >
            <Text style={[styles.labelText, { color: theme.colors.text }]}>
              {t("every")}
            </Text>
            <View style={styles.everyXStepperContainer}>
              <SmallNumberStepper
                defaultValue={weeksNumber}
                onChange={(value) => setWeeksNumber(value)}
                fractionalStepsBelowZero={false}
                min={1}
                max={1000}
                disabled={frequencyType !== CustomFrequencyType.EveryXWeeks}
              />
            </View>
            <Text style={[styles.labelText, { color: theme.colors.text }]}>
              {t("week", { count: weeksNumber })}
            </Text>
          </View>
        </View>
        <View style={[styles.frequencyItemDoubleContainer]}>
          <View style={[styles.weekdaysItemContainer]}>
            {renderRadioButton(CustomFrequencyType.SpecificDaysOfTheWeek)}
            <Text
              style={[
                styles.labelText,
                { color: theme.colors.text },
                frequencyType !== CustomFrequencyType.SpecificDaysOfTheWeek && {
                  opacity: DISABLED_OPACITY,
                },
              ]}
            >
              {t("specific days of the week")}
            </Text>
          </View>
          <View
            style={[
              styles.weekdaysSelectionContainer,
              frequencyType !== CustomFrequencyType.SpecificDaysOfTheWeek && {
                opacity: DISABLED_OPACITY,
              },
            ]}
          >
            {weekdays.map((weekday) => (
              <TouchableOpacity
                style={[
                  styles.dayOfWeekPressable,
                  {
                    backgroundColor: selectedWeekdays.includes(weekday.index)
                      ? mixColors(theme.colors.surface, theme.colors.primary)
                      : theme.colors.surface,
                    borderColor: theme.colors.primary,
                  },
                  selectedWeekdaysError &&
                    frequencyType ===
                      CustomFrequencyType.SpecificDaysOfTheWeek && {
                      borderColor: theme.colors.error,
                      borderWidth: ERROR_BORDER_WIDTH,
                    },
                ]}
                key={weekday.index}
                onPress={() => handleWeekdayPress(weekday.index)}
                disabled={
                  frequencyType !== CustomFrequencyType.SpecificDaysOfTheWeek
                }
              >
                <Text style={[styles.labelText, { color: theme.colors.text }]}>
                  {weekday.nameNarrow}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[eStyles.footer, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleApply}
          style={[
            eStyles.nextButton,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            style={[
              eStyles.nextButtonText,
              { color: theme.colors.textOnPrimary },
            ]}
          >
            {t("Apply")}
          </Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    marginBottom: 28,
    alignItems: "center",
  },
  rowTimesADayContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  timesADayStepperContainer: {
    maxWidth: "50%",
    width: 130,
  },
  rowFrequencyHeader: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "center",
  },
  frequencyItemContainer: {
    flexDirection: "row",
    marginBottom: 28,
    alignItems: "center",
  },
  frequencyItemLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  xTimesStepperContainer: {
    width: 130,
    marginRight: 8,
  },
  everyXStepperContainer: {
    width: 130,
    marginHorizontal: 8,
  },
  frequencyItemDoubleContainer: {
    flexDirection: "column",
    marginBottom: 28,
    alignItems: "center",
  },
  weekdaysItemContainer: {
    alignSelf: "flex-start",
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "center",
  },
  weekdaysSelectionContainer: {
    flex: 1,
    flexDirection: "row",
    width: "100%",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
  },
  labelText: {
    fontSize: 17,
  },
  dayOfWeekPressable: {
    height: 60,
    minWidth: 34,
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  radioButton: {
    fontSize: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
});
