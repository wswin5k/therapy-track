import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import {
  useRoute,
  useNavigation,
  useTheme,
  useFocusEffect,
} from "@react-navigation/native";
import type { RootStackParamList } from "../index";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Medicine } from "../../models/MedicineSchedule";
import { dbGetMedicines } from "../../models/dbAccess";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { ModalPicker } from "../../components/ModalPicker";

type SelectMedicineScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SelectMedicineScreen"
>;

export function SelectMedicineScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation<SelectMedicineScreenNavigationProp>();
  const db = useSQLiteContext();
  const theme = useTheme();

  const [medicines, setMedicines] = React.useState<Medicine[]>([]);

  const mode = (route.params as { mode: "schedule" | "one-time" }).mode;
  const selectedDate = (
    route.params as { mode: "schedule" | "one-time"; selectedDate?: string }
  ).selectedDate;

  useFocusEffect(
    React.useCallback(() => {
      async function setup() {
        const result = await dbGetMedicines(db);
        setMedicines(result);
      }
      setup();
    }, [db]),
  );

  const handleAddNewMedicine = () => {
    navigation.navigate("EditMedicineScreen", { mode: mode });
  };

  const handleSelectMedicine = (medicine?: Medicine) => {
    if (!medicine) {
      return;
    }
    if (mode === "schedule") {
      navigation.navigate("EditScheduleScreen", {
        medicine: medicine,
      });
    } else {
      // mode === "one-time"
      navigation.navigate("EditSingleDosageScreen", {
        medicine: medicine,
        selectedDate: selectedDate,
      });
    }
  };

  const createMedicineLabel = (m: Medicine): string => {
    let ingredientsStr = m.activeIngredients
      .map((ai) => `${ai.name} ${ai.amount}${ai.unit}`)
      .join(", ");

    ingredientsStr = ingredientsStr ? "(" + ingredientsStr + ")" : "";

    return `${m.name}  ${ingredientsStr}`;
  };

  return (
    <DefaultMainContainer justifyContent="center">
      {medicines.length > 0 && (
        <ModalPicker
          values={medicines}
          onValueChange={handleSelectMedicine}
          getLabel={createMedicineLabel}
          placeholder="Select existing medicine"
          selectedValue={null}
          pressableStyle={styles.fullWidthPickerContainer}
        />
      )}

      <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
        {t("or")}
      </Text>

      <TouchableOpacity
        onPress={handleAddNewMedicine}
        style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={styles.nextButtonText}>{t("Add new medicine")}</Text>
      </TouchableOpacity>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  headerLabel: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
    margin: 15,
  },
  fullWidthPickerContainer: {
    maxWidth: "80%",
    width: 300,
    height: 60,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignSelf: "center",
    padding: 15,
  },
  nextButton: {
    maxWidth: "80%",
    width: 300,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    alignSelf: "center",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 17.5,
    fontWeight: "500",
  },
});
