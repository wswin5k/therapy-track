import React from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useSQLiteContext } from "expo-sqlite";
import {
  useFocusEffect,
  useNavigation,
  useTheme,
} from "@react-navigation/native";
import {
  dbDeleteMedicine,
  dbDeleteUnscheduledDosageRecordsForMedicine,
  dbGetMedicines,
  dbGetMedicineSchedules,
  dbGetUnscheduledDosageRecords,
} from "../../models/dbAccess";
import { Medicine } from "../../models/MedicineSchedule";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { ConfirmationDialog } from "../../components/ConfirmationDialog";
import { InformationDialog } from "../../components/InformationDialog";
import { baseUnitToSingularShortForm } from "../enumMappings";
import { lStyles } from "../../commonStyles";
import { sortByCreatedAtDesc } from "../utils";

function MedicineListItem({
  medicine,
  hasSchedules,
  hasUnscheduledRecords,
  loadData,
  optionsOpened,
  handleOptionsToggle,
  onPress,
  atLeastOneOptionsOpened,
}: {
  medicine: Medicine;
  hasSchedules: boolean;
  hasUnscheduledRecords: boolean;
  loadData: () => Promise<void>;
  optionsOpened: boolean;
  handleOptionsToggle: () => void;
  onPress: () => void;
  atLeastOneOptionsOpened: boolean;
}) {
  const { t } = useTranslation();
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
    await dbDeleteUnscheduledDosageRecordsForMedicine(db, medicine.dbId);
    await dbDeleteMedicine(db, medicine);
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
      medicine: {
        name: medicine.name,
        baseUnit: medicine.baseUnit,
        activeIngredients: medicine.activeIngredients,
        dbId: medicine.dbId,
      },
      mode: "save-and-go-back",
    });
  };

  const renderOptions = () => (
    <TouchableOpacity
      style={lStyles.optionsContainer}
      onLongPress={handleOptionsToggle}
    >
      <TouchableOpacity
        style={[
          lStyles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleEdit}
      >
        <Text
          style={[
            lStyles.optionsButtonText,
            { color: theme.colors.textOnPrimary },
          ]}
        >
          {t("Edit")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          lStyles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleDelete}
      >
        <Text
          style={[
            lStyles.optionsButtonText,
            { color: theme.colors.textOnPrimary },
          ]}
        >
          {t("Delete")}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const getDeleteMessage = (): string => {
    let message = t("Do you want to remove ") + medicine.name;
    if (hasUnscheduledRecords) {
      message += " and all of its associated unscheduled records";
    }
    message += "?";
    return message;
  };

  return (
    <View>
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title={t("Confirm delete")}
        message={getDeleteMessage()}
        confirmText={t("Delete")}
        cancelText={t("Cancel")}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <InformationDialog
        visible={deleteRefusalDialogVisible}
        title={t("Medicine has schedules")}
        message={t(
          "Medicine cannot be deleted because " +
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
        disabled={atLeastOneOptionsOpened}
        style={[
          lStyles.itemContainer,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
          optionsOpened && lStyles.optionsOpened,
        ]}
      >
        <View style={lStyles.itemContent}>
          <Text style={[lStyles.itemTitle, { color: theme.colors.text }]}>
            {medicine.name}
          </Text>
          <Text
            style={[lStyles.itemText, { color: theme.colors.textSecondary }]}
          >
            {t(baseUnitToSingularShortForm[medicine.baseUnit], { count: 2 })}
          </Text>
          <Text
            style={[lStyles.itemText, { color: theme.colors.textSecondary }]}
          >
            {medicine.activeIngredientsString().join("\n")}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function MedicineListScreen() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const theme = useTheme();
  const navigation = useNavigation();

  const [medicines, setMedicines] = React.useState<Medicine[]>([]);
  const [medicinesWithSchedules, setMedicineWithSchedules] = React.useState<
    Set<number>
  >(new Set());
  const [medicinesWithUnscheduledRecords, setMedicinesWithUnscheduledRecords] =
    React.useState<Set<number>>(new Set());
  const [optionsOpened, setOptionsOpened] = React.useState<boolean[]>([]);
  const atLeastOneOptionsOpened = React.useMemo(
    () => optionsOpened.some((v) => v),
    [optionsOpened],
  );

  const loadData = React.useCallback(async () => {
    const newMedicines = await dbGetMedicines(db);
    sortByCreatedAtDesc(newMedicines);
    setMedicines(newMedicines);

    const schedulesWithMedicines = await dbGetMedicineSchedules(db);
    const newMedicinesWithSchedules = new Set<number>();
    schedulesWithMedicines.forEach((s) => {
      newMedicinesWithSchedules.add(s.medicine.dbId);
    });
    setMedicineWithSchedules(newMedicinesWithSchedules);

    const unscheduledDosageRecords = await dbGetUnscheduledDosageRecords(db);
    const newMedicinesWithUnscheduledRecords = new Set<number>();
    unscheduledDosageRecords.forEach((r) => {
      newMedicinesWithUnscheduledRecords.add(r.medicineId);
    });
    setMedicinesWithUnscheduledRecords(newMedicinesWithUnscheduledRecords);

    setOptionsOpened(Array.from({ length: newMedicines.length }, () => false));
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleAddMedicine = () => {
    navigation.navigate("EditMedicineScreen", { mode: "save-and-go-back" });
  };

  const renderEmptyState = () => (
    <View style={lStyles.emptyContainer}>
      <Text style={[lStyles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("No medicines added yet")}
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
      <TouchableOpacity
        style={lStyles.overlay}
        activeOpacity={1}
        onPress={handleOptionsOff}
      >
        <ScrollView
          style={lStyles.mainScrollContainer}
          contentContainerStyle={lStyles.mainScrollContentContainer}
        >
          {medicines.length === 0 && renderEmptyState()}
          {medicines.map((m, idx) => {
            return (
              <MedicineListItem
                key={idx}
                medicine={m}
                hasSchedules={medicinesWithSchedules.has(m.dbId)}
                hasUnscheduledRecords={medicinesWithUnscheduledRecords.has(
                  m.dbId,
                )}
                optionsOpened={optionsOpened[idx]}
                loadData={loadData}
                onPress={handleOptionsOff}
                handleOptionsToggle={createHandleOptionsToggle(idx)}
                atLeastOneOptionsOpened={atLeastOneOptionsOpened}
              />
            );
          })}
          <TouchableOpacity
            onPress={handleAddMedicine}
            style={[lStyles.addButton, { borderColor: theme.colors.primary }]}
            disabled={atLeastOneOptionsOpened}
          >
            <Text
              style={[lStyles.addButtonText, { color: theme.colors.primary }]}
            >
              {t("+ Add Medicine")}
            </Text>
          </TouchableOpacity>
          <View style={lStyles.bottomMarginContainer}></View>
        </ScrollView>
      </TouchableOpacity>
    </DefaultMainContainer>
  );
}
