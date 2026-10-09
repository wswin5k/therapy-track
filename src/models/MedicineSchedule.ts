import {
  baseUnitShorFormPlural,
  ingredientAmountUnitEnumToDisplayForm,
} from "../navigation/enumMappings";
import { Frequency } from "./Frequency";

export enum BaseUnit {
  Tablet = "Tablet",
  Capsule = "Capsule",
  Ml = "Ml",
  Teaspoon = "Teaspoon",
  InjectionPen = "InjectionPen",
  Drop = "Drop",
  Sachet = "Sachet",
  PressOfADosingPump = "PressOfADosingPump",
  Vial = "Vial",
  PreFilledSyringe = "PreFilledSyringe",
  Gram = "Gram",
  Suppository = "Suppository",
  Gummy = "Gummy",
  Dose = "Dose",
}

export enum IngredientAmountUnit {
  Milligram = "Milligram",
  Gram = "Gram",
  Microgram = "Microgram",
  InternationalUnit = "InternationalUnit",
  Unit = "Unit",
}

export function weightUnitToGramsMultiplier(
  unit: IngredientAmountUnit,
): number {
  switch (unit) {
    case IngredientAmountUnit.Gram:
      return 1_000_000;
    case IngredientAmountUnit.Milligram:
      return 1_000;
    case IngredientAmountUnit.Microgram:
      return 1;
    default:
      throw Error(`${unit} is not a weight unit.`);
  }
}

export function isWeightUnit(unit: IngredientAmountUnit): boolean {
  return [
    IngredientAmountUnit.Gram,
    IngredientAmountUnit.Milligram,
    IngredientAmountUnit.Microgram,
  ].includes(unit);
}

export function maxWeightUnit(
  units: IngredientAmountUnit[],
): IngredientAmountUnit {
  return [...units].sort(
    (a, b) => weightUnitToGramsMultiplier(b) - weightUnitToGramsMultiplier(a),
  )[0];
}

export class ActiveIngredient {
  constructor(
    public name: string,
    public amount: number,
    public unit: IngredientAmountUnit,
  ) {}

  getLabel(baseUnitLabel: string): string {
    const aiUnitDisplay = ingredientAmountUnitEnumToDisplayForm(this.unit);
    return `${this.name} – ${baseUnitLabel} [${aiUnitDisplay}]`;
  }
  getShortLabel(): string {
    const aiUnitDisplay = ingredientAmountUnitEnumToDisplayForm(this.unit);
    return `${this.name} [${aiUnitDisplay}]`;
  }
  getLabelWithoutUnit(baseUnitLabel: string): string {
    return `${this.name} – ${baseUnitLabel}`;
  }
  getShortLabelWithoutUnit(): string {
    return `${this.name}`;
  }
}

export class Medicine {
  constructor(
    public name: string,
    public baseUnit: BaseUnit,
    public activeIngredients: ActiveIngredient[],
    public createdAt: Date,
    public dbId: number,
  ) {}

  activeIngredientsString(): string[] {
    return this.activeIngredients.map(
      (ai) =>
        `${ai.name} ${ai.amount}${ingredientAmountUnitEnumToDisplayForm(ai.unit)}`,
    );
  }

  getLabel(): string {
    const baseUnitLabel = baseUnitShorFormPlural(this.baseUnit);
    return `${this.name} [${baseUnitLabel}]`;
  }
}

export class Dosage {
  constructor(
    public amount: number,
    public index: number,
    public offset: number,
    public groupId: number | null = null,
    public dbId: number,
  ) {}
}

export class MedicineSchedule {
  constructor(
    public medicine: Medicine,
    public startDate: Date,
    public endDate: Date | null,
    public freq: Frequency,
    public dosages: Dosage[],
    public createdAt: Date,
    public dbId: number,
  ) {}
}
