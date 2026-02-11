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
import { SafeAreaView } from "react-native-safe-area-context";
import SmallNumberStepper from "../../components/SmallNumberStepper";
import { Dose, Frequency, IntervalUnit } from "../../models/Schedule";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "..";
import { ActiveIngredient, BaseUnit, Medicine } from "../../models/Medicine";
import { useSQLiteContext } from "expo-sqlite";
import {
  dbInsertSchedule,
  dbInsertScheduleWithMedicine,
} from "../../models/dbAccess";

enum FrequencySelection {
  OnceDaily = "Once daily",
  TwiceDaily = "Twice daily",
  ThriceDaily = "Three times daily",
  OnceWeekly = "Weekly",
  OnceBiweekly = "Every two weeks",
}

const frequencySelectionMap: { [key: string]: Frequency } = {
  OnceDaily: new Frequency(IntervalUnit.day, 1, 1),
  TwiceDaily: new Frequency(IntervalUnit.day, 1, 2),
  ThriceDaily: new Frequency(IntervalUnit.day, 1, 3),
  OnceWeekly: new Frequency(IntervalUnit.week, 1, 1),
  OnceBiweekly: new Frequency(IntervalUnit.week, 2, 1),
};

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
  const dosesRefs = React.useRef<Array<number>>(
    Array.from({ length: nDoses }, () => 1),
  );

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

  const handleStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
    console.log(event.type);
    if (date) {
      setStartDate(date);
      setStartDateError(false);
    }
    setIsStartDatePickerOpened(false);
  };

  const handleSelectEndDate = () => {
    setIsEndDatePickerOpened(true);
  };

  const handleEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
    console.log(event.type);
    if (date) {
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
      dosesRefs.current.entries(),
      ([index, amount]) => new Dose(amount, index, null),
    );

    if (medicine.dbId) {
      await dbInsertSchedule(db, medicine.dbId, {
        startDate,
        endDate,
        freq: freqRef.current,
        doses,
      });
    } else {
      await dbInsertScheduleWithMedicine(db, medicine, {
        startDate,
        endDate,
        freq: freqRef.current,
        doses,
      });
    }

    navigation.navigate("HomeTabs");
  };

  const handleFrequencyPicker = (item: string) => {
    const freq = frequencySelectionMap[item];
    freqRef.current = freq;
    if (freq.numberOfDoses !== nDoses) {
      setNDoses(freq.numberOfDoses);
    }
  };

  const handleDoseInput = (idx: number) => {
    return (value: number) => {
      dosesRefs.current[idx] = value;
    };
  };

  const medicine = (
    route.params as {
      medicine: {
        name: string;
        baseUnit: BaseUnit;
        activeIngredients: ActiveIngredient[];
        dbId?: number;
      };
    }
  ).medicine;

  const doseHeader = `Dose (number of ${t(medicine.baseUnit, { count: 4 })})`;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "bottom"]}
    >
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
            {Object.entries(FrequencySelection).map(([k, v]) => (
              <Picker.Item
                key={k}
                label={t(v)}
                value={k}
                style={styles.pickerItem}
                color={theme.colors.text}
              />
            ))}
          </Picker>
        </View>

        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t(doseHeader)}
        </Text>

        <View>
          {nDoses === 1 ? (
            <SmallNumberStepper onChange={handleDoseInput(0)} />
          ) : (
            Array.from({ length: nDoses }, (_, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <Text style={{ color: theme.colors.text }}>
                  {t("Dose", { count: idx, oridnal: true })}
                </Text>
                <SmallNumberStepper onChange={handleDoseInput(idx)} />
              </View>
            ))
          )}
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

        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("That's 2 weeks")}
        </Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
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
    width: "100%",
    height: 50,
  },
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
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
});
