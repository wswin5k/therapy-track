import { Frequency, Group, IntervalUnit } from "../../../models/Frequency";

export const frequencySelectionMap: { [key: string]: Frequency } = {
  OnceDaily: new Frequency(IntervalUnit.day, 1, 1),
  TwiceDaily: new Frequency(IntervalUnit.day, 1, 2),
  ThriceDaily: new Frequency(IntervalUnit.day, 1, 3),
  OnceWeekly: new Frequency(IntervalUnit.week, 1, 1),
  OnceBiweekly: new Frequency(IntervalUnit.week, 2, 1),
};

export function assingDefaultGroups(groups: Group[]): Map<number, number> {
  const doseIdxToGroup = new Map();

  groups.forEach((g, idx) => {
    if (g.name === "Morning") {
      doseIdxToGroup.set(0, idx);
    } else if (g.name === "Afternoon") {
      doseIdxToGroup.set(1, idx);
    } else if (g.name === "Evening") {
      doseIdxToGroup.set(2, idx);
    }
  });

  return doseIdxToGroup;
}
