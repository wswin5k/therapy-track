export enum FrequencySelection {
  OnceDaily = "OnceDaily",
  TwiceDaily = "TwiceDaily",
  ThriceDaily = "ThriceDaily",
  OnceWeekly = "OnceWeekly",
  OnceBiweekly = "OnceBiweekly",
}

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

  getFrequencyLabel(): FrequencySelection {
    const unit = this.intervalUnit;
    const length = this.intervalLength;
    const dosages = this.numberOfDosages;

    if (unit === "day" && length === 1) {
      if (dosages === 1) return FrequencySelection.OnceDaily;
      if (dosages === 2) return FrequencySelection.TwiceDaily;
      if (dosages === 3) return FrequencySelection.ThriceDaily;
    } else if (unit === "week" && dosages === 1) {
      if (length === 1) return FrequencySelection.OnceWeekly;
      if (length === 2) return FrequencySelection.OnceBiweekly;
    }
    throw Error("Wrong frequency data.");
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
