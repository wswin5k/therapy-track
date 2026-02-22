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
  NAME_MAX_LENGHT,
  Medicine,
} from "../../models/Medicine";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { dbUpdateMedicine } from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { DropdownPicker } from "../../components/DropdownPicker";

class ActiveIngredientInfo {
  name: string | null;
  amount: number | null;
  unit: IngredientAmountUnit | null;
  elementKey: number;

  constructor(
    elementKey: number,
    name: string | null = null,
    amount: number | null = null,
    unit: IngredientAmountUnit | null = null,
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
  removeButton: boolean;
  errors?: { name?: boolean; weight?: boolean };
  theme: ReactNavigation.Theme;
};

function ActiveIngredientRow({
  activeIngredientInfo,
  removeCallback,
  removeButton,
  errors,
  theme,
}: ActiveIngedientRowProps) {
  const handleRemove = () => {
    removeCallback();
  };

  React.useEffect(() => {
    activeIngredientInfo.unit = IngredientAmountUnit.Miligram;
  }, [activeIngredientInfo]);

  return (
    <View style={styles.ingredientRow}>
      <View style={{ flex: 2 }}>
        <TextInput
          onChangeText={(text: string) => {
            activeIngredientInfo.name = text;
          }}
          style={[
            styles.ingredientInput,
            {
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
            },
            errors?.name
              ? { borderColor: theme.colors.error, borderWidth: 1 }
              : {},
          ]}
          placeholder="Name"
          placeholderTextColor={theme.colors.textTertiary}
          value={activeIngredientInfo.name ?? ""}
        />
      </View>
      <View style={{ flex: 1.2 }}>
        <TextInput
          onChangeText={(weightStr: string) => {
            activeIngredientInfo.amount = parseFloat(weightStr);
          }}
          style={[
            styles.ingredientInput,
            {
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
            },
            errors?.weight
              ? { borderColor: theme.colors.error, borderWidth: 1 }
              : {},
          ]}
          placeholder="Amount"
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType="numeric"
          defaultValue={
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
            activeIngredientInfo.unit ?? IngredientAmountUnit.Miligram
          }
          onValueChange={(unit: IngredientAmountUnit) => {
            activeIngredientInfo.unit = unit;
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
          <Text
            style={[styles.removeButtonText, { color: theme.colors.error }]}
          >
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

  const [name, setName] = React.useState("");
  const [baseUnit, setBaseUnit] = React.useState<BaseUnit | null>(null);

  const [nameError, setNameError] = React.useState(false);
  const [baseUnitError, setBaseUnitError] = React.useState(false);
  const [ingredientErrors, setIngredientErrors] = React.useState<
    Record<number, { name?: boolean; weight?: boolean }>
  >({});

  const [nActiveIngredients, setNActiveIngredients] = React.useState<number>(1);
  const elementKeyCounter = React.useRef<number>(nActiveIngredients);
  const activeIngredientsRefs = React.useRef(
    Array.from(
      { length: nActiveIngredients },
      (_, idx) => new ActiveIngredientInfo(idx),
    ),
  );

  const [mode, setMode] = React.useState<
    "save-and-go-back" | "schedule" | "one-time"
  >("save-and-go-back");

  useFocusEffect(
    React.useCallback(() => {
      const params = route.params as {
        mode: "save-and-go-back" | "schedule" | "one-time";
        medicine: Medicine;
      };
      setMode(params.mode);
      const mInit = params.medicine;
      if (mInit) {
        setName(mInit.name);

        setBaseUnit(mInit.baseUnit);

        activeIngredientsRefs.current = mInit.activeIngredients.map(
          (ai, idx) =>
            new ActiveIngredientInfo(idx, ai.name, ai.amount, ai.unit),
        );
        setNActiveIngredients(mInit.activeIngredients.length);
      }
    }, [route.params]),
  );

  const validate = (): MedicineValidated | null => {
    let medicineValidated = true;

    if (name.trim() && name.length < NAME_MAX_LENGHT) {
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
    activeIngredientsRefs.current.forEach((ingredient) => {
      const errors: { name?: boolean; weight?: boolean } = {};
      if (!ingredient.name || !ingredient.name.trim()) {
        errors.name = true;
        medicineValidated = false;
      }
      if (ingredient.amount === null || isNaN(ingredient.amount)) {
        errors.weight = true;
        medicineValidated = false;
      }

      if (Object.keys(errors).length > 0) {
        newIngredientErrors[ingredient.elementKey] = errors;
      }
    });
    setIngredientErrors(newIngredientErrors);
    if (Object.keys(newIngredientErrors).length === 0) {
      activeIngredients = activeIngredientsRefs.current
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
    const medicineValidated = validate();
    if (!medicineValidated) {
      return;
    }

    if (mode === "schedule") {
      navigation.navigate("EditScheduleScreen", {
        medicine: medicineValidated,
      });
    } else if (mode === "save-and-go-back") {
      dbUpdateMedicine(db, { dbId: 1, ...medicineValidated });
      navigation.goBack();
    } else {
      // mode === "one-time"
      navigation.navigate("EditSingleDosageScreen", {
        medicine: medicineValidated,
      });
    }
  };

  const handleAddActiveIngredient = () => {
    activeIngredientsRefs.current.push(
      new ActiveIngredientInfo(elementKeyCounter.current),
    );
    elementKeyCounter.current += 1;
    setNActiveIngredients(nActiveIngredients + 1);
  };

  const removeActiveIngredient = (idx: number) => {
    return () => {
      activeIngredientsRefs.current.splice(idx, 1);
      setNActiveIngredients(nActiveIngredients - 1);
    };
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
                ? { borderColor: theme.colors.error, borderWidth: 1 }
                : {},
            ]}
            onChangeText={(text: string) => {
              setName(text);
            }}
            value={name}
          />
        </View>
        <View
          style={[
            styles.fullWidthPickerContainer,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
            baseUnitError
              ? { borderColor: theme.colors.error, borderWidth: 1 }
              : {},
          ]}
        >
          <Picker
            selectedValue={baseUnit}
            onValueChange={(itemValue) => {
              setBaseUnit(itemValue);
            }}
            style={[styles.picker, { color: theme.colors.text }]}
            dropdownIconColor={theme.colors.text}
          >
            <Picker.Item
              label="Select base unit"
              value=""
              color={theme.colors.textTertiary}
            />
            {Object.values(BaseUnit).map((unit) => (
              <Picker.Item
                key={unit}
                label={unit}
                value={unit}
                style={styles.pickerItem}
                color={theme.colors.text}
              />
            ))}
          </Picker>
        </View>

        <Text
          style={[
            styles.headerLabel,
            { marginTop: 20, color: theme.colors.text },
          ]}
        >
          {t("Active ingredients per base unit")}
        </Text>

        <View style={styles.ingredientsList}>
          {Array.from({ length: nActiveIngredients }, (_, idx) => (
            <ActiveIngredientRow
              key={activeIngredientsRefs.current[idx].elementKey}
              activeIngredientInfo={activeIngredientsRefs.current[idx]}
              removeCallback={removeActiveIngredient(idx)}
              removeButton={nActiveIngredients === 1 ? false : true}
              errors={
                ingredientErrors[activeIngredientsRefs.current[idx].elementKey]
              }
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
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
});
