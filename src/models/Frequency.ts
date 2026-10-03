export enum IntervalUnit {
  day = "day",
  week = "week",
  month = "month",
}

export class Frequency {
  constructor(
    public intervalUnit: IntervalUnit,
    public intervalLength: number,
    public numberOfDosages: number,
  ) {}
}

export class Group {
  constructor(
    public name: string,
    public color: string,
    public isReminderOn: boolean,
    public reminderTime: string | null,
    public dbId: number,
  ) {}
}
