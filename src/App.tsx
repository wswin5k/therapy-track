import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createURL } from "expo-linking";
import {
  Appearance,
  ColorSchemeName,
  StatusBar,
  useColorScheme,
} from "react-native";
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
import {
  flushPendingNavigation,
  navigationRef,
  setupNotificationHandlers,
} from "./services/notificationService";
import SystemNavigationBar, {
  ColorInput,
} from "react-native-system-navigation-bar";
import { PortalProvider } from "@gorhom/portal";

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
    surface: "#F2F0EB",
    card: "#EFE9E3",
    border: "#E0E0E0",
    text: "#39322F",
    textSecondary: "#666666",
    textTertiary: "#999999",
    textOnPrimary: "#FFFFFF",
    backgroundToast: "#999999",
    success: "#5BC864",
    error: "#FF544B",
  },
};

const CustomDarkTheme: ReactNavigation.Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#7dc4cb",
    background: "#423F3C",
    surface: "#3B3839",
    card: "#33302E",
    border: "#262525",
    text: "#D3DAD9",
    textSecondary: "#A8A8A8",
    textTertiary: "#838383",
    textOnPrimary: "#FFFFFF",
    backgroundToast: "#999999",
    success: "#5BC864",
    error: "#FF544B",
  },
};

function colorSchemeToTheme(
  colorScheme: ColorSchemeName | null,
): ReactNavigation.Theme {
  return colorScheme === "dark" ? CustomDarkTheme : CustomLightTheme;
}

export function applyNavigationBarTheme(
  color: ColorInput,
  colorScheme: Appearance.ColorSchemeName | null,
  translucent: boolean,
) {
  SystemNavigationBar.setBarColor(color, {
    style: colorScheme === "dark" ? "light" : "dark",
    bar: "navigation",
    translucent: translucent,
  });
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

  React.useEffect(() => {
    return setupNotificationHandlers();
  }, []);

  const colorScheme = useColorScheme();

  let theme = colorSchemeToTheme(colorScheme);

  React.useEffect(() => {
    applyNavigationBarTheme(theme.colors.card, colorScheme, false);
  }, [colorScheme, theme.colors.card]);

  return (
    <Navigation
      ref={navigationRef}
      theme={theme}
      linking={{
        enabled: "auto",
        prefixes: [prefix],
      }}
      onReady={() => {
        SplashScreen.hideAsync();
        flushPendingNavigation();
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
        <PortalProvider>
          <StatusBar barStyle={"auto"} />
          <AppNavigation />
        </PortalProvider>
      </SafeAreaProvider>
    </SQLiteProvider>
  );
}
