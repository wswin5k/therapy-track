import { ColorSchemeName } from "react-native";

export enum ThemeSelection {
  Light = "Light",
  Dark = "Dark",
  Auto = "Auto",
}

export function themeSelectionToColorSchemeName(
  value: ThemeSelection,
): ColorSchemeName {
  if (value === ThemeSelection.Light) {
    return "light";
  } else if (value === ThemeSelection.Dark) {
    return "dark";
  } else {
    return "unspecified";
  }
}

export class Settings {
  constructor(public theme: ThemeSelection) {}
}

export class HistoryTableSettings {
  constructor(
    public showActiveIngredients: boolean,
    public showMedicines: boolean,
    public showAssessments: boolean,
    public expandAllRows: boolean,
    public showDaysWithoutEntries: boolean,
    public mergeIngredientsWithDifferentForms: boolean,
    public columnWidths: Map<string, number>,
  ) {}
}
