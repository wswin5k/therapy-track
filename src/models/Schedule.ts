import { MedicineData } from "./MedicineData";

export enum IntervalUnit {
  day = "day",
  week = "weel",
  month = "month",
}

export class Frequency {
  intervalUnit: IntervalUnit;
  intervalLength: number;
  numberOfDoses: number;
  dosesOffsests: null | number[]; // not null for week/month with number of doses > 1

  constructor(
    intervalUnit: IntervalUnit,
    intervalLength: number,
    numberOfDoses: number,
    dosesOffsests: null | number[],
  ) {
    this.intervalUnit = intervalUnit;
    this.intervalLength = intervalLength;
    this.numberOfDoses = numberOfDoses;
    this.dosesOffsests = dosesOffsests;
  }
}

export class Schedule {
  medicine: MedicineData;
  startDate: Date;
  endDate: Date;
  doses: number[];
  freq: Frequency;

  constructor(
    medicine: MedicineData,
    startDate: Date,
    endDate: Date,
    doses: number[],
    freq: Frequency,
  ) {
    this.medicine = medicine;
    this.startDate = startDate;
    this.endDate = endDate;
    this.doses = doses;
    this.freq = freq;
  }
}
