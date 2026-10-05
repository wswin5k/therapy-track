import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import {
  useNavigation,
  useTheme,
  useFocusEffect,
} from "@react-navigation/native";
import { DefaultMainContainer } from "../../../components/DefaultMainContainer";
import {
  dbGetHistoryTableSettings,
  dbUpdateHistoryTableSettings,
} from "../../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { EDIT_PRESSABLE_HEIGHT } from "../../../commonStyles";
import { eStyles } from "../../../commonStyles";
import { HistoryTableSettings } from "../../../models/Settings";

export function EditHistoryTableSettingsScreen() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const theme = useTheme();

  const [historyTableSettings, setHistoryTableSettings] =
    React.useState<HistoryTableSettings | null>(null);

  const loadSettings = React.useCallback(async () => {
    const settings = await dbGetHistoryTableSettings(db);
    setHistoryTableSettings(settings);
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  const handleUpdateHistoryTableSettings = (
    updates: Partial<HistoryTableSettings>,
  ) => {
    setHistoryTableSettings((value) => value && { ...value, ...updates });
  };

  const handleSave = async () => {
    if (historyTableSettings) {
      await dbUpdateHistoryTableSettings(db, historyTableSettings);
    }
    navigation.goBack();
  };

  return (
    <DefaultMainContainer>
      <ScrollView
        style={eStyles.editMainScrollContainer}
        contentContainerStyle={eStyles.editMainScrollContentContainer}
      >
        {historyTableSettings && (
          <>
            <View style={styles.rowContainer}>
              <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
                {t("Expand all rows")}
              </Text>
              <Switch
                value={historyTableSettings.expandAllRows}
                onValueChange={(value: boolean) =>
                  handleUpdateHistoryTableSettings({ expandAllRows: value })
                }
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
                style={styles.switch}
              />
            </View>
            <View style={styles.rowContainer}>
              <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
                {t("Show days without entries")}
              </Text>
              <Switch
                value={historyTableSettings.showDaysWithoutEntries}
                onValueChange={(value: boolean) =>
                  handleUpdateHistoryTableSettings({
                    showDaysWithoutEntries: value,
                  })
                }
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
                style={styles.switch}
              />
            </View>
            <View style={styles.rowContainer}>
              <View style={styles.labelContainer}>
                <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
                  {t("Show each ingredient form in a separate column")}
                </Text>
              </View>
              <Switch
                value={!historyTableSettings.mergeIngredientsWithDifferentForms}
                onValueChange={(value: boolean) =>
                  handleUpdateHistoryTableSettings({
                    mergeIngredientsWithDifferentForms: !value,
                  })
                }
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
                style={styles.switch}
              />
            </View>
          </>
        )}
      </ScrollView>

      <View style={[eStyles.footer, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleSave}
          style={[
            eStyles.nextButton,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            style={[
              eStyles.nextButtonText,
              { color: theme.colors.textOnPrimary },
            ]}
          >
            {t("Apply")}
          </Text>
        </TouchableOpacity>
      </View>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  labelContainer: {
    maxWidth: "80%",
  },
  switch: {
    transform: [{ scaleX: 1.4 }, { scaleY: 1.4 }],
    height: EDIT_PRESSABLE_HEIGHT,
  },
});
