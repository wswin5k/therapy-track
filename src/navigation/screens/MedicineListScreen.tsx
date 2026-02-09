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
import { useFocusEffect } from "@react-navigation/native";
import {
  dbGetMedicines,
  dbGetSchedulesWithMedicines,
} from "../../models/dbAccess";
import { Medicine } from "../../models/Medicine";

export function MedicineListScreen() {
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();

  const [medicines, setMedicines] = React.useState<Medicine[]>([]);

  const loadMedicines = React.useCallback(async () => {
    const result = await dbGetMedicines(db);
    setMedicines(result);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadMedicines();
    }, [loadMedicines]),
  );

  const handleDelete = async (id: number) => {
    await dbDeleteMedicine(db, id);
    await loadMedicines();
  };

  const renderItem = ({ item }: { item: Medicine }) => {
    return (
      <View style={styles.scheduleItem}>
        <View style={styles.scheduleContent}>
          <Text style={styles.medicineName}>{item.name}</Text>
          <Text style={styles.doses}>{item.baseUnit}</Text>
          <Text style={styles.doses}>{item.activeIngredientsString()}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.dbId)}
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
        data={medicines}
        renderItem={renderItem}
        keyExtractor={(item) => item.dbId.toString()}
        contentContainerStyle={
          medicines.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={renderEmptyState}
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
