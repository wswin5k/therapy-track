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
  dbDeleteSchedule,
  dbGetSchedulesWithMedicines,
} from "../../models/dbAccess";
import { Schedule } from "../../models/Schedule";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { RootStackParamList } from "..";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type EditMedicineScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "EditMedicineScreen"
>;
function ScheduleListItem({
  schedule,
  loadSchedules,
  optionsOpened,
  handleOptionsToggle,
}: {
  schedule: Schedule;
  loadSchedules: () => Promise<void>;
  optionsOpened: boolean;
  handleOptionsToggle: () => void;
}) {
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const navigation = useNavigation<EditMedicineScreenNavigationProp>();
  const theme = useTheme();

  const handleDelete = async (id: number) => {
    await dbDeleteSchedule(db, id);
    await loadSchedules();
  };

  const handleEdit = () => {
    navigation.navigate("EditScheduleScreen", {
      medicine: schedule.medicine,
      scheduleId: schedule.dbId,
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const frequencyLabel = schedule.freq.getFrequencyLabel();
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
        <Text style={styles.optionsButtonText}>{t("Edit")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={() => handleDelete(schedule.dbId)}
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
      {optionsOpened && renderOptions()}

      <TouchableOpacity
        onLongPress={handleOptionsToggle}
        style={[
          styles.scheduleItem,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            filter: optionsOpened ? "blur(4px)" : "none",
          },
        ]}
      >
        <View style={styles.scheduleContent}>
          <Text style={[styles.medicineName, { color: theme.colors.text }]}>
            {schedule.medicine.name}
          </Text>
          <Text style={[styles.doses, { color: theme.colors.textSecondary }]}>
            {t(schedule.medicine.baseUnit, { count: 2 })}
          </Text>
          <Text
            style={[styles.frequency, { color: theme.colors.textSecondary }]}
          >
            {frequencyLabel}
          </Text>

          <Text
            style={[styles.dateRange, { color: theme.colors.textSecondary }]}
          >
            {dateRange}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function SchedulesListScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  const [schedules, setSchedules] = React.useState<Schedule[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [optionsOpened, setOptionsOpened] = React.useState<Array<boolean>>([]);

  const loadSchedules = React.useCallback(async () => {
    const result = await dbGetSchedulesWithMedicines(db);
    setSchedules(result);
    setOptionsOpened(Array.from({ length: result.length }, () => false));
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadSchedules();
    setRefreshing(false);
  }, [loadSchedules]);

  useFocusEffect(
    React.useCallback(() => {
      loadSchedules();
    }, [loadSchedules]),
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

  return (
    <DefaultMainContainer>
      <ScrollView style={styles.list}>
        {schedules.map((s, idx) => {
          return (
            <ScheduleListItem
              key={idx}
              schedule={s}
              optionsOpened={optionsOpened[idx]}
              loadSchedules={loadSchedules}
              handleOptionsToggle={createHandleOptionsToggle(idx)}
            />
          );
        })}
        {!schedules && renderEmptyState()}
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
  scheduleItem: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
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
  scheduleContent: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  frequency: {
    fontSize: 14,
    marginBottom: 2,
  },
  doses: {
    fontSize: 14,
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 13,
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
});
