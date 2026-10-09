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

export enum ColumnType {
  Medicine = 10,
  ActiveIngredient = 20,
  Assessment = 30,
}

export class ColumnConfig {
  constructor(
    public isShown: boolean,
    public width: number | null,
    public ordinal: number,
    public _type: ColumnType,
    public _source_created_at: Date,
    public _header: string,
  ) {}
}

export class HistoryTableSettings {
  constructor(
    public expandAllRows: boolean,
    public showDaysWithoutEntries: boolean,
    public mergeIngredientsWithDifferentForms: boolean,
    public columnConfigs: Map<string, ColumnConfig>,
  ) {}
}
