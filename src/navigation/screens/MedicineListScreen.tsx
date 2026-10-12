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
  dbGetMedicines,
  dbGetMedicineSchedules,
} from "../../models/dbAccess";
import { Medicine } from "../../models/MedicineSchedule";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { ConfirmationDialog } from "../../components/ConfirmationDialog";
import { InformationDialog } from "../../components/InformationDialog";
import { baseUnitToSingularShortForm } from "../enumMappings";
import { lStyles } from "../../commonStyles";

function MedicineListItem({
  medicine,
  hasSchedules,
  loadData,
  optionsOpened,
  handleOptionsToggle,
  onPress,
  atLeastOneOptionsOpened,
}: {
  medicine: Medicine;
  hasSchedules: boolean;
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
      medicine: medicine,
      mode: "save-and-go-back",
    });
  };

  const renderOptions = () => (
    <TouchableOpacity
      style={[lStyles.optionsOverlay, { zIndex: 1, position: "absolute" }]}
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

  return (
    <View>
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
          lStyles.itemContainer,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            filter: optionsOpened ? "blur(4px)" : "none",
          },
        ]}
        disabled={atLeastOneOptionsOpened}
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
  const [optionsOpened, setOptionsOpened] = React.useState<boolean[]>([]);
  const atLeastOneOptionsOpened = React.useMemo(
    () => optionsOpened.some((v) => v),
    [optionsOpened],
  );

  const loadData = React.useCallback(async () => {
    const medicines = await dbGetMedicines(db);
    setMedicines(medicines);

    const schedulesWithMedicines = await dbGetMedicineSchedules(db);
    const newMedicinesWithSchedules = new Set<number>();
    schedulesWithMedicines.forEach((s) => {
      newMedicinesWithSchedules.add(s.medicine.dbId);
    });
    setMedicineWithSchedules(newMedicinesWithSchedules);

    setOptionsOpened(Array.from({ length: medicines.length }, () => false));
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleAddMedicine = () => {
    if (atLeastOneOptionsOpened) {
      handleOptionsOff();
    } else {
      navigation.navigate("EditMedicineScreen", { mode: "save-and-go-back" });
    }
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
                atLeastOneOptionsOpened={atLeastOneOptionsOpened}
              />
            );
          })}
          {medicines.length === 0 && renderEmptyState()}
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
