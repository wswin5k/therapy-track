import { Assets as NavigationAssets } from "@react-navigation/elements";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Asset } from "expo-asset";
import { createURL } from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import React from "react";
import { useColorScheme } from "react-native";
import { Navigation } from "./navigation";
import { SQLiteProvider } from "expo-sqlite";
import { migrateDbIfNeeded } from "./models/dbMigration";

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
    primary: "rgba(76, 45, 255, 1)",
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "rgba(76, 45, 255, 1)",
  },
};

export function App() {
  const colorScheme = useColorScheme();

  const theme = colorScheme === "dark" ? CustomDarkTheme : CustomLightTheme;

  return (
    <SQLiteProvider databaseName="main12.db" onInit={migrateDbIfNeeded}>
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
    </SQLiteProvider>
  );
}
