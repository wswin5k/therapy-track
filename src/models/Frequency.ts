export enum IntervalUnit {
  day = "day",
  week = "week",
  month = "month",
}

export class Frequency {
  intervalUnit: IntervalUnit;
  intervalLength: number;
  numberOfDosages: number;

  constructor(
    intervalUnit: IntervalUnit,
    intervalLength: number,
    numberOfDosages: number,
  ) {
    this.intervalUnit = intervalUnit;
    this.intervalLength = intervalLength;
    this.numberOfDosages = numberOfDosages;
  }
}

export class Group {
  name: string;
  color: string;
  isReminderOn: boolean;
  reminderTime: string | null;
  dbId: number;

  constructor(
    name: string,
    color: string,
    isReminderOn: boolean,
    reminderTime: string | null,
    dbId: number,
  ) {
    this.name = name;
    this.color = color;
    this.isReminderOn = isReminderOn;
    this.reminderTime = reminderTime; // hh:mm
    this.dbId = dbId;
  }
}
