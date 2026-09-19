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
import { NAME_MAX_LENGTH, VALID_NAME } from "../../validationConstants";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import {
  dbGetMedicines,
  dbInsertMedicine,
  dbUpdateMedicine,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { DropdownPicker } from "../../components/DropdownPicker";
import {
  baseUnitToUnitSelectionLabel,
  ingredientAmountUnitEnumToDisplayForm,
} from "../enumMappings";
import { ModalPicker } from "../../components/ModalPicker";
import { ERROR_BORDER_WIDTH } from "../commonConsts";
import { isEqualLowerCase } from "../utils";
import { DEFAULT_BORDER_RADIUS, eStyles } from "../../commonStyles";

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
      <View style={{ flex: 2.2 }}>
        <TextInput
          onChangeText={(text: string) => {
            updateCallback({ name: text });
          }}
          style={[
            styles.ingredientNameInput,
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
      <View style={{ flex: 1 }}>
        <TextInput
          onChangeText={(weightStr: string) => {
            const amount = parseFloat(weightStr);
            updateCallback({
              amount: isNaN(amount) ? null : amount,
            });
          }}
          style={[
            styles.ingredientAmountInput,
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
          placeholder="Qty"
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
          getLabel={(unit) => ingredientAmountUnitEnumToDisplayForm(unit)}
          placeholder="Unit"
          pressableStyle={{
            ...styles.ingredientPickerContainer,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
          pressableTextStyle={styles.ingredientPickerText}
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

  const handleRemoveActiveIngredient = (elementKey: number) => {
    return () => {
      setActiveIngredientInfos((current) =>
        current.filter((ing) => ing.elementKey !== elementKey),
      );
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
      <ScrollView
        style={eStyles.editMainScrollContainer}
        contentContainerStyle={eStyles.editMainScrollContentContainer}
      >
        <View style={[styles.rowContainer]}>
          <TextInput
            placeholder="Medicine Name"
            placeholderTextColor={theme.colors.textTertiary}
            style={[
              eStyles.pressableTextInput,
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
        <View style={styles.rowContainer}>
          <ModalPicker
            values={Object.values(BaseUnit)}
            selectedValue={baseUnit}
            onValueChange={(value) => {
              setBaseUnit(value);
            }}
            getLabel={baseUnitToUnitSelectionLabel}
            placeholder="Select base unit"
            pressableStyle={eStyles.fullWidthPickerPressable}
            error={baseUnitError}
          />
        </View>

        <View style={styles.rowActiveIngredientsHeader}>
          <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
            {t("Active ingredients per base unit")}
          </Text>
        </View>

        <View>
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

      <View style={[eStyles.footer, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleSave}
          style={[
            eStyles.nextButton,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text style={eStyles.nextButtonText}>
            {mode === "save-and-go-back" ? "Save" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}

const ING_HEIGHT: number = 50;
const ING_FONT_SIZE: number = 17;

const styles = StyleSheet.create({
  rowContainer: {
    marginBottom: 28,
  },
  rowActiveIngredientsHeader: {
    marginBottom: 12,
  },
  ingredientRow: {
    height: ING_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  ingredientNameInput: {
    height: ING_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: 8,
    fontSize: ING_FONT_SIZE,
    width: "100%",
  },
  ingredientAmountInput: {
    height: ING_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: 8,
    fontSize: ING_FONT_SIZE,
    width: "100%",
    textAlign: "right",
  },
  ingredientPickerContainer: {
    height: ING_HEIGHT,
    borderWidth: 1,
    borderRadius: DEFAULT_BORDER_RADIUS,
    paddingHorizontal: 10,
  },
  ingredientPickerText: {
    fontSize: ING_FONT_SIZE,
  },
  removeButton: {
    width: 20,
    height: ING_HEIGHT,
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
    borderRadius: DEFAULT_BORDER_RADIUS,
    borderStyle: "dashed",
    alignItems: "center",
    marginRight: 30,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
