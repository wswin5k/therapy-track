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

export enum IngredientAmountUnit {
  Miligram = "mg",
  Gram = "g",
  Microgram = "µg",
  InternationalUnit = "IU",
}

export class ActiveIngredient {
  name: string;
  amount: number;
  unit: IngredientAmountUnit;

  constructor(name: string, amount: number, unit: IngredientAmountUnit) {
    this.name = name;
    this.amount = amount;
    this.unit = unit;
  }
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

  toString(): string {
    return `${this.name} ${this.baseUnit}`;
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
