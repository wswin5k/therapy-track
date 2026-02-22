import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import {
  useFocusEffect,
  useNavigation,
  useTheme,
} from "@react-navigation/native";
import { DataTable } from "react-native-paper";
import React from "react";
import {
  dbGetMedicines,
  dbGetScheduledDosageRecords,
  dbGetSchedulesWithMedicines,
  dbGetUnscheduledDosageRecords,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { Schedule } from "../../models/Schedule";
import Ionicons from "@react-native-vector-icons/ionicons";
import * as FileSystem from "expo-file-system/legacy";
import { shareAsync } from "expo-sharing";
import { Medicine } from "../../models/Medicine";

function extractDate(datetime: Date): string {
  return datetime.toISOString().split("T")[0];
}

function escapeCSVField(field: string): string {
  if (
    field.includes(",") ||
    field.includes('"') ||
    field.includes("\n") ||
    field.includes("\r")
  ) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function generateCSV(headers: string[], records: string[][]): string {
  const csvRows: string[] = [];

  csvRows.push(headers.map(escapeCSVField).join(","));

  for (const record of records) {
    csvRows.push(record.map(escapeCSVField).join(","));
  }

  return csvRows.join("\n");
}

export function MenuModal({
  visible,
  onClose,
  handleSaveToCSV,
}: {
  visible: boolean;
  onClose: () => void;
  handleSaveToCSV: () => void;
}) {
  const theme = useTheme();

  return (
    visible && (
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.menuContainer,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.menuItem, { borderColor: theme.colors.border }]}
            onPress={handleSaveToCSV}
          >
            <Text style={[styles.menuText, { color: theme.colors.text }]}>
              Save to CSV
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  );
}

export function RecordHistoryScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const navigation = useNavigation();

  const [dailyRecords, setDailyRecords] = React.useState<string[][]>([]);
  const [tableHeaders, setTableHeaders] = React.useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);

  const loadData = React.useCallback(async () => {
    const scheduledRecords = await dbGetScheduledDosageRecords(db);
    console.log(scheduledRecords);

    const schedules = await dbGetSchedulesWithMedicines(db);
    const schedulesMap = new Map<number, Schedule>();

    schedules.forEach((s) => {
      schedulesMap.set(s.dbId, s);
    });

    const dayToHeaderValues = new Map<string, Map<string, number>>();
    const headersSet = new Set<string>();

    for (const r of scheduledRecords) {
      const dRecrod =
        dayToHeaderValues.get(extractDate(r.date)) || new Map<string, number>();

      const schedule = schedulesMap.get(r.scheduleId);
      if (!schedule) {
        throw Error("Record not connected to schedule");
      }
      const medicine = schedule.medicine;

      for (const ai of medicine.activeIngredients) {
        const label = `${ai.name} [${ai.unit}]`;
        headersSet.add(label.slice(0, 200));
        let amountTotal = dRecrod.get(label) || 0;
        amountTotal += ai.amount * schedule.doses[r.doseIndex].amount;
        dRecrod.set(label, amountTotal);
      }
      dayToHeaderValues.set(extractDate(r.date), dRecrod);
    }

    const unscheduledRecords = await dbGetUnscheduledDosageRecords(db);
    const medicine = await dbGetMedicines(db);
    const medicineMap = new Map<number, Medicine>();
    for (const m of medicine) {
      medicineMap.set(m.dbId, m);
    }

    for (const r of unscheduledRecords) {
      const dRecrod =
        dayToHeaderValues.get(extractDate(r.date)) || new Map<string, number>();

      const medicine = medicineMap.get(r.medicineId);

      if (!medicine) {
        throw Error("Record not connected to medicine");
      }

      for (const ai of medicine.activeIngredients) {
        const label = `${ai.name} [${ai.unit}]`;
        headersSet.add(label.slice(0, 200));
        let amountTotal = dRecrod.get(label) || 0;
        amountTotal += ai.amount * r.amount;
        dRecrod.set(label, amountTotal);
      }
      dayToHeaderValues.set(extractDate(r.date), dRecrod);
    }

    const newDailyRecords = new Array();

    const days = Array.from(dayToHeaderValues.keys()).sort().reverse();

    for (const day of days) {
      const record = [day];
      for (const header of headersSet) {
        const value = dayToHeaderValues.get(day)?.get(header);
        if (value) {
          record.push(value.toString());
        } else {
          record.push("");
        }
      }
      newDailyRecords.push(record);
    }
    setDailyRecords(newDailyRecords);
    const newTableHeaders = Array.from(headersSet);
    newTableHeaders.unshift("Date");
    setTableHeaders(newTableHeaders);

    console.log(headersSet);
    console.log(days);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSaveToCSV = React.useCallback(async () => {
    try {
      const csvContent = generateCSV(tableHeaders, dailyRecords);

      const today = new Date().toISOString().split("T")[0];
      const fileName = `dosage-history-${today}.csv`;

      const tempFileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(tempFileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (Platform.OS === "android") {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (permissions.granted) {
          const directoryUri = permissions.directoryUri;
          const fileUri =
            await FileSystem.StorageAccessFramework.createFileAsync(
              directoryUri,
              fileName,
              "text/csv",
            );
          await FileSystem.writeAsStringAsync(fileUri, csvContent, {
            encoding: FileSystem.EncodingType.UTF8,
          });
        } else {
          await shareAsync(tempFileUri, {
            mimeType: "text/csv",
            dialogTitle: "Share CSV File",
          });
        }
      } else {
        await shareAsync(tempFileUri, {
          UTI: ".csv",
          mimeType: "text/csv",
        });
      }
    } catch (error) {
      Alert.alert("Error", `Failed to save the file ${error}`);
    }
    setIsMenuOpen(false);
  }, [dailyRecords, tableHeaders]);

  React.useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleMenuToggle}
          style={{ marginLeft: 16, marginRight: 20 }}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isMenuOpen]);

  const hasRecords = dailyRecords.length > 0;

  return (
    <DefaultMainContainer>
      <MenuModal
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        handleSaveToCSV={handleSaveToCSV}
      ></MenuModal>
      {!hasRecords ? (
        <Text
          style={[styles.emptyState, { color: theme.colors.textSecondary }]}
        >
          No dosage records found
        </Text>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContainer]}
          horizontal={true}
        >
          <DataTable>
            <DataTable.Row
              style={[
                styles.tableHeader,
                {
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
              {Array.from(tableHeaders).map((header, idx) => {
                return (
                  <DataTable.Cell
                    key={idx}
                    style={[
                      styles.tableCell,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    textStyle={[
                      styles.headerText,
                      { color: theme.colors.text },
                    ]}
                  >
                    {header}
                  </DataTable.Cell>
                );
              })}
            </DataTable.Row>

            {dailyRecords.map((values, index) => (
              <DataTable.Row
                key={index}
                style={[
                  styles.tableRow,
                  {
                    borderBottomColor: theme.colors.border,
                  },
                ]}
              >
                {values.map((v, idx) => (
                  <DataTable.Cell
                    key={idx}
                    style={[
                      styles.tableCell,

                      {
                        borderColor: theme.colors.border,

                        backgroundColor:
                          index % 2 === 0
                            ? theme.colors.surface
                            : theme.colors.card,
                      },
                    ]}
                    textStyle={[styles.cellText, { color: theme.colors.text }]}
                    numeric={idx === 0 ? false : true}
                  >
                    {v}
                  </DataTable.Cell>
                ))}
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
      )}
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
    fontStyle: "italic",
  },
  scrollContainer: {},
  tableHeader: {
    margin: 0,
  },
  headerText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  tableRow: {},
  tableCell: {
    borderWidth: 1,
    minHeight: 48,
    padding: 10,
    width: 150,
  },
  cellText: {
    fontSize: 14,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.0)",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    width: "100%",
    zIndex: 1,
  },
  menuContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  menuItem: {
    alignItems: "center",
  },
  menuText: {
    alignItems: "center",
  },
});
