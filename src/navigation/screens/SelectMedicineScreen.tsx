import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useSQLiteContext } from "expo-sqlite";
import { StaticScreenProps } from "@react-navigation/native";
import {
  SafeAreaView,
} from 'react-native-safe-area-context';


class Amount {
  value: number = 0;
  unit: string = "";
  // weight: mg, g, ...?
  // piece: pill, pen, syringe
}

class MedicineEntry {
  brandName: string;
  genericName: string;
  doseWeight: Amount;
  dosePiece: Amount;

  constructor(
    brandName: string,
    genericName: string,
    doseWeight: Amount,
    dosePiece: Amount,
  ) {
    this.brandName = brandName;
    this.genericName = genericName;
    this.doseWeight = doseWeight;
    this.dosePiece = dosePiece;
  }
}

enum BaseUnit {
  Pill = "pill",
  Ml = "ml",
  Teaspoonfull = "teaspoonfull (5ml)",
  Drop = "drop",
  InjectioPen = "injection pen",
  Sachet = "sachet",
  PressOfTheDosingPump = "press of the dosing pump",
  Vial = "vial",
  PreFilledSyringe = "pre-filled syringe",
}

enum IngredientWeight {
  Miligram = "mg",
  Gram = "g",
  Microgram = "µg",
}

class ActiveIngedientInfo {
  name: string | null;
  weight: number | null;
  unit: IngredientWeight | null;
  elementKey: number;

  constructor(
    elementKey: number,
    name: string | null = null,
    weight: number | null = null,
    unit: IngredientWeight | null = null,
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
};

function ActiveIngredientRow({
  activeIngredientInfo,
  removeCallback,
  removeButton,
  errors,
}: ActiveIngedientRowProps) {
  const [name, setName] = React.useState<string>(
    activeIngredientInfo.name ? activeIngredientInfo.name : "",
  );

  const handleRemove = () => {
    removeCallback();
  };

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
            errors?.name ? { borderColor: "red", borderWidth: 1 } : {},
          ]}
          placeholder="Name"
          placeholderTextColor="#999"
          value={name}
        />
      </View>
      <View style={{ flex: 1 }}>
        <TextInput
          onChangeText={(weightStr: string) => {
            activeIngredientInfo.weight = parseFloat(weightStr);
          }}
          style={[
            styles.input,
            errors?.weight ? { borderColor: "red", borderWidth: 1 } : {},
          ]}
          placeholder="Weight"
          placeholderTextColor="#999"
          keyboardType="numeric"
          defaultValue={
            activeIngredientInfo.weight
              ? activeIngredientInfo.weight.toString()
              : ""
          }
        />
      </View>
      <View style={styles.pickerContainer}>
        <Picker
          onValueChange={(unit: string) => {
            activeIngredientInfo.unit = IngredientWeight.Gram;
          }}
          style={styles.picker}
        >
          {Object.values(IngredientWeight).map((unit) => (
            <Picker.Item
              key={unit}
              label={unit}
              value={unit}
              style={styles.pickerItem}
            />
          ))}
        </Picker>
      </View>
      {removeButton ? (
        <TouchableOpacity onPress={handleRemove} style={styles.removeButton}>
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.removeButtonPlaceholder} />
      )}
    </View>
  );
}

type SelectMedicineScreenProps = StaticScreenProps<{
  nextScreen?: string;
}>;

export function SelectMedicineScreen({ route }: SelectMedicineScreenProps) {
  const { t, i18n } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nextScreen = route.params?.nextScreen;

  const [name, setName] = React.useState("");
  const [baseUnit, setBaseUnit] = React.useState<string>("");

  // Validation State
  const [nameError, setNameError] = React.useState(false);
  const [baseUnitError, setBaseUnitError] = React.useState(false);
  const [ingredientErrors, setIngredientErrors] = React.useState<
    Record<number, { name?: boolean; weight?: boolean }>
  >({});

  const db = useSQLiteContext();

  React.useEffect(() => {
    async function setup() {
      const result = await db.getFirstAsync<{
        name: string;
        active_ingredients: string;
      }>("SELECT * FROM medicines;");
      if (result) {
      }
      console.log("fetched medicines: ", result?.name);
    }
    setup();
  }, []);

  const [nActiveIngredients, setNActiveIngredients] = React.useState<number>(1);
  const elementKeyCounter = React.useRef<number>(nActiveIngredients);
  const activeIngredientsRefs = React.useRef(
    Array.from(
      { length: nActiveIngredients },
      (_, idx) => new ActiveIngedientInfo(idx),
    ),
  );

  const validate = () => {
    let isValid = true;
    const newIngredientErrors: Record<
      number,
      { name?: boolean; weight?: boolean }
    > = {};

    if (!name.trim() && name.trim().length < 50) {
      setNameError(true);
      isValid = false;
    } else {
      setNameError(false);
    }

    if (!baseUnit) {
      setBaseUnitError(true);
      isValid = false;
    } else {
      setBaseUnitError(false);
    }

    // Validate Ingredients
    activeIngredientsRefs.current.forEach((ingredient) => {
      const errors: { name?: boolean; weight?: boolean } = {};
      if (!ingredient.name || !ingredient.name.trim()) {
        errors.name = true;
        isValid = false;
      }
      if (ingredient.weight === null || isNaN(ingredient.weight)) {
        errors.weight = true;
        isValid = false;
      }

      if (Object.keys(errors).length > 0) {
        newIngredientErrors[ingredient.elementKey] = errors;
      }
    });

    setIngredientErrors(newIngredientErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    console.log(activeIngredientsRefs.current);
    const activeIngredientsStr = JSON.stringify(activeIngredientsRefs.current);
    const result = await db.runAsync(
      "INSERT INTO medicines (name, active_ingredients) VALUES (?, ?)",
      name,
      activeIngredientsStr,
    );
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
      console.log("removing", idx, ": ", activeIngredientsRefs.current[idx]);
      activeIngredientsRefs.current.splice(idx, 1);
      setNActiveIngredients(nActiveIngredients - 1);
    };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.headerLabel}>{t("Medicine Name")}</Text>
        <TextInput
          placeholder="e.g. Ibuprofen"
          placeholderTextColor="#999"
          style={[
            styles.input,
            nameError ? { borderColor: "red", borderWidth: 1 } : {},
          ]}
          onChangeText={(text: string) => {
            setName(text);
            if (nameError) setNameError(false);
          }}
        />
        {nameError && (
          <Text style={styles.errorText}>{t("Medicine name is required")}</Text>
        )}

        <Text style={styles.headerLabel}>{t("Base Unit")}</Text>
        <View
          style={[
            styles.fullWidthPickerContainer,
            baseUnitError ? { borderColor: "red", borderWidth: 1 } : {},
          ]}
        >
          <Picker
            selectedValue={baseUnit}
            onValueChange={(itemValue) => {
              setBaseUnit(itemValue);
              if (baseUnitError) setBaseUnitError(false);
            }}
            style={styles.picker}
          >
            <Picker.Item label="Select an option" value="" color="#999" />
            {Object.values(BaseUnit).map((unit) => (
              <Picker.Item
                key={unit}
                label={unit}
                value={unit}
                style={styles.pickerItem}
              />
            ))}
          </Picker>
        </View>
        {baseUnitError && (
          <Text style={styles.errorText}>{t("Base unit is required")}</Text>
        )}

        <Text style={[styles.headerLabel, { marginTop: 20 }]}>
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
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleAddActiveIngredient}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+ Add Ingredient</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSave} style={styles.nextButton}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100, // Space for footer
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    height: 50,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#333",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  ingredientsList: {
    marginBottom: 15,
  },
  pickerContainer: {
    flex: 1.2,
    height: 50,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    justifyContent: "center",
  },
  fullWidthPickerContainer: {
    height: 50,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 5,
  },
  picker: {
    width: "100%",
    height: 50,
  },
  pickerItem: {
    fontSize: 16,
  },
  removeButton: {
    width: 30,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonPlaceholder: {
    width: 30,
  },
  removeButtonText: {
    fontSize: 20,
    color: "#ff3b30",
    fontWeight: "bold",
  },
  addButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    borderStyle: "dashed",
    alignItems: "center",
    marginTop: 5,
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
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
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
});
