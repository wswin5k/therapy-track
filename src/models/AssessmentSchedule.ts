import { Frequency } from "./Frequency";

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
  | TextValueDomain;

export class Assessment {
  constructor(
    public name: string,
    public type: AssessmentType,
    public value_domain: ValueDomain | null,
    public dbId: number,
  ) {}
}

class AssessmentInstance {
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
    public instances: AssessmentInstance[],
    public dbId: number,
  ) {}
}
