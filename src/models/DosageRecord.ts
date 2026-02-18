export class ScheduledDosageRecord {
  dbId: number;
  record_date: Date;
  date: Date;
  scheduleId: number;
  doseIndex: number;

  constructor(
    dbId: number,
    record_date: Date,
    date: Date,
    scheduleId: number,
    doseIndex: number,
  ) {
    this.dbId = dbId;
    this.record_date = record_date;
    this.date = date;
    this.scheduleId = scheduleId;
    this.doseIndex = doseIndex;
  }
}

export class UnscheduledDosageRecord {
  dbId: number;
  record_date: Date;
  date: Date;
  medicineId: number;
  amount: number;
  groupId: number | null;

  constructor(
    dbId: number,
    record_date: Date,
    date: Date,
    medicineId: number,
    amount: number,
    groupId: number | null,
  ) {
    this.dbId = dbId;
    this.record_date = record_date;
    this.date = date;
    this.medicineId = medicineId;
    this.amount = amount;
    this.groupId = groupId;
  }
}
