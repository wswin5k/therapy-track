import { Frequency, Group, IntervalUnit } from "../../../models/Frequency";

export function assingDefaultGroups(
  groups: Iterable<Group>,
): Map<number, number> {
  const dosageIdxToGroupId = new Map();

  for (const g of groups) {
    if (g.name === "Morning") {
      dosageIdxToGroupId.set(0, g.dbId);
    } else if (g.name === "Afternoon") {
      dosageIdxToGroupId.set(1, g.dbId);
    } else if (g.name === "Evening") {
      dosageIdxToGroupId.set(2, g.dbId);
    }
  }

  return dosageIdxToGroupId;
}

export enum FrequencySelection {
  OnceDaily = "OnceDaily",
  TwiceDaily = "TwiceDaily",
  ThriceDaily = "ThriceDaily",
  OnceWeekly = "OnceWeekly",
  OnceBiweekly = "OnceBiweekly",
  Custom = "Custom",
}

export function getFrequencySelection(
  frequency: Frequency,
): FrequencySelection {
  const unit = frequency.intervalUnit;
  const length = frequency.intervalLength;
  const dosages = frequency.numberOfDosages;

  if (unit === "day" && length === 1) {
    if (dosages === 1) return FrequencySelection.OnceDaily;
    if (dosages === 2) return FrequencySelection.TwiceDaily;
    if (dosages === 3) return FrequencySelection.ThriceDaily;
  } else if (unit === "week" && dosages === 1) {
    if (length === 1) return FrequencySelection.OnceWeekly;
    if (length === 2) return FrequencySelection.OnceBiweekly;
  }
  return FrequencySelection.Custom;
}

export const frequencySelectionMap: { [key: string]: Frequency } = {
  OnceDaily: new Frequency(IntervalUnit.day, 1, 1),
  TwiceDaily: new Frequency(IntervalUnit.day, 1, 2),
  ThriceDaily: new Frequency(IntervalUnit.day, 1, 3),
  OnceWeekly: new Frequency(IntervalUnit.week, 1, 1),
  OnceBiweekly: new Frequency(IntervalUnit.week, 2, 1),
  Custom: new Frequency(IntervalUnit.week, 2, 1),
};
