export class DosageRecord {
  date: Date;
  doseIndex: number;
  dbId: number;
  scheduleId: number;

  constructor(date: Date, doseIndex: number, dbId: number, scheduleId: number) {
    this.scheduleId = scheduleId;
    this.date = date;
    this.doseIndex = doseIndex;
    this.dbId = dbId;
  }
}
