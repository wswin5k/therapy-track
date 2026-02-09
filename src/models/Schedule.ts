import { Medicine } from "./Medicine";

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
}

export class Dose {
  amount: number;
  index: number;
  offset: number | null;

  constructor(amount: number, index: number, offset: number | null) {
    this.amount = amount;
    this.index = index;
    this.offset = offset;
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
