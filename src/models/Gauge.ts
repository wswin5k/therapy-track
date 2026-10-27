export class GaugeRecord {
  constructor(
    public dbId: number,
    public updatedAt: Date,
    // date and gaugeId uniquely identify a record
    public gaugeId: number,
    public date: Date,
    public value: number | null,
  ) {}
}

export enum OperationNumber {
  Average = "Average",
  Total = "Total",
  Minimum = "Minimum",
  Maximum = "Maximum",
  PercentNotZero = "PecentNotZero",
}

export enum OperationBoolean {
  PercentTrue = "PercentTrue",
  PercentFalse = "PercentFalse",
}

export type OperationAny = OperationNumber | OperationBoolean;

export enum EmptyTreatment {
  ZeroFill = "ZeroFill",
  Omit = "Omit",
}

export class Gauge {
  constructor(
    public dbId: number,
    public createdAt: Date,
    public sourceColumn: Metric,
    public operation: OperationNumber | OperationBoolean,
    public emptyTreatment: EmptyTreatment,
    public lengthInDays: number,
    public precision: number,
  ) {}
}
export enum SourceType {
  AssessmentNumeric = "AssessmentNumeric",
  AssessmentBoolean = "AssessmentBoolean",
  Medicine = "Medicine",
  ActiveIngredientWithForm = "ActiveIngredientWithForm",
  ActiveIngredientWithoutForm = "ActiveIngredientWithoutForm",
}

export class Metric {
  constructor(
    public label: string,
    public sourceType: SourceType,
    public sourceIds: number[],
  ) {}
}
