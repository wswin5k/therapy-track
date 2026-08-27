export class ScheduledDosageRecord {
  constructor(
    public dbId: number,
    public record_date: Date,
    public date: Date,
    public medicineScheduleId: number,
    public dosageIndex: number,
  ) {}
}

export class UnscheduledDosageRecord {
  constructor(
    public dbId: number,
    public record_date: Date,
    public date: Date,
    public medicineId: number,
    public amount: number,
    public groupId: number | null,
  ) {}
}

export type AssessmentValue = number | string | boolean | string[];

export class ScheduledMeasurmentRecord {
  constructor(
    public dbId: number,
    public record_date: Date,
    public date: Date,
    public assessmentScheduleId: number,
    public measurmentIndex: number,
    public value: AssessmentValue,
  ) {}
}

export class UnscheduledMeasurmentRecord {
  constructor(
    public dbId: number,
    public record_date: Date,
    public date: Date,
    public assessmentId: number,
    public value: AssessmentValue,
    public groupId: number | null,
  ) {}
}
