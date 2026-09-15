import { Frequency, Group, IntervalUnit } from "../../../models/Frequency";

export const frequencySelectionMap: { [key: string]: Frequency } = {
  OnceDaily: new Frequency(IntervalUnit.day, 1, 1),
  TwiceDaily: new Frequency(IntervalUnit.day, 1, 2),
  ThriceDaily: new Frequency(IntervalUnit.day, 1, 3),
  OnceWeekly: new Frequency(IntervalUnit.week, 1, 1),
  OnceBiweekly: new Frequency(IntervalUnit.week, 2, 1),
};

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
