import { Assets as NavigationAssets } from "@react-navigation/elements";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Asset } from "expo-asset";
import { createURL } from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import React from "react";
import { useColorScheme } from "react-native";
import { Navigation } from "./navigation";
import { SQLiteProvider } from "expo-sqlite";
import { DATABASE_NAME, migrateDbIfNeeded } from "./models/dbMigration";
import { SafeAreaProvider } from "react-native-safe-area-context";

Asset.loadAsync([
  ...NavigationAssets,
  require("./assets/newspaper.png"),
  require("./assets/bell.png"),
]);

SplashScreen.preventAutoHideAsync();

const prefix = createURL("/");

const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "rgba(29, 134, 226, 1)",
    surface: "#f9f9f9",
    textSecondary: "#666666",
    textTertiary: "#999999",
    success: "#10ce20",
    error: "#ff3b30",
    border: "#e0e0e0",
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "rgba(29, 134, 226, 1)",
    background: "#000000",
    card: "#1c1c1e",
    text: "#ffffff",
    border: "#38383a",
    surface: "#1c1c1e",
    textSecondary: "#8e8e93",
    textTertiary: "#636366",
    success: "#30d158",
    error: "#ff453a",
  },
};

export function App() {
  const colorScheme = useColorScheme();

  const theme = colorScheme === "dark" ? CustomDarkTheme : CustomLightTheme;

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </SQLiteProvider>
  );
}
