import React from "react";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";
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
import { sStyles } from "../../commonStyles";

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
      navigation.navigate("EditMedicineScheduleScreen", {
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
    let ingredientsStr = m.activeIngredientsString().join(", ");

    ingredientsStr = ingredientsStr ? "(" + ingredientsStr + ")" : "";

    return `${m.name}  ${ingredientsStr}`;
  };

  return (
    <DefaultMainContainer>
      <View style={sStyles.selectMainContainer}>
        {medicines.length > 0 && (
          <ModalPicker
            values={medicines}
            onValueChange={handleSelectMedicine}
            getLabel={createMedicineLabel}
            placeholder="Select existing medicine"
            selectedValue={null}
            pressableStyle={sStyles.picker}
          />
        )}

        <Text style={[sStyles.labelText, { color: theme.colors.text }]}>
          {t("or")}
        </Text>

        <TouchableOpacity
          onPress={handleAddNewMedicine}
          style={[sStyles.button, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[sStyles.buttonText, {color: theme.colors.textOnPrimary}]}>{t("Add new medicine")}</Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}
