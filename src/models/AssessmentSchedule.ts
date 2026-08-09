import { Frequency } from "./Frequency";

export enum AssessmentType {
  Numeric = "Numeric",
  Boolean = "Boolean",
  Text = "Text",
  SingleSelect = "SingleSelect",
  MultiSelect = "MultiSelect",
}

export class NumericValueDomain {
  constructor(
    public min: number,
    public max: number,
  ) {}
}

export class TextValueDomain {
  constructor(public max_characters: number) {}
}

export class SelectValueDomain {
  constructor(public values: string[]) {}
}

export type ValueDomain =
  NumericValueDomain | SelectValueDomain | TextValueDomain | null;

export class Assessment {
  constructor(
    public name: string,
    public type: AssessmentType,
    public valueDomain: ValueDomain,
    public dbId: number,
  ) {}
}

export class Measurment {
  constructor(
    public index: number,
    public offset: number | null,
    public groupId: number | null,
    public dbId: number,
  ) {}
}

export class AssessmentSchedule {
  constructor(
    public assessment: Assessment,
    public startDate: Date,
    public endDate: Date | null,
    public freq: Frequency,
    public measurments: Measurment[],
    public dbId: number,
  ) {}
}
