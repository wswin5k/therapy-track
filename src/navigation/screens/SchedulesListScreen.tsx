import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import {
  dbDeleteSchedule,
  dbGetSchedulesWithMedicines,
} from "../../models/dbAccess";
import { Dose, Schedule } from "../../models/Schedule";

interface ParsedFrequency {
  intervalUnit: string;
  intervalLength: number;
  numberOfDoses: number;
}

export function SchedulesListScreen() {
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const theme = useTheme();

  const [schedules, setSchedules] = React.useState<Schedule[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getFrequencyLabel = (freq: ParsedFrequency): string => {
    const unit = freq.intervalUnit;
    const length = freq.intervalLength;
    const doses = freq.numberOfDoses;

    if (unit === "day") {
      if (doses === 1 && length === 1) return t("Once daily");
      if (doses === 2 && length === 1) return t("Twice daily");
      if (doses === 3 && length === 1) return t("Three times daily");
      return t("{{doses}} times every {{length}} days", { doses, length });
    } else if (unit === "week") {
      if (doses === 1 && length === 1) return t("Weekly");
      if (doses === 1 && length === 2) return t("Every two weeks");
      return t("{{doses}} times every {{length}} weeks", { doses, length });
    } else if (unit === "month") {
      return t("{{doses}} times every {{length}} months", { doses, length });
    }
    return t("Custom frequency");
  };

  const getDosesSummary = (doses: Dose[]): string => {
    try {
      if (doses.length === 1) {
        return t("{{count}} dose", { count: doses[0].amount });
      }
      return t("{{count}} doses", { count: doses.length });
    } catch {
      return t("Unknown doses");
    }
  };

  const loadSchedules = React.useCallback(async () => {
    const result = await dbGetSchedulesWithMedicines(db);
    setSchedules(result);
  }, []);

  const handleDelete = async (id: number) => {
    await dbDeleteSchedule(db, id);
    await loadSchedules();
  };

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

  const renderScheduleItem = ({ item }: { item: Schedule }) => {
    const frequencyLabel = getFrequencyLabel(item.freq);
    const dosesSummary = getDosesSummary(item.doses);
    const dateRange = item.endDate
      ? `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`
      : `${formatDate(item.startDate)} - ${t("No end date")}`;

    return (
      <View
        style={[
          styles.scheduleItem,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.scheduleContent}>
          <Text style={[styles.medicineName, { color: theme.colors.text }]}>
            {item.medicine.name}
          </Text>
          <Text
            style={[styles.frequency, { color: theme.colors.textSecondary }]}
          >
            {frequencyLabel}
          </Text>
          <Text style={[styles.doses, { color: theme.colors.textSecondary }]}>
            {dosesSummary}
          </Text>
          <Text
            style={[styles.dateRange, { color: theme.colors.textTertiary }]}
          >
            {dateRange}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
          onPress={() => handleDelete(item.dbId)}
        >
          <Text style={styles.deleteButtonText}>{t("Delete")}</Text>
        </TouchableOpacity>
      </View>
    );
  };

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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <FlatList
        data={schedules}
        renderItem={renderScheduleItem}
        keyExtractor={(item) => item.dbId.toString()}
        contentContainerStyle={
          schedules.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
