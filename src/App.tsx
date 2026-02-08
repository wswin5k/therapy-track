import { Assets as NavigationAssets } from "@react-navigation/elements";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Asset } from "expo-asset";
import { createURL } from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import * as React from "react";
import { useColorScheme } from "react-native";
import { Navigation } from "./navigation";
import { SQLiteProvider, type SQLiteDatabase } from "expo-sqlite";

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
    <SQLiteProvider databaseName="main11.db" onInit={migrateDbIfNeeded}>
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

async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 1;

  const pragma_user_version = await db.getFirstAsync<{
    user_version: number;
  }>("PRAGMA user_version");

  if (!pragma_user_version) {
    throw Error("Invalid database file.");
  }

  let currentDbVersion = pragma_user_version.user_version;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }
  if (currentDbVersion === 0) {
    db.withTransactionAsync(async () => {
      await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      CREATE TABLE medicines (id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      base_unit TEXT NOT NULL,
      active_ingredients TEXT NOT NULL );

      CREATE TABLE schedules (
      id INTEGER PRIMARY KEY NOT NULL,
      medicine INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT,
      doses TEXT NOT NULL,
      freq TEXT NOT NULL,
      FOREIGN KEY(medicine) REFERENCES medicines(id)
    );
    `);
    });
    currentDbVersion = 1;
  }
  // if (currentDbVersion === 1) {
  //   Add more migrations
  // }
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
