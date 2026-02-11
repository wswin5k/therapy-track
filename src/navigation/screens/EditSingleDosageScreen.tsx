import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import RNDateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React from "react";
import { useTranslation } from "react-i18next";
import SmallNumberStepper from "../../components/SmallNumberStepper";
import {
  dbInsertScheduledDosageRecord,
  dbInsertUnscheduledDosageRecord,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ActiveIngredient, BaseUnit } from "../../models/Medicine";
import { RootStackParamList } from "..";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type EditSingeDosageScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditSingleDosageScreen"
>;

export function EditSingleDosageScreen() {
  const { t, i18n } = useTranslation();

  const db = useSQLiteContext();

  const [date, setDate] = React.useState<Date | null>(null);
  const [dateError, setDateError] = React.useState<boolean>(false);
  const [isDatePickerOpened, setIsDatePickerOpened] =
    React.useState<boolean>(false);

  const [dose, setDose] = React.useState<number>(1);

  const navigation = useNavigation<EditSingeDosageScreenNavigationProp>();
  const route = useRoute();

  const handleSelectDate = () => {
    setIsDatePickerOpened(true);
  };

  const handleDateChange = (event: DateTimePickerEvent, newDate?: Date) => {
    setIsDatePickerOpened(false);
    if (newDate) {
      setDate(newDate);
      setDateError(false);
      console.log(newDate);
    }
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

  const validate = (): {
    date: Date;
    medicineId: number;
    doseAmount: number;
  } | null => {
    if (date) {
      if (medicine && medicine.dbId) {
        return { date: date, medicineId: medicine.dbId, doseAmount: dose };
      } else {
        throw Error("Medicine has not been set");
      }
    } else {
      setDateError(true);
    }
    return null;
  };

  const handleSave = async () => {
    const dataValidated = validate();
    if (!dataValidated) {
      return;
    }
    await dbInsertUnscheduledDosageRecord(db, {
      date: dataValidated.date,
      medicineId: dataValidated.medicineId,
      doseAmount: dataValidated.doseAmount,
    });

    navigation.navigate("HomeTabs");
  };

  const handleDoseChange = (value: number) => {
    setDose(value);
  };

  return (
    <DefaultMainContainer justifyContent="flex-start">
      <Text style={styles.headerLabel}>{t("Dose")}</Text>
      <View style={styles.doseContainer}>
        <SmallNumberStepper onChange={handleDoseChange} />
      </View>
      <Text style={styles.headerLabel}>{t("Date")}</Text>
      <TouchableOpacity
        onPress={handleSelectDate}
        style={[styles.input, dateError && styles.inputError]}
      >
        <Text style={styles.inputText}>
          {date ? date.toDateString() : "Select date"}
        </Text>
      </TouchableOpacity>
      {isDatePickerOpened ? (
        <RNDateTimePicker
          mode="date"
          value={new Date()}
          onChange={handleDateChange}
        />
      ) : (
        ""
      )}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSave} style={styles.nextButton}>
          <Text style={styles.nextButtonText}>{t("Save")}</Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
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
  doseContainer: {},
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
