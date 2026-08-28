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

export function strKeyOfBaseUnit(x: BaseUnit) {
  return Object.keys(BaseUnit)[Object.values(BaseUnit).indexOf(x)];
}

export enum IngredientAmountUnit {
  Milligram = "mg",
  Gram = "g",
  Microgram = "µg",
  InternationalUnit = "IU",
  Unit = "unit",
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
  dbId: number;

  constructor(
    name: string,
    baseUnit: BaseUnit,
    activeIngredients: ActiveIngredient[],
    dbId: number,
  ) {
    this.name = name;
    this.baseUnit = baseUnit;
    this.activeIngredients = activeIngredients;
    this.dbId = dbId;
  }

  activeIngredientsString(): string[] {
    return this.activeIngredients.map(
      (ai) => `${ai.name} ${ai.amount}${ai.unit}`,
    );
  }
}

export class Dosage {
  amount: number;
  index: number;
  offset: number | null;
  groupId: number | null;
  dbId: number;

  constructor(
    amount: number,
    index: number,
    offset: number | null,
    groupId: number | null = null,
    dbId: number,
  ) {
    this.amount = amount;
    this.index = index;
    this.offset = offset;
    this.groupId = groupId;
    this.dbId = dbId;
  }
}

export class MedicineSchedule {
  medicine: Medicine;
  startDate: Date;
  endDate: Date | null;
  freq: Frequency;
  dosages: Dosage[];
  dbId: number;

  constructor(
    medicine: Medicine,
    startDate: Date,
    endDate: Date | null,
    freq: Frequency,
    dosages: Dosage[],
    dbId: number,
  ) {
    this.medicine = medicine;
    this.startDate = startDate;
    this.endDate = endDate;
    this.freq = freq;
    this.dosages = dosages;
    this.dbId = dbId;
  }
}
