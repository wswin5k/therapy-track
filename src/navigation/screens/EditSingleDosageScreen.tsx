import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import RNDateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React from "react";
import { useTranslation } from "react-i18next";
import SmallNumberStepper from "../../components/SmallNumberStepper";
import { dbInsertUnscheduledDosageRecord } from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { ActiveIngredient, BaseUnit } from "../../models/Medicine";
import { RootStackParamList } from "..";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type EditSingeDosageScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditSingleDosageScreen"
>;

export function EditSingleDosageScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();

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
    if (event.type === "dismissed") {
      setDate(null);
    } else if (newDate) {
      setDate(newDate);
      setDateError(false);
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
    <DefaultMainContainer>
      <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
        {t("Dose")}
      </Text>
      <View style={styles.doseContainer}>
        <SmallNumberStepper onChange={handleDoseChange} />
      </View>
      <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
        {t("Date")}
      </Text>
      <TouchableOpacity
        onPress={handleSelectDate}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          dateError && { borderColor: theme.colors.error, borderWidth: 2 },
        ]}
      >
        <Text style={[styles.inputText, { color: theme.colors.text }]}>
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
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
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
  doseContainer: {},
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
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
});
