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
import SmallNumberStepper from "../../../components/SmallNumberStepper";
import { Group } from "../../../models/Frequency";
import { Frequency, IntervalUnit } from "../../../models/Frequency";
import {
  FrequencySelection,
  frequencySelectionMap,
  frequencySelectionToPickerLabels,
  frequencyToDisplayForm,
  getWeekdays,
} from "./common";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useTheme,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MedicineParam, RootStackParamList } from "../..";
import { useSQLiteContext } from "expo-sqlite";
import {
  dbGetGroups,
  dbInsertMedicineSchedule,
  dbInsertMedicineScheduleWithMedicine,
} from "../../../models/dbAccess";
import { DefaultMainContainer } from "../../../components/DefaultMainContainer";
import { DropdownPicker } from "../../../components/DropdownPicker";
import { baseUnitToDoseHeader } from "../../enumMappings";
import { ModalPicker } from "../../../components/ModalPicker";
import { eStyles, EDIT_PRESSABLE_HEIGHT } from "../../../commonStyles";
import { ERROR_BORDER_WIDTH } from "../../../commonStyles";
import {
  getTodayDateOnly,
  getWeekday,
  toDisplayConcise,
} from "../../../dateOnlyUtils";
import { assingDefaultGroups } from "./common";

type EditMedicineScheduleScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditMedicineScheduleScreen"
>;

export default function EditMedicineScheduleScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<EditMedicineScheduleScreenNavigationProp>();
  const route = useRoute();
  const db = useSQLiteContext();

  const [freqSelection, setFreqSelection] =
    React.useState<FrequencySelection | null>(null);
  const freqRef = React.useRef<Frequency | null>(null);
  const [freqSelectionError, setFreqSelectionError] =
    React.useState<boolean>(false);
  const [customFreqLabel, setCustomFreqLabel] = React.useState<string | null>(
    null,
  );

  const [dosageIdxToAmount, setDosageIdxToAmount] = React.useState<number[]>([
    1,
  ]);
  const [dosageIdxToGroupId, setDosageIdxToGroupId] = React.useState<
    (number | null)[]
  >([null]);
  // offsets for the measurement
  // more than one values are used only
  // with "specific weekdays" custom frequency
  // the measurements will be cartesian-multiplied with it
  const offsetsMultiplier = React.useRef<number[] | null>([0]);

  const [isStartDatePickerOpened, setIsStartDatePickerOpened] =
    React.useState<boolean>(false);
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [startDateError, setStartDateError] = React.useState<boolean>(false);
  const [isEndDatePickerOpened, setIsEndDatePickerOpened] =
    React.useState<boolean>(false);
  const [endDate, setEndDate] = React.useState<Date | null>(null);

  const [medicine, setMedicine] = React.useState<MedicineParam | null>(null);

  const [groupsMap, setGroupsMap] = React.useState<Map<number, Group>>(
    new Map(),
  );
  const dosageIdxToDefaultGroupId = React.useRef<Map<number, number>>(
    new Map(),
  );
  const groupsIds = React.useMemo(
    () => [-1, ...Array.from(groupsMap.values()).map((g) => g.dbId)],
    [groupsMap],
  );

  const weekdays = React.useMemo(() => {
    return getWeekdays(i18n.resolvedLanguage || i18n.language);
  }, [i18n.resolvedLanguage, i18n.language]);

  const frequencySelectionToPickerLabelsExt =
    (specialCustomLabel: boolean) => (key: FrequencySelection | null) => {
      if (specialCustomLabel && key === FrequencySelection.Custom) {
        return customFreqLabel;
      }
      return key ? frequencySelectionToPickerLabels(key) : null;
    };
  const resetMeasurementGroups = (count: number) => {
    setDosageIdxToGroupId(
      Array.from(
        { length: count },
        (_, idx) => dosageIdxToDefaultGroupId.current.get(idx) ?? null,
      ),
    );
    setDosageIdxToAmount(Array.from({ length: count }, () => 1));
  };

  const loadData = React.useCallback(async () => {
    const groups = await dbGetGroups(db);
    const newGroupsMap = new Map();
    groups.forEach((g) => newGroupsMap.set(g.dbId, g));
    setGroupsMap(newGroupsMap);
    dosageIdxToDefaultGroupId.current = assingDefaultGroups(groups);
    resetMeasurementGroups(dosageIdxToGroupId.length);

    const params = route.params as {
      medicine: MedicineParam;
      scheduleId?: number;
      customFrequency?: {
        freq: Frequency;
        offsetsMultiplier: number[];
      };
    };
    setMedicine(params.medicine);

    if (params.customFrequency) {
      freqRef.current = params.customFrequency?.freq ?? null;
      const freq = params.customFrequency.freq;
      offsetsMultiplier.current = params.customFrequency.offsetsMultiplier;
      const newNMeasurements =
        freq.intervalUnit === IntervalUnit.week && freq.intervalLength === 1
          ? 1
          : freq.numberOfDosages;
      resetMeasurementGroups(newNMeasurements);

      const frequencyLabel = frequencyToDisplayForm(
        t,
        weekdays,
        freq,
        params.customFrequency.offsetsMultiplier,
      );
      setCustomFreqLabel("Custom: " + frequencyLabel);
      setFreqSelectionError(false);
      navigation.setParams({ customFrequency: undefined });
    }
  }, [db, navigation, route.params, t, weekdays, dosageIdxToGroupId.length]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleFrequencyPicker = (item: FrequencySelection | null) => {
    setCustomFreqLabel(null);

    if (!item) {
      freqRef.current = null;
      setFreqSelection(null);
      resetMeasurementGroups(1);
      return;
    }

    setFreqSelection(item);

    if (item === FrequencySelection.Custom) {
      freqRef.current = null;
      resetMeasurementGroups(1);
      navigation.navigate("EditCustomFrequencyScreen");
      return;
    }

    setFreqSelectionError(false);
    const freq = frequencySelectionMap[item];
    freqRef.current = freq;
    if (freq.intervalUnit === IntervalUnit.week) {
      offsetsMultiplier.current = null;
    } else {
      offsetsMultiplier.current = [0];
    }
    resetMeasurementGroups(freq.numberOfDosages);
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

  const validate = (): {
    freq: Frequency;
    startDate: Date;
    endDate: Date | null;
  } | null => {
    let isDataValid = true;

    if (!freqRef.current) {
      isDataValid = false;
      setFreqSelectionError(true);
    } else {
      setFreqSelectionError(false);
    }

    if (!startDate) {
      isDataValid = false;
      setStartDateError(true);
    } else {
      setStartDateError(false);
    }

    if (!(endDate === null || (startDate && endDate && startDate < endDate))) {
      isDataValid = false;
    } else {
      isDataValid = true;
    }

    if (isDataValid && freqRef.current && startDate) {
      return {
        freq: freqRef.current,
        startDate,
        endDate,
      };
    }
    return null;
  };

  const handleSave = async () => {
    const validatedData = validate();

    if (!validatedData) {
      return;
    }

    let dosages = [];
    if (startDate) {
      const offsetsMultiplierValidated = offsetsMultiplier.current ?? [
        getWeekday(startDate),
      ];
      for (const [dIdx, gId] of dosageIdxToGroupId.entries()) {
        for (const [oIdx, o] of offsetsMultiplierValidated.entries()) {
          dosages.push({
            groupId: gId,
            index: dIdx * offsetsMultiplierValidated.length + oIdx,
            offset: o,
            amount: dosageIdxToAmount[dIdx],
          });
        }
      }
    }

    if (medicine && medicine.dbId) {
      await dbInsertMedicineSchedule(db, medicine.dbId, {
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        freq: validatedData.freq,
        dosages,
      });
      navigation.popToTop();
    } else if (medicine) {
      await dbInsertMedicineScheduleWithMedicine(db, medicine, {
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        freq: validatedData.freq,
        dosages,
      });
      navigation.popToTop();
    } else {
      throw Error("Medicine has not been provided");
    }
  };

  const createDosagesInputHandler = (idx: number) => {
    return (newValue: number) => {
      setDosageIdxToAmount((current) =>
        current.map((value, dIdx) => (dIdx === idx ? newValue : value)),
      );
    };
  };

  const createGroupInputHandler = (idx: number) => {
    return (newGroupId: number) => {
      const newGroupIdNormalized = newGroupId === -1 ? null : newGroupId;
      setDosageIdxToGroupId((current) =>
        current.map((gId, dIdx) => (dIdx === idx ? newGroupIdNormalized : gId)),
      );
    };
  };

  const doseHeader = medicine
    ? baseUnitToDoseHeader(medicine.baseUnit)
    : "Dose";

  return (
    <DefaultMainContainer>
      <ScrollView
        style={eStyles.editMainScrollContainer}
        contentContainerStyle={eStyles.editMainScrollContentContainer}
      >
        <View style={[styles.rowFrequencyPicker]}>
          <ModalPicker
            values={Object.values(FrequencySelection)}
            selectedValue={freqSelection}
            onValueChange={handleFrequencyPicker}
            getLabel={frequencySelectionToPickerLabelsExt(false)}
            getPressableLabel={frequencySelectionToPickerLabelsExt(true)}
            placeholder="Select frequency"
            pressableStyle={eStyles.fullWidthPickerPressable}
            error={freqSelectionError}
          />
        </View>

        <View style={[styles.rowDosagesHeaders]}>
          <View style={styles.dosageHeaderContainer}>
            <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
              {t(doseHeader)}
            </Text>
          </View>
          <View style={styles.dosageHeaderContainer}>
            <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
              {t("Group")}
            </Text>
          </View>
        </View>

        <View style={styles.dosagesContainer}>
          {dosageIdxToGroupId.map((gId, dIdx) => (
            <View
              // complex key to re-render when there is a change in initialValue
              key={dIdx * 10 + (gId ?? -1)}
              style={styles.rowDosage}
            >
              <View style={styles.dosageAmountContainer}>
                <SmallNumberStepper
                  onChange={createDosagesInputHandler(dIdx)}
                  defaultValue={1}
                />
              </View>
              <View style={[styles.dosageGroupPickerContainer]}>
                <DropdownPicker
                  options={groupsIds}
                  initialValue={gId ?? -1}
                  onValueChange={createGroupInputHandler(dIdx)}
                  getLabel={(gIdx) =>
                    gIdx === -1 ? "None" : (groupsMap.get(gIdx)?.name ?? "")
                  }
                  placeholder="group"
                  pressableStyle={{
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.rowDate}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
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
            <Text style={[eStyles.pressableText, { color: theme.colors.text }]}>
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

        <View style={styles.rowDate}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
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
            <Text style={[eStyles.pressableText, { color: theme.colors.text }]}>
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
          eStyles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleSave}
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
            {t("Save")}
          </Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  rowFrequencyPicker: {
    marginBottom: 16,
  },
  dosagesContainer: {
    marginBottom: 24,
  },
  rowDosagesHeaders: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 40,
  },
  rowDosage: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: EDIT_PRESSABLE_HEIGHT,
    marginBottom: 6,
  },
  dosageHeaderContainer: {
    width: "45%",
    justifyContent: "center",
    alignItems: "center",
  },
  dosageAmountContainer: {
    width: "45%",
    height: EDIT_PRESSABLE_HEIGHT,
  },
  dosageGroupPickerContainer: {
    justifyContent: "center",
    width: "45%",
    overflow: "hidden",
  },
  rowDate: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
});
