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
import { useRoute, useNavigation, useTheme } from "@react-navigation/native";
import type { RootStackParamList } from "../index";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BaseUnit,
  IngredientAmountUnit,
  ActiveIngredient,
  NAME_MAX_LENGHT,
} from "../../models/Medicine";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";

class ActiveIngedientInfo {
  name: string | null;
  weight: number | null;
  unit: IngredientAmountUnit | null;
  elementKey: number;

  constructor(
    elementKey: number,
    name: string | null = null,
    weight: number | null = null,
    unit: IngredientAmountUnit | null = null,
  ) {
    this.elementKey = elementKey;
    this.name = name;
    this.weight = weight;
    this.unit = unit;
  }
}

type ActiveIngedientRowProps = {
  activeIngredientInfo: ActiveIngedientInfo;
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
  const [name, setName] = React.useState<string>(
    activeIngredientInfo.name ? activeIngredientInfo.name : "",
  );

  const handleRemove = () => {
    removeCallback();
  };

  React.useEffect(() => {
    activeIngredientInfo.unit = IngredientAmountUnit.Miligram;
  }, []);

  return (
    <View style={styles.ingredientRow}>
      <View style={{ flex: 2 }}>
        <TextInput
          onChangeText={(text: string) => {
            activeIngredientInfo.name = text;
            setName(text);
          }}
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
            errors?.name
              ? { borderColor: theme.colors.error, borderWidth: 1 }
              : {},
          ]}
          placeholder="Name"
          placeholderTextColor={theme.colors.textTertiary}
          value={name}
        />
      </View>
      <View style={{ flex: 1.2 }}>
        <TextInput
          onChangeText={(weightStr: string) => {
            activeIngredientInfo.weight = parseFloat(weightStr);
          }}
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
            errors?.weight
              ? { borderColor: theme.colors.error, borderWidth: 1 }
              : {},
          ]}
          placeholder="Amount"
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType="numeric"
          defaultValue={
            activeIngredientInfo.weight
              ? activeIngredientInfo.weight.toString()
              : ""
          }
        />
      </View>
      <View
        style={[
          styles.pickerContainer,
          { flex: 1.2 },
          { borderColor: theme.colors.border },
        ]}
      >
        <Picker
          onValueChange={(unit: IngredientAmountUnit) => {
            activeIngredientInfo.unit = unit;
          }}
          style={[styles.picker, { color: theme.colors.text }]}
          dropdownIconColor={theme.colors.text}
        >
          {Object.values(IngredientAmountUnit).map((unit) => (
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
  const { t, i18n } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation<EditMedicineScreenNavigationProp>();

  const theme = useTheme();

  const [name, setName] = React.useState("");
  const [baseUnit, setBaseUnit] = React.useState<BaseUnit | null>(null);

  // Validation State
  const [nameError, setNameError] = React.useState(false);
  const [baseUnitError, setBaseUnitError] = React.useState(false);
  const [ingredientErrors, setIngredientErrors] = React.useState<
    Record<number, { name?: boolean; weight?: boolean }>
  >({});
  const mode = (route.params as { mode?: "schedule" | "one-time" })?.mode;

  const [nActiveIngredients, setNActiveIngredients] = React.useState<number>(1);
  const elementKeyCounter = React.useRef<number>(nActiveIngredients);
  const activeIngredientsRefs = React.useRef(
    Array.from(
      { length: nActiveIngredients },
      (_, idx) => new ActiveIngedientInfo(idx),
    ),
  );

  const validate = (): MedicineValidated | null => {
    let medicineValidated = null;

    if (name.trim() && name.length < NAME_MAX_LENGHT) {
      setNameError(false);

      if (baseUnit) {
        setBaseUnitError(false);

        const newIngredientErrors: Record<
          number,
          { name?: boolean; weight?: boolean }
        > = {};
        activeIngredientsRefs.current.forEach((ingredient) => {
          const errors: { name?: boolean; weight?: boolean } = {};
          if (!ingredient.name || !ingredient.name.trim()) {
            errors.name = true;
            medicineValidated = null;
          }
          if (ingredient.weight === null || isNaN(ingredient.weight)) {
            errors.weight = true;
            medicineValidated = null;
          }

          if (Object.keys(errors).length > 0) {
            newIngredientErrors[ingredient.elementKey] = errors;
          }
        });
        setIngredientErrors(newIngredientErrors);
        if (Object.keys(newIngredientErrors).length === 0) {
          const activeIngredients = activeIngredientsRefs.current
            .filter((ing) => ing.name && ing.weight && ing.unit)
            .map(
              (ing) => new ActiveIngredient(ing.name!, ing.weight!, ing.unit!),
            );

          return {
            name,
            baseUnit,
            activeIngredients,
          };
        } else {
          medicineValidated = null;
        }
      } else {
        setBaseUnitError(true);
        medicineValidated = null;
      }
    } else {
      setNameError(true);
      medicineValidated = null;
    }
    return medicineValidated;
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
    }
    // If mode is "one-time", we'll handle it later (do nothing for now)
  };

  const handleAddActiveIngredient = () => {
    activeIngredientsRefs.current.push(
      new ActiveIngedientInfo(elementKeyCounter.current),
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
        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("Medicine Name")}
        </Text>
        <TextInput
          placeholder="e.g. Ibuprofen"
          placeholderTextColor={theme.colors.textTertiary}
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
            nameError
              ? { borderColor: theme.colors.error, borderWidth: 1 }
              : {},
          ]}
          onChangeText={(text: string) => {
            setName(text);
            if (nameError) setNameError(false);
          }}
        />
        {nameError && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {t("Medicine name is required")}
          </Text>
        )}

        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("Base Unit")}
        </Text>
        <View
          style={[
            styles.fullWidthPickerContainer,
            { borderColor: theme.colors.border },
            baseUnitError
              ? { borderColor: theme.colors.error, borderWidth: 1 }
              : {},
          ]}
        >
          <Picker
            selectedValue={baseUnit}
            onValueChange={(itemValue) => {
              setBaseUnit(itemValue);
              if (baseUnitError) setBaseUnitError(false);
            }}
            style={[styles.picker, { color: theme.colors.text }]}
            dropdownIconColor={theme.colors.text}
          >
            <Picker.Item
              label="Select an option"
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
        {baseUnitError && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {t("Base unit is required")}
          </Text>
        )}

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
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
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
