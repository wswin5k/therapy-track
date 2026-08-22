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
import {
  useRoute,
  useNavigation,
  useTheme,
  useFocusEffect,
} from "@react-navigation/native";
import type { RootStackParamList } from "../index";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BaseUnit,
  IngredientAmountUnit,
  ActiveIngredient,
  Medicine,
} from "../../models/MedicineSchedule";
import { NAME_MAX_LENGTH } from "../../validation_constants";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import {
  dbGetMedicines,
  dbInsertMedicine,
  dbUpdateMedicine,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { DropdownPicker } from "../../components/DropdownPicker";
import { baseUnitToUnitSelectionLabel } from "../enumMappings";
import { ModalPicker } from "../../components/ModalPicker";
import { ERROR_BORDER_WIDTH } from "../commonConsts";
import { isEqualLowerCase } from "../utils";
import { VALID_NAME } from "../../validation_constants";

class ActiveIngredientInfo {
  name: string | null;
  amount: number | null;
  unit: IngredientAmountUnit | null;
  elementKey: number;

  constructor(
    elementKey: number,
    name: string | null = null,
    amount: number | null = null,
    unit: IngredientAmountUnit = IngredientAmountUnit.Milligram,
  ) {
    this.elementKey = elementKey;
    this.name = name;
    this.amount = amount;
    this.unit = unit;
  }
}

type ActiveIngedientRowProps = {
  activeIngredientInfo: ActiveIngredientInfo;
  removeCallback: () => void;
  updateCallback: (
    updates: Partial<{
      name: string | null;
      amount: number | null;
      unit: IngredientAmountUnit | null;
    }>,
  ) => void;
  removeButton: boolean;
  errors?: { name?: boolean; weight?: boolean };
  theme: ReactNavigation.Theme;
};

function ActiveIngredientRow({
  activeIngredientInfo,
  updateCallback,
  removeCallback,
  removeButton,
  errors,
  theme,
}: ActiveIngedientRowProps) {
  const handleRemove = () => {
    removeCallback();
  };

  return (
    <View style={styles.ingredientRow}>
      <View style={{ flex: 2 }}>
        <TextInput
          onChangeText={(text: string) => {
            updateCallback({ name: text });
          }}
          style={[
            styles.ingredientInput,
            {
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
            },
            errors?.name
              ? {
                  borderColor: theme.colors.error,
                  borderWidth: ERROR_BORDER_WIDTH,
                }
              : {},
          ]}
          placeholder="Name"
          placeholderTextColor={theme.colors.textTertiary}
          value={activeIngredientInfo.name ?? ""}
          autoCapitalize="none"
        />
      </View>
      <View style={{ flex: 1.2 }}>
        <TextInput
          onChangeText={(weightStr: string) => {
            const amount = parseFloat(weightStr);
            updateCallback({
              amount: isNaN(amount) ? null : amount,
            });
          }}
          style={[
            styles.ingredientInput,
            {
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
            },
            errors?.weight
              ? {
                  borderColor: theme.colors.error,
                  borderWidth: ERROR_BORDER_WIDTH,
                }
              : {},
          ]}
          placeholder="Amount"
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType="numeric"
          value={
            activeIngredientInfo.amount
              ? activeIngredientInfo.amount.toString()
              : ""
          }
        />
      </View>
      <View style={{ flex: 1.2 }}>
        <DropdownPicker
          options={Object.values(IngredientAmountUnit)}
          initialValue={
            activeIngredientInfo.unit ?? IngredientAmountUnit.Milligram
          }
          onValueChange={(unit: IngredientAmountUnit) => {
            updateCallback({ unit });
          }}
          getLabel={(unit) => unit}
          placeholder="Unit"
          pressableStyle={{
            ...styles.pickerContainer,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
        />
      </View>
      {removeButton ? (
        <TouchableOpacity onPress={handleRemove} style={styles.removeButton}>
          <Text style={[styles.removeButtonText, { color: theme.colors.text }]}>
            ✕
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.removeButtonPlaceholder} />
      )}
    </View>
  );
}

interface MedicineValidated {
  name: string;
  baseUnit: BaseUnit;
  activeIngredients: ActiveIngredient[];
}

type EditMedicineScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditMedicineScreen"
>;

export function EditMedicineScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const db = useSQLiteContext();
  const navigation = useNavigation<EditMedicineScreenNavigationProp>();
  const theme = useTheme();

  const [medicineId, setMedicineId] = React.useState<number | null>(null);
  const [name, setName] = React.useState("");
  const [baseUnit, setBaseUnit] = React.useState<BaseUnit | null>(null);

  // when modyfing a medicine we don't want to check for duplicate names
  const [initialName, setInitialName] = React.useState<string | null>(null);
  const [nameError, setNameError] = React.useState(false);
  const [baseUnitError, setBaseUnitError] = React.useState(false);
  const [ingredientErrors, setIngredientErrors] = React.useState<
    Record<number, { name?: boolean; weight?: boolean }>
  >({});

  const elementKeyCounter = React.useRef<number>(1);
  const [activeIngredientInfos, setActiveIngredientInfos] = React.useState<
    ActiveIngredientInfo[]
  >([new ActiveIngredientInfo(0)]);

  const [medicinesNames, setMedicinesNames] = React.useState<string[]>([]);

  const loadMedicineNames = React.useCallback(async () => {
    const medicines = await dbGetMedicines(db);

    const newMedicineNames = medicines.map((a) => a.name.toLowerCase());
    setMedicinesNames(newMedicineNames);
  }, [db]);

  const [mode, setMode] = React.useState<
    "save-and-go-back" | "schedule" | "one-time"
  >("save-and-go-back");

  useFocusEffect(
    React.useCallback(() => {
      const params = route.params as {
        mode: "save-and-go-back" | "schedule" | "one-time";
        medicine?: Medicine;
      };
      setMode(params.mode);
      const medicineInit = params.medicine;
      if (medicineInit) {
        setMedicineId(medicineInit.dbId);
        setName(medicineInit.name);
        setInitialName(medicineInit.name);
        setBaseUnit(medicineInit.baseUnit);

        setActiveIngredientInfos(
          medicineInit.activeIngredients.map(
            (ai, idx) =>
              new ActiveIngredientInfo(idx, ai.name, ai.amount, ai.unit),
          ),
        );
      }
      loadMedicineNames();
    }, [route.params, loadMedicineNames]),
  );

  const validate = (
    nameIsOkWhenNotChanged: boolean = false,
  ): MedicineValidated | null => {
    let medicineValidated = true;

    const nameValidated = name.trim();
    const nameSameAsInitial = isEqualLowerCase(nameValidated, initialName);
    if (
      nameValidated &&
      ((nameValidated.length < NAME_MAX_LENGTH &&
        !medicinesNames.includes(nameValidated.toLowerCase()) &&
        VALID_NAME.test(nameValidated)) ||
        (nameIsOkWhenNotChanged && nameSameAsInitial))
    ) {
      setNameError(false);
    } else {
      setNameError(true);
      medicineValidated = false;
    }

    if (baseUnit) {
      setBaseUnitError(false);
    } else {
      setBaseUnitError(true);
      medicineValidated = false;
    }

    let activeIngredients: ActiveIngredient[] = [];

    const newIngredientErrors: Record<
      number,
      { name?: boolean; weight?: boolean }
    > = {};
    activeIngredientInfos.forEach((ing) => {
      const errors: { name?: boolean; weight?: boolean } = {};
      if (!ing.name || !ing.name.trim()) {
        errors.name = true;
        medicineValidated = false;
      }
      if (ing.amount === null || isNaN(ing.amount)) {
        errors.weight = true;
        medicineValidated = false;
      }

      if (Object.keys(errors).length > 0) {
        newIngredientErrors[ing.elementKey] = errors;
      }
    });
    setIngredientErrors(newIngredientErrors);
    if (Object.keys(newIngredientErrors).length === 0) {
      activeIngredients = activeIngredientInfos
        .filter((ing) => ing.name && ing.amount && ing.unit)
        .map((ing) => new ActiveIngredient(ing.name!, ing.amount!, ing.unit!));
    } else {
      medicineValidated = false;
    }

    if (medicineValidated && baseUnit && activeIngredients) {
      return {
        name,
        baseUnit,
        activeIngredients,
      };
    }
    return null;
  };

  const handleSave = async () => {
    if (mode === "schedule") {
      const medicineValidated = validate();
      if (!medicineValidated) {
        return;
      }
      navigation.navigate("EditMedicineScheduleScreen", {
        medicine: medicineValidated,
      });
    } else if (mode === "one-time") {
      const medicineValidated = validate();
      if (!medicineValidated) {
        return;
      }
      navigation.navigate("EditSingleDosageScreen", {
        medicine: medicineValidated,
      });
    } else {
      // if (mode === "save-and-go-back") {
      const medicineValidated = validate(true);
      if (!medicineValidated) {
        return;
      }
      if (medicineId !== null) {
        await dbUpdateMedicine(db, { dbId: medicineId, ...medicineValidated });
      } else {
        await dbInsertMedicine(db, medicineValidated);
      }
      navigation.goBack();
    }
  };

  const handleAddActiveIngredient = () => {
    setActiveIngredientInfos((current) => [
      ...current,
      new ActiveIngredientInfo(elementKeyCounter.current),
    ]);
    elementKeyCounter.current += 1;
  };

  const handleRemoveActiveIngredient = (idx: number) => {
    return () => {
      setActiveIngredientInfos((current) => current.toSpliced(idx, 1));
    };
  };

  const updateActiveIngredient = (
    elementKey: number,
    updates: Partial<{
      name: string | null;
      amount: number | null;
      unit: IngredientAmountUnit | null;
    }>,
  ) => {
    setActiveIngredientInfos((current) =>
      current.map((ing) =>
        ing.elementKey === elementKey ? { ...ing, ...updates } : ing,
      ),
    );
  };

  return (
    <DefaultMainContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.rowContainer]}>
          <TextInput
            placeholder="Medicine Name"
            placeholderTextColor={theme.colors.textTertiary}
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              },
              nameError
                ? {
                    borderColor: theme.colors.error,
                    borderWidth: ERROR_BORDER_WIDTH,
                  }
                : {},
            ]}
            onChangeText={(text: string) => {
              setName(text);
            }}
            value={name}
          />
        </View>
        <ModalPicker
          values={Object.values(BaseUnit)}
          selectedValue={baseUnit}
          onValueChange={(value) => {
            setBaseUnit(value);
          }}
          getLabel={baseUnitToUnitSelectionLabel}
          placeholder="Select base unit"
          pressableStyle={styles.fullWidthPickerContainer}
          error={baseUnitError}
        />
        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("Active ingredients per base unit")}
        </Text>

        <View style={styles.ingredientsList}>
          {activeIngredientInfos.map((ing) => (
            <ActiveIngredientRow
              key={ing.elementKey}
              activeIngredientInfo={ing}
              updateCallback={(updates) =>
                updateActiveIngredient(ing.elementKey, updates)
              }
              removeCallback={handleRemoveActiveIngredient(ing.elementKey)}
              removeButton={activeIngredientInfos.length === 1 ? false : true}
              errors={ingredientErrors[ing.elementKey]}
              theme={theme}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleAddActiveIngredient}
          style={[styles.addButton, { borderColor: theme.colors.primary }]}
        >
          <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
            + Add Ingredient
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={styles.nextButtonText}>
            {mode === "save-and-go-back" ? "Save" : "Next"}
          </Text>
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
    fontWeight: "500",
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 5,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 30,
    height: 60,
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    width: "100%",
  },
  ingredientInput: {
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    width: "100%",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  ingredientsList: {
    marginBottom: 15,
  },
  pickerContainer: {
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
  },
  fullWidthPickerContainer: {
    height: 55,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 5,
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
    fontWeight: "bold",
  },
  addButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: "600",
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
});
