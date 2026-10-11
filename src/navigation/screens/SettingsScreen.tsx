import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  backupDatabaseAsync,
  openDatabaseAsync,
  useSQLiteContext,
} from "expo-sqlite";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { Appearance } from "react-native";
import { dbGetSettings, dbUpdateSettings } from "../../models/dbAccess";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import {
  EDIT_PRESSABLE_HEIGHT,
  eStyles,
  SECONDARY_EDIT_PRESSABLE_HEIGHT,
} from "../../commonStyles";
import { DropdownPicker } from "../../components/DropdownPicker";
import {
  ThemeSelection,
  themeSelectionToColorSchemeName,
} from "../../models/Settings";
import {
  APP_DATABASE_VERSION,
  DATABASE_NAME,
  getDbVersion,
  migrateDbIfNeeded,
} from "../../models/dbMigration";
import { File, Paths, Directory } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ConfirmationDialog } from "../../components/ConfirmationDialog";
import { Lucide } from "@react-native-vector-icons/lucide/static";
import { Toast, ToastType } from "../../components/Toast";
import { getDisplayDirectoryName } from "../utils";

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
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [toastType, setToastType] = React.useState<ToastType>(
    ToastType.Success,
  );

  const [
    loadBackupConfirmationDialogOpen,
    setLoadBackupConfirmationDialogOpen,
  ] = React.useState<boolean>(false);
  const [importedBackupFile, setImportedBackupFile] =
    React.useState<File | null>(null);

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

  const handleCreateBackupFile = async (): Promise<void> => {
    const showErrorToast = () => {
      setToastType(ToastType.Error);
      setToastMessage(t("Failed to export the backup file."));
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `therapy-track-backup-${timestamp}.db`;

    // Temporary destination inside the app cache directory.
    const backupFile = new File(Paths.cache, filename);
    if (backupFile.exists) {
      backupFile.delete();
    }

    const backupDb = await openDatabaseAsync(filename, {}, Paths.cache.uri);

    try {
      // Flush uncommitted WAL (Write-Ahead Logging) changes into the main .db file
      await db.execAsync("PRAGMA wal_checkpoint(FULL);");
      await backupDatabaseAsync({
        sourceDatabase: db,
        sourceDatabaseName: DATABASE_NAME,
        destDatabase: backupDb,
        destDatabaseName: DATABASE_NAME,
      });
    } catch {
      showErrorToast();
      return;
    } finally {
      await backupDb.closeAsync();
    }
    if (!backupFile.exists || backupFile.size === 0) {
      showErrorToast();
      return;
    }

    try {
      if (Platform.OS === "android") {
        const directory = await Directory.pickDirectoryAsync();
        if (!directory) {
          return;
        }
        await backupFile.copy(directory);
        const directoryDisplayName = getDisplayDirectoryName(directory.uri);
        const message =
          directoryDisplayName === null
            ? "Backup file exported successfully."
            : `Backup file saved in ${directoryDisplayName}.`;
        setToastType(ToastType.Success);
        setToastMessage(message);
      } else if (Platform.OS === "ios") {
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          showErrorToast();
          return;
        }
        await Sharing.shareAsync(backupFile.uri, {
          dialogTitle: "Export backup file",
          mimeType: "application/x-sqlite3",
          UTI: "public.database",
        });
      }
    } catch {
      showErrorToast();
    } finally {
      if (backupFile.exists) {
        backupFile.delete();
      }
    }
  };

  async function handleLoadBackup(): Promise<void> {
    const result = await File.pickFileAsync({
      multipleFiles: false,
      mimeTypes: [
        "application/x-sqlite3",
        "application/vnd.sqlite3",
        "application/octet-stream",
      ],
    });

    if (result.canceled || result.result === null) {
      return;
    }
    const selectedFile = result.result;

    // Copy the file to a cache directory
    const importedFilename = "imported-backup.db";
    const newImportedFile = new File(Paths.cache.uri, importedFilename);
    await selectedFile.copy(newImportedFile, { overwrite: true });
    if (!newImportedFile.exists) {
      setToastType(ToastType.Error);
      setToastMessage(t("Failed to load the backup file."));
      return;
    }

    setImportedBackupFile(newImportedFile);
    setLoadBackupConfirmationDialogOpen(true);
  }

  const handleFinishLoadingBackup = async () => {
    const showErrorToast = () => {
      setToastType(ToastType.Error);
      setToastMessage(t("Failed to load the backup file."));
    };

    setLoadBackupConfirmationDialogOpen(false);
    if (importedBackupFile === null) {
      showErrorToast();
      return;
    }

    const importedDb = await openDatabaseAsync(
      importedBackupFile.name,
      {},
      Paths.cache.uri,
    );
    const importedDbVersion = await getDbVersion(importedDb);

    if (importedDbVersion > APP_DATABASE_VERSION) {
      setToastType(ToastType.Error);
      setToastMessage(
        t(
          "Load failed. The database file is from a newer version of the application.",
        ),
      );
      return;
    }
    await migrateDbIfNeeded(importedDb);

    try {
      await backupDatabaseAsync({
        sourceDatabase: importedDb,
        sourceDatabaseName: DATABASE_NAME,
        destDatabase: db,
        destDatabaseName: DATABASE_NAME,
      });
      setToastType(ToastType.Success);
      setToastMessage("Backup loaded successfully.");
    } catch {
      showErrorToast();
      return;
    } finally {
      await importedDb.closeAsync();
      if (importedBackupFile.exists) {
        importedBackupFile.delete();
      }
      setImportedBackupFile(null);
    }
  };

  const abortLoadingBackup = () => {
    setImportedBackupFile(null);
    setLoadBackupConfirmationDialogOpen(false);
  };

  return (
    <DefaultMainContainer>
      <Toast
        message={toastMessage ?? ""}
        visible={toastMessage !== null}
        duration={4000}
        onHide={() => setToastMessage(null)}
        type={toastType}
      />
      <ConfirmationDialog
        visible={loadBackupConfirmationDialogOpen}
        title={t("Confirm data override")}
        message={t(
          "This action is going to pernamently delete current application data. Do you want to continue?",
        )}
        confirmText={t("Override")}
        cancelText={t("Cancel")}
        onConfirm={handleFinishLoadingBackup}
        onCancel={abortLoadingBackup}
      />
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
        <View style={[styles.rowContainer]}>
          <View style={styles.themeSelectionLabel}>
            <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
              {t("Create backup file")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleCreateBackupFile}
            style={[
              styles.backupPressable,
              {
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Lucide name="download" color={theme.colors.primary} size={24} />
          </TouchableOpacity>
        </View>
        <View style={[styles.rowContainer]}>
          <View style={styles.themeSelectionLabel}>
            <Text style={[eStyles.labelText, { color: theme.colors.text }]}>
              {t("Load backup file")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLoadBackup}
            style={[
              styles.backupPressable,
              {
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Lucide name="upload" color={theme.colors.primary} size={24} />
          </TouchableOpacity>
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
  backupPressable: {
    ...eStyles.pressable,
    justifyContent: "center",
    width: 80,
    height: SECONDARY_EDIT_PRESSABLE_HEIGHT,
    maxWidth: "50%",
    overflow: "hidden",
    borderWidth: 1.2,
  },
});
