import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createURL } from "expo-linking";
import { Appearance, ColorSchemeName, useColorScheme } from "react-native";
import { Navigation } from "./navigation";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import {
  DATABASE_NAME_WITH_EXT,
  migrateDbIfNeeded,
} from "./models/dbMigration";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import "@formatjs/intl-locale/polyfill.js";
import React from "react";
import { dbGetSettings } from "./models/dbAccess";
import { themeSelectionToColorSchemeName } from "./models/Settings";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const prefix = createURL("/");

const CustomLightTheme: ReactNavigation.Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#7dc4cb",
    background: "#F9F8F6",
    surface: "#f2f0eb",
    card: "#EFE9E3",
    border: "#e0e0e0",
    text: "#39322f",
    textSecondary: "#666666",
    textTertiary: "#999999",
    textOnPrimary: "#ffffff",
    success: "#5bc864",
    error: "#ff544bff",
  },
};

const CustomDarkTheme: ReactNavigation.Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#7dc4cb",
    background: "#423f3c",
    surface: "#3b3839",
    card: "#33302e",
    border: "#262525",
    text: "#D3DAD9",
    textSecondary: "#c1c1c5ff",
    textTertiary: "#bdbdc2ff",
    textOnPrimary: "#ffffff",
    success: "#5bc864",
    error: "#ff544bff",
  },
};

function colorSchemeToTheme(
  colorScheme: ColorSchemeName,
): ReactNavigation.Theme {
  return colorScheme === "dark" ? CustomDarkTheme : CustomLightTheme;
}

function AppNavigation() {
  const db = useSQLiteContext();
  React.useEffect(() => {
    const loadSettings = async () => {
      const settings = await dbGetSettings(db);
      let colorSchemeName = themeSelectionToColorSchemeName(settings.theme);
      Appearance.setColorScheme(colorSchemeName);
    };
    loadSettings();
  }, [db]);

  const colorScheme = useColorScheme();

  let theme = colorSchemeToTheme(colorScheme);

  Appearance.addChangeListener((preferences) => {
    theme = colorSchemeToTheme(preferences.colorScheme);
  });

  return (
    <Navigation
      theme={theme}
      linking={{
        enabled: "auto",
        prefixes: [prefix],
      }}
      onReady={() => {
        SplashScreen.hideAsync();
      }}
    />
  );
}

export function App() {
  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME_WITH_EXT}
      onInit={migrateDbIfNeeded}
    >
      <SafeAreaProvider>
        <AppNavigation />
      </SafeAreaProvider>
    </SQLiteProvider>
  );
}
