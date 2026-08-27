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
  dbDeleteMedicineSchedule,
  dbDeleteScheduledDosageRecordsForSchedule,
  dbGetMedicineSchedules,
} from "../../models/dbAccess";
import { Schedule } from "../../models/MedicineSchedule";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { ConfirmationDialog } from "../../components/ConfirmationDialog";
import { RootStackParamList } from "..";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  baseUnitToSingularShortForm,
  frequencySelectionToDisplayForm,
} from "../enumMappings";

type EditMedicineScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditMedicineScheduleScreen"
>;

function ScheduleListItem({
  schedule,
  loadSchedules,
  optionsOpened,
  handleOptionsToggle,
  onPress,
}: {
  schedule: Schedule;
  loadSchedules: () => Promise<void>;
  optionsOpened: boolean;
  handleOptionsToggle: () => void;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const navigation = useNavigation<EditMedicineScreenNavigationProp>();
  const theme = useTheme();
  const [deleteDialogVisible, setDeleteDialogVisible] = React.useState(false);

  const handleDelete = () => {
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    await dbDeleteScheduledDosageRecordsForSchedule(db, schedule.dbId);
    await dbDeleteMedicineSchedule(db, schedule.dbId);
    setDeleteDialogVisible(false);
    await loadSchedules();
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
    handleOptionsToggle();
  };

  const handleEdit = () => {
    navigation.navigate("PartiallyEditAnyScheduleScreen", {
      scheduleId: schedule.dbId,
      scheduleType: "medicine",
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const frequencyLabel = frequencySelectionToDisplayForm(
    schedule.freq.getFrequencyLabel(),
  );
  const dateRange = schedule.endDate
    ? `${formatDate(schedule.startDate)} - ${formatDate(schedule.endDate)}`
    : `${formatDate(schedule.startDate)} - ${t("No end date")}`;

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
        <Text style={styles.optionsButtonText}>{t("Edit dates")}</Text>
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
        message={t(
          "This action is going to pernamently delete the schedule and " +
            "all of its associated dosage records. Do you want to proceed?",
        )}
        confirmText={t("Delete")}
        cancelText={t("Cancel")}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      {optionsOpened && renderOptions()}

      <TouchableOpacity
        onPress={onPress}
        onLongPress={handleOptionsToggle}
        style={[
          styles.scheduleItem,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            filter: optionsOpened ? "blur(4px)" : "none",
          },
        ]}
      >
        <View style={styles.scheduleContent}>
          <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
            {schedule.medicine.name}
          </Text>
          <Text
            style={[styles.itemText, { color: theme.colors.textSecondary }]}
          >
            {t(baseUnitToSingularShortForm[schedule.medicine.baseUnit], {
              count: 2,
            })}
          </Text>
          <Text
            style={[styles.itemText, { color: theme.colors.textSecondary }]}
          >
            {frequencyLabel}
          </Text>

          <Text
            style={[styles.itemText, { color: theme.colors.textSecondary }]}
          >
            {dateRange}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function MedicineSchedulesListScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [schedules, setSchedules] = React.useState<Schedule[]>([]);
  const [optionsOpened, setOptionsOpened] = React.useState<boolean[]>([]);

  const loadSchedules = React.useCallback(async () => {
    const result = await dbGetMedicineSchedules(db);
    setSchedules(result);
    setOptionsOpened(Array.from({ length: result.length }, () => false));
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      loadSchedules();
    }, [loadSchedules]),
  );

  const handleAddSchedule = () => {
    navigation.navigate("SelectMedicineScreen", { mode: "schedule" });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("No medicine schedules added yet.")}
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
        {t("Add a medicine schedule from the Home screen.")}
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
        {schedules.length === 0 && renderEmptyState()}
        {schedules.map((s, idx) => {
          return (
            <ScheduleListItem
              key={idx}
              schedule={s}
              optionsOpened={optionsOpened[idx]}
              loadSchedules={loadSchedules}
              onPress={handleOptionsOff}
              handleOptionsToggle={createHandleOptionsToggle(idx)}
            />
          );
        })}
        <TouchableOpacity
          onPress={handleAddSchedule}
          style={[styles.addButton, { borderColor: theme.colors.primary }]}
        >
          <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
            {t("+ Add Medicine Schedule")}
          </Text>
        </TouchableOpacity>
        <View style={styles.bottomMarginContainer}></View>
      </ScrollView>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 18,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scheduleItem: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  bottomMarginContainer: {
    height: 40,
    width: "100%",
  },
  optionsOverlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "rgba(255, 0, 0, 0.0)",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scheduleContent: {
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
  addButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
});
