import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useSQLiteContext } from "expo-sqlite";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { Appearance } from "react-native";
import { dbGetSettings, dbUpdateSettings } from "../../models/dbAccess";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { EDIT_PRESSABLE_HEIGHT, eStyles } from "../../commonStyles";
import { DropdownPicker } from "../../components/DropdownPicker";
import {
  ThemeSelection,
  themeSelectionToColorSchemeName,
} from "../../models/Settings";

function themeSelectionToLabel(selection: ThemeSelection): string {
  switch (selection) {
    case ThemeSelection.Dark:
      return "Dark";
    case ThemeSelection.Light:
      return "Light";
    case ThemeSelection.Auto:
      return "Follow device";
  }
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const theme = useTheme();

  const [themeSelection, setThemeSelection] =
    React.useState<ThemeSelection | null>(null);

  const loadData = React.useCallback(async () => {
    const settings = await dbGetSettings(db);
    setThemeSelection(settings.theme);
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleThemeSelectionChange = async (selection: ThemeSelection) => {
    await dbUpdateSettings(db, { theme: selection });
    const colorScheme = themeSelectionToColorSchemeName(selection);
    Appearance.setColorScheme(colorScheme);
  };

  return (
    <DefaultMainContainer>
      <ScrollView
        style={eStyles.editMainScrollContainer}
        contentContainerStyle={eStyles.editMainScrollContentContainer}
      >
        <View style={[styles.rowContainer]}>
          <View style={styles.themeSelectionLabel}>
            <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
              {t("Theme")}
            </Text>
          </View>
          <View style={styles.themeSelectionPickerContainer}>
            {themeSelection && (
              <DropdownPicker
                options={Object.values(ThemeSelection)}
                initialValue={themeSelection}
                onValueChange={handleThemeSelectionChange}
                getLabel={themeSelectionToLabel}
                pressableStyle={{
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                }}
              ></DropdownPicker>
            )}
          </View>
        </View>
      </ScrollView>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  themeSelectionLabel: {
    height: EDIT_PRESSABLE_HEIGHT,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  themeSelectionPickerContainer: {
    justifyContent: "center",
    width: "60%",
    overflow: "hidden",
  },
});
