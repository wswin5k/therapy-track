import { SelectValueDomain, ValueDomain } from "./AssessmentSchedule";

export class ScheduledDosageRecord {
  constructor(
    public dbId: number,
    public record_datetime: Date,
    public date: Date,
    public medicineScheduleId: number,
    public dosageIndex: number,
  ) {}
}

export class UnscheduledDosageRecord {
  constructor(
    public dbId: number,
    public record_datetime: Date,
    public date: Date,
    public medicineId: number,
    public amount: number,
    public groupId: number | null,
  ) {}
}

export type AssessmentValue = number | string | boolean | string[];

export function sortArrayMeasurementValue(
  value: AssessmentValue,
  valueDomain: ValueDomain,
) {
  // consider using a map
  if (Array.isArray(value) && valueDomain instanceof SelectValueDomain) {
    value.sort(
      (a, b) => valueDomain.values.indexOf(a) - valueDomain.values.indexOf(b),
    );
  }
}

export class ScheduledMeasurementRecord {
  constructor(
    public dbId: number,
    public record_datetime: Date,
    public date: Date,
    public assessmentScheduleId: number,
    public measurementIndex: number,
    public value: AssessmentValue,
  ) {}
}

export class UnscheduledMeasurementRecord {
  constructor(
    public dbId: number,
    public record_datetime: Date,
    public date: Date,
    public assessmentId: number,
    public value: AssessmentValue,
    public groupId: number | null,
  ) {}
}
