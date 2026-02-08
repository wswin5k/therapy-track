export enum BaseUnit {
  Pill = "pill",
  Ml = "ml",
  Teaspoonfull = "teaspoonfull (5ml)",
  Drop = "drop",
  InjectioPen = "injection pen",
  Sachet = "sachet",
  PressOfTheDosingPump = "press of a dosing pump",
  Vial = "vial",
  PreFilledSyringe = "pre-filled syringe",
}

export function strKeyOfBaseUnit(x: BaseUnit) {
  return Object.keys(BaseUnit)[Object.values(BaseUnit).indexOf(x)];
}

export enum IngredientWeight {
  Miligram = "mg",
  Gram = "g",
  Microgram = "µg",
}

export interface ActiveIngredient {
  name: string;
  weight: number;
  unit: IngredientWeight;
}

export class Medicine {
  name: string;
  baseUnit: BaseUnit;
  activeIngredients: ActiveIngredient[];
  medicineId?: number;

  constructor(
    name: string,
    baseUnit: BaseUnit,
    activeIngredients: ActiveIngredient[],
    medicineId?: number,
  ) {
    this.name = name;
    this.baseUnit = baseUnit;
    this.activeIngredients = activeIngredients;
    this.medicineId = medicineId;
  }

  toJSON(): string {
    return JSON.stringify({
      name: this.name,
      baseUnit: this.baseUnit,
      activeIngredients: this.activeIngredients,
      medicineId: this.medicineId,
    });
  }

  static fromJSON(json: string): Medicine {
    const data = JSON.parse(json);
    return new Medicine(
      data.name,
      data.baseUnit,
      data.activeIngredients,
      data.medicineId,
    );
  }
}
