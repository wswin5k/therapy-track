import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useSQLiteContext } from "expo-sqlite";
import {
  useRoute,
  useNavigation,
  useTheme,
  useFocusEffect,
} from "@react-navigation/native";
import type { RootStackParamList } from "../index";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Medicine } from "../../models/Medicine";
import { dbGetMedicines } from "../../models/dbAccess";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";

type SelectMedicineScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SelectMedicineScreen"
>;

export function SelectMedicineScreen() {
  const { t, i18n } = useTranslation();
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
    }, []),
  );

  const handleAddNewMedicine = () => {
    navigation.navigate("EditMedicineScreen", { mode: mode });
  };

  const handleSelectMedicine = (medicineIdx: number) => {
    if (medicineIdx < 0) {
      return;
    }
    if (mode === "schedule") {
      navigation.navigate("EditScheduleScreen", {
        medicine: medicines[medicineIdx],
      });
    } else {
      // mode === "one-time"
      navigation.navigate("EditSingleDosageScreen", {
        medicine: medicines[medicineIdx],
        selectedDate: selectedDate,
      });
    }
  };

  const createMedicineLabel = (m: Medicine): string => {
    let ingredientsStr = m.activeIngredients
      .map((ai) => `${ai.name} ${ai.amount}${ai.unit}`)
      .join(", ");

    ingredientsStr = ingredientsStr ? "(" + ingredientsStr + ")" : "";

    return `${m.name} ${t(m.baseUnit, { count: 2 })} ${ingredientsStr}`;
  };
  console.log("render");

  return (
    <DefaultMainContainer justifyContent="center">
      <View
        style={[
          styles.fullWidthPickerContainer,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        {medicines.length > 0 && (
          <Picker
            onValueChange={handleSelectMedicine}
            itemStyle={[styles.picker, { color: theme.colors.text }]}
            dropdownIconColor={theme.colors.text}
          >
            <Picker.Item
              label="Select existing medicine"
              value={-1}
              color={theme.colors.textTertiary}
            />
            {medicines.map((m, idx) => (
              <Picker.Item
                key={m.dbId}
                label={createMedicineLabel(m)}
                value={idx}
                style={styles.pickerItem}
                color={theme.colors.text}
              />
            ))}
          </Picker>
        )}
      </View>

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
  picker: {
    paddingVertical: 16,
    fontWeight: "500",
  },
  pickerItem: {
    fontSize: 18,
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
    fontSize: 18,
    fontWeight: "600",
  },
});
