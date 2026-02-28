import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import RNDateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import SmallNumberStepper from "../../components/SmallNumberStepper";
import {
  Frequency,
  FrequencySelection,
  Group,
  IntervalUnit,
  strKeyOfFrequeencySelection,
} from "../../models/Schedule";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useTheme,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MedicineParam, RootStackParamList } from "..";
import { useSQLiteContext } from "expo-sqlite";
import {
  dbGetGroups,
  dbInsertSchedule,
  dbInsertScheduleWithMedicine,
} from "../../models/dbAccess";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { DropdownPicker } from "../../components/DropdownPicker";
import { baseUnitToDoseHeader } from "../baseUnitMappings";

const frequencySelectionMap: { [key: string]: Frequency } = {
  OnceDaily: new Frequency(IntervalUnit.day, 1, 1),
  TwiceDaily: new Frequency(IntervalUnit.day, 1, 2),
  ThriceDaily: new Frequency(IntervalUnit.day, 1, 3),
  OnceWeekly: new Frequency(IntervalUnit.week, 1, 1),
  OnceBiweekly: new Frequency(IntervalUnit.week, 2, 1),
};

function assingDefaultGroups(groups: Group[]): Map<number, number> {
  const doseIdxToGroup = new Map();

  groups.forEach((g, idx) => {
    if (g.name === "Morning") {
      doseIdxToGroup.set(0, idx);
    } else if (g.name === "Afternoon") {
      doseIdxToGroup.set(1, idx);
    } else if (g.name === "Evening") {
      doseIdxToGroup.set(2, idx);
    }
  });

  return doseIdxToGroup;
}

type EditScheduleScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditScheduleScreen"
>;

export default function EditScheduleScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<EditScheduleScreenNavigationProp>();
  const route = useRoute();
  const db = useSQLiteContext();

  const freqRef = React.useRef<Frequency | null>(null);
  const [freqError, setFreqError] = React.useState<boolean>(false);

  const [nDoses, setNDoses] = React.useState<number>(1);
  const amountsRef = React.useRef<number[]>(
    Array.from({ length: nDoses }, () => 1),
  );
  const groupsRef = React.useRef<(number | null)[]>(
    Array.from({ length: nDoses }, () => null),
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

  const updateGroupsRefWithDefaults = React.useCallback(
    (nDoses: number) => {
      const defaultGroups = assingDefaultGroups(groups);
      for (let i = 0; i < nDoses; i++) {
        groupsRef.current[i] = defaultGroups.get(i) ?? null;
      }
    },
    [groups],
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

  const handleStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
    console.log(event.type);
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

    if (!(endDate === null || (startDate && endDate && startDate > endDate))) {
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

    console.log(validatedData);

    if (!validatedData) {
      return;
    }

    const doses = Array.from(
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
      await dbInsertSchedule(db, medicine.dbId, {
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        freq: validatedData.freq,
        doses,
      });
      navigation.navigate("HomeTabs");
    } else if (medicine) {
      await dbInsertScheduleWithMedicine(db, medicine, {
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        freq: validatedData.freq,
        doses,
      });
      navigation.navigate("HomeTabs");
    } else {
      throw Error("Medicine has not been provided");
    }
  };

  const handleFrequencyPicker = (item: FrequencySelection | "") => {
    if (!item) {
      freqRef.current = null;
      return;
    }
    const itemKey = strKeyOfFrequeencySelection(item);
    const freq = frequencySelectionMap[itemKey];
    freqRef.current = freq;
    if (freq.numberOfDoses !== nDoses) {
      console.log(freq.numberOfDoses);
      setNDoses(freq.numberOfDoses);
      updateGroupsRefWithDefaults(freq.numberOfDoses);
    }
  };

  const createDoseInputHandler = (idx: number) => {
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
          <View
            style={[
              styles.fullWidthPickerContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              freqError && {
                borderColor: theme.colors.error,
                borderWidth: 2,
              },
            ]}
          >
            <Picker
              style={[styles.picker, { color: theme.colors.text }]}
              dropdownIconColor={theme.colors.text}
              onValueChange={handleFrequencyPicker}
            >
              <Picker.Item
                label="Select frequency"
                value=""
                color={theme.colors.textTertiary}
              />
              {Object.entries(FrequencySelection).map(([k, v]) => {
                return (
                  <Picker.Item
                    key={k}
                    label={t(v)}
                    value={v}
                    style={styles.pickerItem}
                    color={theme.colors.text}
                  />
                );
              })}
            </Picker>
          </View>
        </View>

        <View style={[styles.rowDosesHeader]}>
          <View style={styles.doseHeaderContainer}>
            <Text
              style={[styles.doseHeaderLabel, { color: theme.colors.text }]}
            >
              {t(doseHeader)}
            </Text>
          </View>
          <View style={styles.doseHeaderContainer}>
            <Text
              style={[styles.doseHeaderLabel, { color: theme.colors.text }]}
            >
              {t("Group (optional)")}
            </Text>
          </View>
        </View>

        <View style={styles.dosesContainer}>
          {Array.from({ length: nDoses }, (_, idx) => (
            <View key={idx} style={styles.rowDose}>
              <View style={styles.doseAmountContainer}>
                <SmallNumberStepper
                  onChange={createDoseInputHandler(idx)}
                  defaultValue={amountsRef.current[idx]}
                />
              </View>
              <View
                style={[
                  styles.pickerContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
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
                    ...styles.picker,
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
            value={new Date()}
            onChange={handleStartDateChange}
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
            value={new Date()}
            minimumDate={startDate ? startDate : undefined}
            onChange={handleEndDateChange}
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
  dosesContainer: {
    marginBottom: 30,
  },
  rowDosesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 40,
  },
  rowDose: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
  },
  doseHeaderLabel: {
    fontSize: 16,
  },
  doseHeaderContainer: {
    width: "45%",
    justifyContent: "center",
    alignItems: "center",
  },
  doseAmountContainer: {
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
    borderRadius: 8,
    justifyContent: "center",
    borderWidth: 1,
    width: "45%",
    overflow: "hidden",
  },
  picker: {},
  pickerItem: {
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
