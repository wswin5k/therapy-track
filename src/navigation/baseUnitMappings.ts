import i18next from "i18next";
import { BaseUnit } from "../models/Medicine";

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
  Unit: "unit",
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
  Unit: "unit",
};

export function baseUnitToUnitSelectionLabel(key: BaseUnit) {
  return capitalizeFirstLetter(baseUnitToSingularLongForm[key]);
}

export function baseUnitToDoseHeader(key: BaseUnit): string {
  return capitalizeFirstLetter(
    i18next.t(baseUnitToSingularShortForm[key], { count: 2 }),
  );
}
