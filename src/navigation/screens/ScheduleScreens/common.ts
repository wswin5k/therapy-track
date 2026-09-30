import { TFunction } from "i18next";
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

export const frequencySelectionMap: { [key: string]: Frequency } = {
  OnceDaily: new Frequency(IntervalUnit.day, 1, 1),
  TwiceDaily: new Frequency(IntervalUnit.day, 1, 2),
  ThriceDaily: new Frequency(IntervalUnit.day, 1, 3),
  OnceWeekly: new Frequency(IntervalUnit.week, 1, 1),
  OnceBiweekly: new Frequency(IntervalUnit.week, 2, 1),
  Custom: new Frequency(IntervalUnit.week, 2, 1),
};

class Weekday {
  constructor(
    public nameNarrow: string,
    public nameShort: string,
    // 0 - Mon... 6 - Sun
    // order depends on locale
    public index: number,
  ) {}
}

export function getWeekdays(language: string): Weekday[] {
  const localeObj = new Intl.Locale(language);

  // 1 = Mon,..., 7 = Sun
  const firstDayOfWeek = localeObj.getWeekInfo?.()?.firstDay ?? 1;

  // Monday, Jan 5, 2026
  const baseDate = new Date(2026, 0, 5);
  const formatterNarrow = new Intl.DateTimeFormat(language, {
    weekday: "narrow",
  });
  const formatterShort = new Intl.DateTimeFormat(language, {
    weekday: "short",
  });

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(baseDate);
    const dayIndex = (firstDayOfWeek + i - 1) % 7;
    date.setDate(baseDate.getDate() + dayIndex);
    return new Weekday(
      formatterNarrow.format(date),
      formatterShort.format(date),
      dayIndex,
    );
  });
}

export function frequencyToDisplayForm(
  t: TFunction,
  weekdays: Weekday[],
  frequency: Frequency,
  offsets: number[],
): string {
  const unit = frequency.intervalUnit;
  const length = frequency.intervalLength;
  const dosages = frequency.numberOfDosages;
  if (unit === "day") {
    if (length === 1) {
      if (dosages === 1) return "Once daily";
      if (dosages === 2) return "Twice daily";
      if (dosages === 3) return "Three times daily";
      return `${dosages} times a day`;
    } else {
      if (dosages === 1)
        return `every ${length} ${t("day", { count: length })}`;
    }
  } else if (unit === "week") {
    if (dosages === 1) {
      if (length === 1) return "Weekly";
      if (length === 2) return "Every two weeks";
      return `every ${length} ${t("week", { count: length })}`;
    } else if (length === 1) {
      const selectedWeekdays = offsets
        .map((idx) => weekdays.find((el) => el.index === idx))
        .filter((w) => w instanceof Weekday);
      selectedWeekdays.sort(
        (a, b) => weekdays.indexOf(a) - weekdays.indexOf(b),
      );
      return `every ${selectedWeekdays.map((w) => w.nameShort).join(", ")}`;
    }
  }
  return "Custom...";
}
export function frequencySelectionToPickerLabels(key: FrequencySelection) {
  const mapping = {
    OnceDaily: "Once daily",
    TwiceDaily: "Twice daily",
    ThriceDaily: "Three times daily",
    OnceWeekly: "Weekly",
    OnceBiweekly: "Every two weeks",
    Custom: "Custom...",
  };
  return mapping[key];
}
