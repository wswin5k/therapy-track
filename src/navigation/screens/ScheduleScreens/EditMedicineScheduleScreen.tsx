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
import {
  Frequency,
  FrequencySelection,
  IntervalUnit,
} from "../../../models/Frequency";
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
import {
  baseUnitToDoseHeader,
  frequencySelectionToDisplayForm,
} from "../../enumMappings";
import { ModalPicker } from "../../../components/ModalPicker";
import { eStyles, EDIT_PRESSABLE_HEIGHT } from "../../../commonStyles";
import { ERROR_BORDER_WIDTH } from "../../commonConsts";
import { getTodayDateOnly, toDisplayConcise } from "../../../dateOnlyUtils";
import { assingDefaultGroups } from "./common";

const frequencySelectionMap: { [key: string]: Frequency } = {
  OnceDaily: new Frequency(IntervalUnit.day, 1, 1),
  TwiceDaily: new Frequency(IntervalUnit.day, 1, 2),
  ThriceDaily: new Frequency(IntervalUnit.day, 1, 3),
  OnceWeekly: new Frequency(IntervalUnit.week, 1, 1),
  OnceBiweekly: new Frequency(IntervalUnit.week, 2, 1),
};

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

  const [freq, setFreq] = React.useState<FrequencySelection | null>(null);
  const freqRef = React.useRef<Frequency | null>(null);
  const [freqError, setFreqError] = React.useState<boolean>(false);

  const [nDosages, setNDosages] = React.useState<number>(1);
  const amountsRef = React.useRef<number[]>(
    Array.from({ length: nDosages }, () => 1),
  );
  const dosageIdxToGroupId = React.useRef<(number | null)[]>(
    Array.from({ length: nDosages }, () => null),
  );

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
  const [dosageIdxToDefaultGroupId, setDosageIdxToDefaultGroupIdx] =
    React.useState<Map<number, number>>(new Map());
  const groupsIds = React.useMemo(
    () => [-1, ...Array.from(groupsMap.values()).map((g) => g.dbId)],
    [groupsMap],
  );

  const updateGroupsRefWithDefaults = React.useCallback(() => {
    for (let i = 0; i < nDosages; i++) {
      dosageIdxToGroupId.current[i] = dosageIdxToDefaultGroupId.get(i) ?? null;
    }
  }, [dosageIdxToDefaultGroupId, nDosages]);

  useFocusEffect(
    React.useCallback(
      () => updateGroupsRefWithDefaults(),
      [updateGroupsRefWithDefaults],
    ),
  );

  useFocusEffect(
    React.useCallback(() => {
      const setData = async () => {
        const params = route.params as {
          medicine: MedicineParam;
          scheduleId?: number;
        };
        setMedicine(params.medicine);

        const groups = await dbGetGroups(db);
        const newGroupsMap = new Map();
        groups.forEach((g) => newGroupsMap.set(g.dbId, g));
        setGroupsMap(newGroupsMap);
        setDosageIdxToDefaultGroupIdx(assingDefaultGroups(groups));
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

  const validate = (): {
    freq: Frequency;
    startDate: Date;
    endDate: Date | null;
  } | null => {
    let isDataValid = true;

    if (!freqRef.current) {
      isDataValid = false;
      setFreqError(true);
    } else {
      setFreqError(false);
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

    const dosages = Array.from(
      amountsRef.current.entries(),
      ([index, amount]) => {
        const groupId = dosageIdxToGroupId.current[index];
        return { amount, index, offset: null, groupId };
      },
    );

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

  const handleFrequencyPicker = (item: FrequencySelection | null) => {
    if (!item) {
      freqRef.current = null;
      setFreq(null);
      return;
    }
    setFreq(item);
    const freq = frequencySelectionMap[item];
    freqRef.current = freq;
    if (freq.numberOfDosages !== nDosages) {
      setNDosages(freq.numberOfDosages);
      updateGroupsRefWithDefaults();
    }
  };

  const createDosagesInputHandler = (idx: number) => {
    return (value: number) => {
      amountsRef.current[idx] = value;
    };
  };

  const createGroupInputHandler = (idx: number) => {
    return (groupIdx: number) => {
      dosageIdxToGroupId.current[idx] = groupIdx === -1 ? null : groupIdx;
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
            selectedValue={freq}
            onValueChange={handleFrequencyPicker}
            getLabel={frequencySelectionToDisplayForm}
            placeholder="Select frequency"
            pressableStyle={eStyles.fullWidthPickerPressable}
            error={freqError}
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
          {Array.from({ length: nDosages }, (_, idx) => (
            <View
              // complex key to re-render when there is a change in initialValue
              key={idx * 10 + (dosageIdxToDefaultGroupId.get(idx) ?? -1)}
              style={styles.rowDosage}
            >
              <View style={styles.dosageAmountContainer}>
                <SmallNumberStepper
                  onChange={createDosagesInputHandler(idx)}
                  defaultValue={1}
                />
              </View>
              <View style={[styles.dosageGroupPickerContainer]}>
                <DropdownPicker
                  options={groupsIds}
                  initialValue={dosageIdxToDefaultGroupId.get(idx) ?? -1}
                  onValueChange={createGroupInputHandler(idx)}
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
