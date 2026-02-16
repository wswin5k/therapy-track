import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSQLiteContext } from "expo-sqlite";
import {
  useFocusEffect,
  useNavigation,
  useTheme,
} from "@react-navigation/native";
import {
  dbDeleteMedicine,
  dbGetMedicines,
  dbGetSchedulesWithMedicines,
} from "../../models/dbAccess";
import { Medicine } from "../../models/Medicine";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { ConfirmationDialog } from "../../components/ConfirmationDialog";
import { InformationDialog } from "../../components/InformationDialog";

function MedicineListItem({
  medicine,
  hasSchedules,
  loadData,
  optionsOpened,
  handleOptionsToggle,
  onPress,
}: {
  medicine: Medicine;
  hasSchedules: boolean;
  loadData: () => Promise<void>;
  optionsOpened: boolean;
  handleOptionsToggle: () => void;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const theme = useTheme();
  const [deleteDialogVisible, setDeleteDialogVisible] = React.useState(false);
  const [deleteRefusalDialogVisible, setDeleteRefusalDialogVisible] =
    React.useState(false);

  const handleDelete = () => {
    if (hasSchedules) {
      setDeleteRefusalDialogVisible(true);
    } else {
      setDeleteDialogVisible(true);
    }
  };

  const confirmDelete = async () => {
    await dbDeleteMedicine(db, medicine.dbId);
    setDeleteDialogVisible(false);
    await loadData();
  };

  const closeDeleteRefusal = () => {
    setDeleteRefusalDialogVisible(false);
    handleOptionsToggle();
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
    handleOptionsToggle();
  };

  const handleEdit = () => {
    navigation.navigate("EditMedicineScreen", {
      medicine: medicine,
      mode: "save-and-go-back",
    });
  };

  const renderOptions = () => (
    <TouchableOpacity
      style={[styles.optionsOverlay, { zIndex: 1, position: "absolute" }]}
      onLongPress={handleOptionsToggle}
    >
      <TouchableOpacity
        style={[
          styles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleEdit}
      >
        <Text style={styles.optionsButtonText}>{t("Edit")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleDelete}
      >
        <Text style={styles.optionsButtonText}>{t("Delete")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleOptionsToggle}
      >
        <Text style={styles.optionsButtonText}>{t("Cancel")}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{}}>
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title={t("Delete confirmation")}
        message={t("Do you want to remove ") + medicine.name + "?"}
        confirmText={t("Delete")}
        cancelText={t("Cancel")}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <InformationDialog
        visible={deleteRefusalDialogVisible}
        title={t("Medicine has schedules")}
        message={t(
          "Deletetion of the medicine has been refused, because " +
            "it has connected schedules. " +
            "They need to be deleted before the medicine.",
        )}
        closeText={t("Close")}
        onClose={closeDeleteRefusal}
      />

      {optionsOpened && renderOptions()}

      <TouchableOpacity
        onPress={onPress}
        onLongPress={handleOptionsToggle}
        style={[
          styles.itemContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            filter: optionsOpened ? "blur(4px)" : "none",
          },
        ]}
      >
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
            {medicine.name}
          </Text>
          <Text
            style={[styles.itemText, { color: theme.colors.textSecondary }]}
          >
            {t(medicine.baseUnit, { count: 2 })}
          </Text>
          <Text
            style={[styles.itemText, { color: theme.colors.textSecondary }]}
          >
            {medicine.activeIngredientsString().join("\n")}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function MedicineListScreen() {
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const theme = useTheme();

  const [medicines, setMedicines] = React.useState<Medicine[]>([]);
  const [medicinesWithSchedules, setMedicineWithSchedules] = React.useState<
    Set<number>
  >(new Set());
  const [optionsOpened, setOptionsOpened] = React.useState<Array<boolean>>([]);

  const loadData = React.useCallback(async () => {
    const medicines = await dbGetMedicines(db);
    setMedicines(medicines);

    const schedulesWithMedicines = await dbGetSchedulesWithMedicines(db);
    const newMedicinesWithSchedules = new Set<number>();
    schedulesWithMedicines.forEach((s) => {
      newMedicinesWithSchedules.add(s.medicine.dbId);
    });
    setMedicineWithSchedules(newMedicinesWithSchedules);

    setOptionsOpened(Array.from({ length: medicines.length }, () => false));
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("No schedules yet")}
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
        {t("Add a schedule from the Home screen")}
      </Text>
    </View>
  );

  const createHandleOptionsToggle = (idx: number) => {
    return () => {
      const newValue = !optionsOpened[idx];
      const newOptionsOpened = Array.from(
        { length: optionsOpened.length },
        (_, it) => (it === idx ? newValue : false),
      );
      setOptionsOpened(newOptionsOpened);
    };
  };

  const handleOptionsOff = () => {
    const newOptionsOpened = Array.from(
      { length: optionsOpened.length },
      () => false,
    );
    setOptionsOpened(newOptionsOpened);
  };

  return (
    <DefaultMainContainer>
      <ScrollView style={styles.list}>
        {medicines.map((m, idx) => {
          return (
            <MedicineListItem
              key={idx}
              medicine={m}
              hasSchedules={medicinesWithSchedules.has(m.dbId)}
              optionsOpened={optionsOpened[idx]}
              loadData={loadData}
              onPress={handleOptionsOff}
              handleOptionsToggle={createHandleOptionsToggle(idx)}
            />
          );
        })}
        {!medicines && renderEmptyState()}
      </ScrollView>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  itemText: {
    fontSize: 15,
    marginBottom: 2,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  optionsOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "rgba(255, 0, 0, 0.0)",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionsButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: "25%",
  },
  optionsButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
});
