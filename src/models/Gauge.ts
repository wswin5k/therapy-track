import { Column } from "./dbColumnService";

export class GaugeRecord {
  constructor(
    public dbId: number,
    // date and gaugeId uniquely identify a record
    public date: Date,
    public gaugeId: number,
    public value: number,
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
    public sourceColumn: Column,
    public operation: OperationNumber | OperationBoolean,
    public emptyTreatment: EmptyTreatment,
    public lengthInDays: number,
    public precision: number,
  ) {}
}
