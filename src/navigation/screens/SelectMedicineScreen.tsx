import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useRoute,
  useNavigation,
  useTheme,
  Theme,
} from "@react-navigation/native";
import type { RootStackParamList } from "../index";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Medicine,
  BaseUnit,
  IngredientAmountUnit,
} from "../../models/Medicine";
import { dbGetMedicines } from "../../dbAccess";

type SelectMedicineScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SelectMedicineScreen"
>;

export function SelectMedicineScreen() {
  const { t, i18n } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation<SelectMedicineScreenNavigationProp>();

  const theme = useTheme();

  const [name, setName] = React.useState("");
  const [baseUnit, setBaseUnit] = React.useState<string>("");

  // Validation State
  const [nameError, setNameError] = React.useState(false);
  const [baseUnitError, setBaseUnitError] = React.useState(false);
  const [medicines, setMedicines] = React.useState<Medicine[]>([]);

  const db = useSQLiteContext();

  const mode = (route.params as { mode?: "schedule" | "one-time" })?.mode;

  React.useEffect(() => {
    async function setup() {
      const result = await dbGetMedicines(db);
      setMedicines(result);
    }
    setup();
  }, []);

  const handleAddNewMedicine = () => {
    if (mode === "schedule") {
      navigation.navigate("EditMedicineScreen", { mode: mode });
    }
  };

  const handleSelectMedicine = (medicineIdx: number) => {
    if (mode === "schedule") {
      navigation.navigate("EditScheduleScreen", {
        medicine: medicines[medicineIdx],
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={[
          styles.fullWidthPickerContainer,
          { borderColor: theme.colors.border },
          baseUnitError ? { borderColor: "red", borderWidth: 1 } : {},
        ]}
      >
        <Picker onValueChange={handleSelectMedicine} style={styles.picker}>
          <Picker.Item label="Select existing medicine" value="" color="#999" />
          {medicines.map((m, idx) => (
            <Picker.Item
              key={m.medicineId}
              label={createMedicineLabel(m)}
              value={idx}
              style={styles.pickerItem}
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.headerLabel}>{t("or")}</Text>
      <TouchableOpacity
        onPress={handleAddNewMedicine}
        style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={styles.nextButtonText}>{t("Add new medicine")}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100, // Space for footer
  },
  headerLabel: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 60,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  ingredientsList: {
    marginBottom: 15,
  },
  pickerContainer: {
    height: 60,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
  },
  fullWidthPickerContainer: {
    height: 60,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 5,
  },
  picker: {
    width: "100%",
    height: 60,
  },
  pickerItem: {
    fontSize: 16,
  },
  removeButton: {
    width: 20,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonPlaceholder: {
    width: 20,
  },
  removeButtonText: {
    fontSize: 20,
    color: "#ff3b30",
    fontWeight: "bold",
  },
  addButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    alignItems: "center",
    marginTop: 5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "500",
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
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
});
