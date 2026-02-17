import { Medicine } from "./Medicine";

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

export enum FrequencySelection {
  OnceDaily = "Once daily",
  TwiceDaily = "Twice daily",
  ThriceDaily = "Three times daily",
  OnceWeekly = "Weekly",
  OnceBiweekly = "Every two weeks",
}

export function strKeyOfFrequeencySelection(x: FrequencySelection) {
  return Object.keys(FrequencySelection)[
    Object.values(FrequencySelection).indexOf(x)
  ];
}

export enum IntervalUnit {
  day = "day",
  week = "week",
  month = "month",
}

export class Frequency {
  intervalUnit: IntervalUnit;
  intervalLength: number;
  numberOfDoses: number;

  constructor(
    intervalUnit: IntervalUnit,
    intervalLength: number,
    numberOfDoses: number,
  ) {
    this.intervalUnit = intervalUnit;
    this.intervalLength = intervalLength;
    this.numberOfDoses = numberOfDoses;
  }

  getFrequencyLabel(): FrequencySelection {
    const unit = this.intervalUnit;
    const length = this.intervalLength;
    const doses = this.numberOfDoses;

    if (unit === "day" && length === 1) {
      if (doses === 1) return FrequencySelection.OnceDaily;
      if (doses === 2) return FrequencySelection.TwiceDaily;
      if (doses === 3) return FrequencySelection.ThriceDaily;
    } else if (unit === "week" && doses === 1) {
      if (length === 1) return FrequencySelection.OnceWeekly;
      if (length === 2) return FrequencySelection.OnceBiweekly;
    }
    throw Error("Wrong frequency data.");
  }
}

export class Dose {
  amount: number;
  index: number;
  offset: number | null;
  group: Group | null;

  constructor(
    amount: number,
    index: number,
    offset: number | null,
    group: Group | null = null,
  ) {
    this.amount = amount;
    this.index = index;
    this.offset = offset;
    this.group = group;
  }
}

export class Schedule {
  medicine: Medicine;
  startDate: Date;
  endDate: Date;
  freq: Frequency;
  doses: Dose[];
  dbId: number;

  constructor(
    medicine: Medicine,
    startDate: Date,
    endDate: Date,
    freq: Frequency,
    doses: Dose[],
    dbId: number,
  ) {
    this.medicine = medicine;
    this.startDate = startDate;
    this.endDate = endDate;
    this.freq = freq;
    this.doses = doses;
    this.dbId = dbId;
  }
}
