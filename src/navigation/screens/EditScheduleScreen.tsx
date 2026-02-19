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
  Dose,
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
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<EditScheduleScreenNavigationProp>();
  const route = useRoute();
  const db = useSQLiteContext();

  const freqRef = React.useRef<Frequency>(frequencySelectionMap["OnceDaily"]);

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

  const updateGroupsRefWithDefaults = (nDoses: number) => {
    const defaultGroups = assingDefaultGroups(groups);
    for (let i = 0; i < nDoses; i++) {
      groupsRef.current[i] = defaultGroups.get(i) ?? null;
    }
  };

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
        updateGroupsRefWithDefaults(nDoses);
      };
      setData();
    }, []),
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

  const handleSave = async () => {
    // Clear previous error state
    setStartDateError(false);
    // Validate required fields
    if (!startDate) {
      setStartDateError(true);
      return;
    }
    if (endDate && startDate > endDate) {
      setStartDateError(true);
      return;
    }
    if (!freqRef.current) {
      throw Error("Frequency has not been set");
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
        startDate,
        endDate,
        freq: freqRef.current,
        doses,
      });
      navigation.navigate("HomeTabs");
    } else if (medicine) {
      await dbInsertScheduleWithMedicine(db, medicine, {
        startDate,
        endDate,
        freq: freqRef.current,
        doses,
      });
      navigation.navigate("HomeTabs");
    } else {
      throw Error("Medicine has not been provided");
    }
  };

  const handleFrequencyPicker = (item: FrequencySelection) => {
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
    ? `Number of ${t(medicine.baseUnit, { count: 4 })}`
    : "Amount";

  return (
    <DefaultMainContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("Frequency")}
        </Text>
        <View
          style={[
            styles.fullWidthPickerContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Picker
            style={[styles.picker, { color: theme.colors.text }]}
            dropdownIconColor={theme.colors.text}
            onValueChange={handleFrequencyPicker}
          >
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

        <View style={[styles.doseRow]}>
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t(doseHeader)}
          </Text>
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t("Group (optional)")}
          </Text>
        </View>

        <View>
          {Array.from({ length: nDoses }, (_, idx) => (
            <View key={idx} style={styles.doseRow}>
              <View>
                {nDoses !== 1 && (
                  <Text style={{ color: theme.colors.text }}>
                    {t("Dose", { count: idx, oridnal: true })}
                  </Text>
                )}
              </View>

              <SmallNumberStepper
                onChange={createDoseInputHandler(idx)}
                defaultValue={amountsRef.current[idx]}
              />
              <Picker
                style={[
                  styles.picker,
                  { borderWidth: 2, width: 200, color: theme.colors.text },
                ]}
                selectedValue={defaultGroups.get(idx) ?? -1}
                dropdownIconColor={theme.colors.text}
                onValueChange={createGroupInputHandler(idx)}
              >
                <Picker.Item
                  key={-1}
                  label={t("None")}
                  value={-1}
                  style={styles.pickerItem}
                  color={theme.colors.textTertiary}
                />
                {groups.map((g, gIdx) => (
                  <Picker.Item
                    key={gIdx}
                    label={t(g.name)}
                    value={gIdx}
                    style={styles.pickerItem}
                    color={theme.colors.text}
                  />
                ))}
              </Picker>
            </View>
          ))}
        </View>

        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("Start date")}
        </Text>
        <TouchableOpacity
          onPress={handleSelectStartDate}
          style={[
            styles.input,
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
            {startDate ? startDate.toDateString() : "Select date"}
          </Text>
        </TouchableOpacity>
        {isStartDatePickerOpened ? (
          <RNDateTimePicker
            mode="date"
            value={new Date()}
            onChange={handleStartDateChange}
          />
        ) : (
          ""
        )}

        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("End date")}
        </Text>
        <TouchableOpacity
          onPress={handleSelectEndDate}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.inputText, { color: theme.colors.text }]}>
            {endDate ? endDate.toDateString() : "Select date"}
          </Text>
        </TouchableOpacity>
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
        {/* 
        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("That's 2 weeks")}
        </Text> */}
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
    padding: 16,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    marginBottom: 10,
  },
  inputError: {
    borderWidth: 2,
  },
  inputText: {
    fontSize: 16,
  },
  fullWidthPickerContainer: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 15,
  },
  picker: {
    height: 50,
  },
  pickerItem: {
    fontSize: 16,
    borderWidth: 2,
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
    borderRadius: 12,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  doseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    gap: 8,
    marginBottom: 10,
  },
});
