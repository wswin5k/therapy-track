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
