import i18next from "i18next";
import { BaseUnit, IngredientAmountUnit } from "../models/MedicineSchedule";
import { AssessmentType } from "../models/AssessmentSchedule";
import { FrequencySelection } from "../models/Frequency";

function capitalizeFirstLetter(val: string) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export const baseUnitToSingularShortForm: { [key: string]: string } = {
  Tablet: "tablet",
  Capsule: "capsule",
  Ml: "milliliter",
  Teaspoon: "5ml dose",
  Drop: "drop",
  InjectionPen: "injection pen",
  Sachet: "sachet",
  PressOfADosingPump: "press of a dosing pump",
  Vial: "vial",
  PreFilledSyringe: "pre-filled syringe",
  Gram: "gram",
  Suppository: "suppository",
  Gummy: "gummy",
  Dose: "dose",
};

export const baseUnitToSingularLongForm: { [key: string]: string } = {
  Tablet: "tablet",
  Capsule: "capsule",
  Ml: "milliliter (ml)",
  Teaspoon: "5 milliliters (5ml, teaspoon)",
  Drop: "drop",
  InjectionPen: "injection pen",
  Sachet: "sachet",
  PressOfADosingPump: "press of a dosing pump",
  Vial: "vial",
  PreFilledSyringe: "pre-filled syringe",
  Gram: "gram (g)",
  Suppository: "suppository",
  Gummy: "gummy",
  Dose: "dose",
};

export function baseUnitToUnitSelectionLabel(key: BaseUnit) {
  return capitalizeFirstLetter(baseUnitToSingularLongForm[key]);
}

export function baseUnitToDoseHeader(key: BaseUnit): string {
  return capitalizeFirstLetter(
    i18next.t(baseUnitToSingularShortForm[key], { count: 2 }),
  );
}

export function baseUnitShorFormPlural(key: BaseUnit): string {
  return i18next.t(baseUnitToSingularShortForm[key], { count: 2 });
}

export function frequencySelectionToDisplayForm(key: FrequencySelection) {
  const mapping = {
    OnceDaily: "Once daily",
    TwiceDaily: "Twice daily",
    ThriceDaily: "Three times daily",
    OnceWeekly: "Weekly",
    OnceBiweekly: "Every two weeks",
  };
  return mapping[key];
}

export function assessmentTypeToDisplayForm(key: AssessmentType) {
  const mapping = {
    Numeric: "Number",
    Boolean: "Yes/No",
    SingleSelect: "Single select",
    MultiSelect: "Multiple select",
    Text: "Text",
  };
  return mapping[key];
}

export function ingredientAmountUnitEnumToDisplayForm(
  key: IngredientAmountUnit,
) {
  const mapping = {
    Milligram: "mg",
    Gram: "g",
    Microgram: "µg",
    InternationalUnit: "IU",
    Unit: "unit",
  };
  return mapping[key];
}
