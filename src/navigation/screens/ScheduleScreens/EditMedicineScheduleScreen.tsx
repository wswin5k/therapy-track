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

const frequencySelectionMap: { [key: string]: Frequency } = {
  OnceDaily: new Frequency(IntervalUnit.day, 1, 1),
  TwiceDaily: new Frequency(IntervalUnit.day, 1, 2),
  ThriceDaily: new Frequency(IntervalUnit.day, 1, 3),
  OnceWeekly: new Frequency(IntervalUnit.week, 1, 1),
  OnceBiweekly: new Frequency(IntervalUnit.week, 2, 1),
};

function assingDefaultGroups(groups: Group[]): Map<number, number> {
  const dosageIdxToGroup = new Map();

  groups.forEach((g, idx) => {
    if (g.name === "Morning") {
      dosageIdxToGroup.set(0, idx);
    } else if (g.name === "Afternoon") {
      dosageIdxToGroup.set(1, idx);
    } else if (g.name === "Evening") {
      dosageIdxToGroup.set(2, idx);
    }
  });

  return dosageIdxToGroup;
}

type EditMedicineScheduleScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditMedicineScheduleScreen"
>;

export default function EditMedicineScheduleScreen() {
  const { t } = useTranslation();
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
  const groupsRef = React.useRef<(number | null)[]>(
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
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [defaultGroups, setDefaultGroups] = React.useState<Map<number, number>>(
    new Map(),
  );

  const updateGroupsRefWithDefaults = React.useCallback(() => {
    const defaultGroups = assingDefaultGroups(groups);
    for (let i = 0; i < nDosages; i++) {
      groupsRef.current[i] = defaultGroups.get(i) ?? null;
    }
  }, [groups, nDosages]);

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
        setGroups(groups);
        setDefaultGroups(assingDefaultGroups(groups));
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
        const groupId =
          groupsRef.current[index] === null
            ? null
            : groups[groupsRef.current[index]].dbId;
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
      groupsRef.current[idx] = groupIdx === -1 ? null : groupIdx;
    };
  };

  const doseHeader = medicine
    ? baseUnitToDoseHeader(medicine.baseUnit)
    : "Dose";

  return (
    <DefaultMainContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.rowContainer, { marginBottom: 20 }]}>
          <ModalPicker
            values={Object.values(FrequencySelection)}
            selectedValue={freq}
            onValueChange={handleFrequencyPicker}
            getLabel={frequencySelectionToDisplayForm}
            placeholder="Select frequency"
            pressableStyle={styles.fullWidthPickerContainer}
            error={freqError}
          />
        </View>

        <View style={[styles.rowDosagesHeader]}>
          <View style={styles.dosageHeaderContainer}>
            <Text
              style={[styles.dosageHeaderLabel, { color: theme.colors.text }]}
            >
              {t(doseHeader)}
            </Text>
          </View>
          <View style={styles.dosageHeaderContainer}>
            <Text
              style={[styles.dosageHeaderLabel, { color: theme.colors.text }]}
            >
              {t("Group (optional)")}
            </Text>
          </View>
        </View>

        <View style={styles.dosagesContainer}>
          {Array.from({ length: nDosages }, (_, idx) => (
            <View key={idx} style={styles.rowDosage}>
              <View style={styles.dosageAmountContainer}>
                <SmallNumberStepper
                  onChange={createDosagesInputHandler(idx)}
                  defaultValue={1}
                />
              </View>
              <View
                style={[
                  styles.pickerContainer,
                  {
                    backgroundColor: theme.colors.surface,
                  },
                ]}
              >
                <DropdownPicker
                  options={[-1].concat(
                    Array.from({ length: groups.length }, (_, i) => i),
                  )}
                  initialValue={defaultGroups.get(idx) ?? -1}
                  onValueChange={createGroupInputHandler(idx)}
                  getLabel={(gIdx) =>
                    gIdx === -1 ? "None" : groups[gIdx].name
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

        <View style={styles.rowContainer}>
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t("Start date")}
          </Text>
          <TouchableOpacity
            onPress={handleSelectStartDate}
            style={[
              styles.dateButton,
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
              {startDate ? startDate.toDateString() : t("Select date")}
            </Text>
          </TouchableOpacity>
        </View>
        {isStartDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={startDate ?? new Date()}
            onValueChange={handleStartDateChange}
            onDismiss={handleStartDateDismiss}
            neutralButton={{ label: "Clear", textColor: "" }}
            onNeutralButtonPress={handleStartDateClear}
          />
        ) : (
          ""
        )}

        <View style={styles.rowContainer}>
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t("End date")}
          </Text>
          <TouchableOpacity
            onPress={handleSelectEndDate}
            style={[
              styles.dateButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.inputText, { color: theme.colors.text }]}>
              {endDate ? endDate.toDateString() : t("Infinitely")}
            </Text>
          </TouchableOpacity>
        </View>

        {isEndDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={endDate ?? new Date()}
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
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.nextButtonText}>{t("Save")}</Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
  },
  dosagesContainer: {
    marginBottom: 30,
  },
  rowDosagesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 40,
  },
  rowDosage: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
  },
  dosageHeaderLabel: {
    fontSize: 16,
  },
  dosageHeaderContainer: {
    width: "45%",
    justifyContent: "center",
    alignItems: "center",
  },
  dosageAmountContainer: {
    width: "45%",
    height: 52,
  },
  headerLabel: {
    fontSize: 18,
    fontWeight: "400",
    width: "45%",
  },
  dateButton: {
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    width: "45%",
  },
  inputError: {
    borderWidth: 2,
  },
  inputText: {
    fontSize: 16,
  },
  fullWidthPickerContainer: {
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    width: "100%",
  },
  pickerContainer: {
    height: 52,
    justifyContent: "center",
    width: "45%",
    overflow: "hidden",
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
  nextButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
