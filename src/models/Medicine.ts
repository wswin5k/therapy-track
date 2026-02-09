export const NAME_MAX_LENGHT: number = 100;

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
