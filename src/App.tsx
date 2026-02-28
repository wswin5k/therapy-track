import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createURL } from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import React from "react";
import { useColorScheme } from "react-native";
import { Navigation } from "./navigation";
import { SQLiteProvider } from "expo-sqlite";
import { DATABASE_NAME, migrateDbIfNeeded } from "./models/dbMigration";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";

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
    primary: "#72b4bc",
    background: "#F9F8F6",
    surface: "#f2f0eb",
    card: "#EFE9E3",
    border: "#e0e0e0",
    text: "#363636ff",
    textSecondary: "#666666",
    textTertiary: "#999999",
    success: "#10ce20",
    error: "#ff544bff",
  },
};

const CustomDarkTheme: ReactNavigation.Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#72b4bc",
    background: "#423f3c",
    surface: "#3b3839",
    card: "#33302e",
    border: "#262525",
    text: "#D3DAD9",
    textSecondary: "#c1c1c5ff",
    textTertiary: "#bdbdc2ff",
    success: "#10ce20",
    error: "#ff544bff",
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
