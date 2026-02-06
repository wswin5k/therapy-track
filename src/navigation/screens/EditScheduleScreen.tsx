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
import { Frequency, IntervalUnit } from "../../models/Schedule";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "..";
import { MedicineData } from "../../models/MedicineData";
import { useSQLiteContext } from "expo-sqlite";

enum FrequencySelection {
  OnceDaily = "Once daily",
  TwiceDaily = "Twice daily",
  ThriceDaily = "Three times daily",
  OnceWeekly = "Weekly",
  OnceBiweekly = "Every two weeks",
}

const frequencySelectionMap: { [key: string]: Frequency } = {
  OnceDaily: new Frequency(IntervalUnit.day, 1, 1, null),
  TwiceDaily: new Frequency(IntervalUnit.day, 1, 2, null),
  ThriceDaily: new Frequency(IntervalUnit.day, 1, 3, null),
  OnceWeekly: new Frequency(IntervalUnit.week, 1, 1, null),
  OnceBiweekly: new Frequency(IntervalUnit.week, 2, 1, null),
};

type EditScheduleScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditScheduleScreen"
>;

export default function EditScheduleScreen() {
  const { t, i18n } = useTranslation();

  const navigation = useNavigation<EditScheduleScreenNavigationProp>();
  const route = useRoute();

  const db = useSQLiteContext();

  const freqRef = React.useRef<Frequency>(frequencySelectionMap["OnceDaily"]);

  const [nDoses, setNDoses] = React.useState<number>(1);
  const dosesRefs = React.useRef(Array.from({ length: nDoses }, () => 1));

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

    const activeIngredientsStr = JSON.stringify(medicine.activeIngredients);
    const db_insert1 = await db.runAsync(
      "INSERT INTO medicines (name, active_ingredients) VALUES (?, ?)",
      medicine.name,
      activeIngredientsStr,
    );

    const dosesJson = JSON.stringify(dosesRefs.current);
    const freqJson = JSON.stringify(freqRef.current);
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate ? endDate.toISOString() : null;

    await db.runAsync(
      "INSERT INTO schedules (medicine, start_date, end_date, doses, freq) VALUES (?, ?, ?, ?, ?)",
      db_insert1.lastInsertRowId,
      startDateStr,
      endDateStr,
      dosesJson,
      freqJson,
    );
    console.log("save successfull");

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

  const dosesLabels = [
    "First Dose",
    "Second Dose",
    "Third Dose",
    "Fourth Dose",
  ];

  const medicine = (route.params as { medicine: MedicineData }).medicine;

  const doseHeader = `Dose (number of ${t(medicine.baseUnit, { count: 4 })})`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.headerLabel}>{t("Frequency")}</Text>
        <View style={styles.fullWidthPickerContainer}>
          <Picker style={styles.picker} onValueChange={handleFrequencyPicker}>
            {Object.entries(FrequencySelection).map(([k, v]) => (
              <Picker.Item label={t(v)} value={k} style={styles.pickerItem} />
            ))}
          </Picker>
        </View>

        <Text style={styles.headerLabel}>{t(doseHeader)}</Text>

        <View>
          {nDoses === 1 ? (
            <SmallNumberStepper onChange={handleDoseInput(0)} />
          ) : (
            Array.from({ length: nDoses }, (_, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <Text>{t(dosesLabels[idx])}</Text>
                <SmallNumberStepper onChange={handleDoseInput(idx)} />
              </View>
            ))
          )}
        </View>

        <Text style={styles.headerLabel}>{t("Start date")}</Text>
        <TouchableOpacity
          onPress={handleSelectStartDate}
          style={[styles.input, startDateError && styles.inputError]}
        >
          <Text style={styles.inputText}>
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

        <Text style={styles.headerLabel}>{t("End date")}</Text>
        <TouchableOpacity onPress={handleSelectEndDate} style={styles.input}>
          <Text style={styles.inputText}>
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

        <Text style={styles.headerLabel}>{t("That's 2 weeks")}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSave} style={styles.nextButton}>
          <Text style={styles.nextButtonText}>{t("Save")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    height: 50,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    marginBottom: 10,
  },
  inputError: {
    borderColor: "#ff3b30",
    borderWidth: 2,
  },
  inputText: {
    fontSize: 16,
    color: "#333",
  },
  fullWidthPickerContainer: {
    height: 50,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
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
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  nextButton: {
    backgroundColor: "#007AFF",
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
