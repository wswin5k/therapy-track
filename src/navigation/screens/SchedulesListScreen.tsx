import React, { useCallback, useState } from "react";
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
import { useFocusEffect } from "@react-navigation/native";

interface ScheduleRow {
  id: number;
  medicine: number;
  medicine_name: string;
  start_date: string;
  end_date: string | null;
  doses: string;
  freq: string;
}

interface ParsedFrequency {
  intervalUnit: string;
  intervalLength: number;
  numberOfDoses: number;
}

export function SchedulesListScreen() {
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const parseFrequency = (freqStr: string): ParsedFrequency => {
    try {
      return JSON.parse(freqStr);
    } catch {
      return { intervalUnit: "day", intervalLength: 1, numberOfDoses: 1 };
    }
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

  const getDosesSummary = (dosesStr: string): string => {
    try {
      const doses: number[] = JSON.parse(dosesStr);
      if (doses.length === 1) {
        return t("{{count}} dose", { count: doses[0] });
      }
      return t("{{count}} doses", { count: doses.length });
    } catch {
      return t("Unknown doses");
    }
  };

  const loadSchedules = useCallback(async () => {
    try {
      const result = await db.getAllAsync<ScheduleRow>(`
        SELECT s.id, s.medicine, m.name as medicine_name, s.start_date, s.end_date, s.doses, s.freq
        FROM schedules s
        JOIN medicines m ON s.medicine = m.id
        ORDER BY s.start_date DESC
      `);
      setSchedules(result);
    } catch (error) {
      console.error("Error loading schedules:", error);
    }
  }, [db]);

  const handleDelete = async (id: number) => {
    try {
      await db.runAsync("DELETE FROM schedules WHERE id = ?", id);
      await loadSchedules();
    } catch (error) {
      console.error("Error deleting schedule:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSchedules();
    setRefreshing(false);
  }, [loadSchedules]);

  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [loadSchedules]),
  );

  const renderScheduleItem = ({ item }: { item: ScheduleRow }) => {
    const freq = parseFrequency(item.freq);
    const frequencyLabel = getFrequencyLabel(freq);
    const dosesSummary = getDosesSummary(item.doses);
    const dateRange = item.end_date
      ? `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`
      : `${formatDate(item.start_date)} - ${t("No end date")}`;

    return (
      <View style={styles.scheduleItem}>
        <View style={styles.scheduleContent}>
          <Text style={styles.medicineName}>{item.medicine_name}</Text>
          <Text style={styles.frequency}>{frequencyLabel}</Text>
          <Text style={styles.doses}>{dosesSummary}</Text>
          <Text style={styles.dateRange}>{dateRange}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteButtonText}>{t("Delete")}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{t("No schedules yet")}</Text>
      <Text style={styles.emptySubtext}>
        {t("Add a schedule from the Home screen")}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={schedules}
        renderItem={renderScheduleItem}
        keyExtractor={(item) => item.id.toString()}
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
    backgroundColor: "#fff",
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
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  scheduleContent: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  frequency: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  doses: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 13,
    color: "#999",
  },
  deleteButton: {
    backgroundColor: "#ff3b30",
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
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
