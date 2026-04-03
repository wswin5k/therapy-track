import { Frequency } from "./Frequency";

const TEXT_MAX_LENGTH = 1000;

export enum AssessmentType {
  Numeric = "Numeric",
  Boolean = "Boolean",
  Text = "Text",
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
  | NumericValueDomain
  | SelectValueDomain
  | TextValueDomain
  | null;

export function getDefaultValueDomain(
  type: AssessmentType,
): ValueDomain | null {
  switch (type) {
    case AssessmentType.Text:
      return new TextValueDomain(TEXT_MAX_LENGTH);
    case AssessmentType.Numeric:
      return new NumericValueDomain(-Infinity, +Infinity);
    default:
      return null;
  }
}

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
