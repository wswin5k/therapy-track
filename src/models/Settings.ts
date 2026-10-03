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

export function colorSchemeNameToThemeSelection(
  value: ColorSchemeName,
): ThemeSelection {
  if (value === "light") {
    return ThemeSelection.Light;
  } else if (value === "dark") {
    return ThemeSelection.Dark;
  } else {
    return ThemeSelection.Auto;
  }
}

export class Settings {
  constructor(public theme: ThemeSelection) {}
}
