export class ScheduledDosageRecord {
  constructor(
    public dbId: number,
    public record_date: Date,
    public date: Date,
    public scheduleId: number,
    public doseIndex: number,
  ) {}
}

export class UnscheduledDosageRecord {
  constructor(
    public dbId: number,
    public ecord_date: Date,
    public date: Date,
    public medicineId: number,
    public amount: number,
    public groupId: number | null,
  ) {}
}

export class ScheduledAssessmentRecord {
  constructor(
    public dbId: number,
    public record_date: Date,
    public date: Date,
    public assessmentScheduleId: number,
    public instanceIndex: number,
    public value: string | number,
  ) {}
}

export class UnscheduledAssessmentRecord {
  constructor(
    public dbId: number,
    public ecord_date: Date,
    public date: Date,
    public assessmentId: number,
    public value: string | number,
    public groupId: number | null,
  ) {}
}
