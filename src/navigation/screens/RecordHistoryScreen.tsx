import {
  Alert,
  Platform,
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
import React from "react";
import {
  dbGetAssessments,
  dbGetAssessmentSchedules,
  dbGetGroups,
  dbGetMedicines,
  dbGetScheduledDosageRecords,
  dbGetScheduledMeasurmentRecords,
  dbGetMedicineSchedules,
  dbGetUnscheduledDosageRecords,
  dbGetUnscheduledMeasurmentRecords,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import {
  IngredientAmountUnit,
  maxWeightUnit,
  MedicineSchedule,
  weightUnitToGramsMultiplier,
} from "../../models/MedicineSchedule";
import Ionicons from "@react-native-vector-icons/ionicons";
import * as FileSystem from "expo-file-system/legacy";
import { shareAsync } from "expo-sharing";
import { Medicine } from "../../models/MedicineSchedule";
import { useTranslation } from "react-i18next";
import {
  Assessment,
  AssessmentSchedule,
} from "../../models/AssessmentSchedule";
import { Group } from "../../models/Frequency";
import {
  baseUnitShorFormPlural,
  ingredientAmountUnitEnumToDisplayForm,
} from "../enumMappings";
import StickyTable from "../../components/StickyTable";
import { getTodayDateOnly, serializeDateOnly } from "../../dateOnlyUtils";
import { RecordHistoryConfiguration } from "./RecordHistoryConfigurationScreen";
import { getOrThrow } from "../utils";

function extractDate(datetime: Date): string {
  return serializeDateOnly(datetime);
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
  handleOpenConfiguration,
}: {
  visible: boolean;
  onClose: () => void;
  handleSaveToCSV: () => void;
  handleOpenConfiguration: () => void;
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
          <TouchableOpacity
            style={[styles.menuItem, { borderColor: theme.colors.border }]}
            onPress={handleOpenConfiguration}
          >
            <Text style={[styles.menuText, { color: theme.colors.text }]}>
              Configure columns
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  );
}

export function RecordHistoryScreen() {
  const { t, i18n } = useTranslation();
  const db = useSQLiteContext();
  const theme = useTheme();
  const navigation = useNavigation();

  const [rowHeaders, setRowHeaders] = React.useState<string[]>([]);
  const [columnHeaders, setColumnHeaders] = React.useState<string[]>([]);
  const [cells, setCells] = React.useState<string[][]>([]);

  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);
  const [recordHistoryConfiguration, setRecordHistoryConfiguration] =
    React.useState<RecordHistoryConfiguration>(
      new RecordHistoryConfiguration(true, true, true, false, []),
    );
  const formatDate = React.useCallback(
    (date: Date) => {
      return new Intl.DateTimeFormat(i18n.resolvedLanguage, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    },
    [i18n.resolvedLanguage],
  );

  function calculateHeaders<T>(
    fullHeaderToShortHeader: Map<string, string>,
    shortHeaderCounts: Map<string, number>,
    dayToHeaderToValues: Map<string, Map<string, T>>,
  ): string[] {
    const headers = [];
    for (const [fullHeader, shortHeader] of fullHeaderToShortHeader) {
      if (shortHeaderCounts.get(shortHeader) === 1) {
        headers.push(shortHeader);

        if (fullHeader !== shortHeader) {
          for (const headerToValues of dayToHeaderToValues.values()) {
            const values = headerToValues.get(fullHeader);
            if (!values) {
              continue;
            }
            headerToValues.set(shortHeader, values);
            headerToValues.delete(fullHeader);
          }
        }
      } else {
        headers.push(fullHeader);
      }
    }
    headers.sort();
    return headers;
  }

  function updateHeaderCounter(
    fullHeaderToShortHeader: Map<string, string>,
    shortHeaderCounts: Map<string, number>,
    fullHeader: string,
    shortHeader: string,
  ) {
    if (!fullHeaderToShortHeader.has(fullHeader)) {
      fullHeaderToShortHeader.set(fullHeader, shortHeader);
      shortHeaderCounts.set(
        shortHeader,
        (shortHeaderCounts.get(shortHeader) || 0) + 1,
      );
    }
  }

  function insertActiveIngredientWeightUnits(
    dayToHeaderToValues: Map<string, Map<string, number>>,
    fullHeaderToShortHeader: Map<string, string>,
    shortHeaderCounts: Map<string, number>,
    fullHeaderToWeightUnits: Map<string, Set<IngredientAmountUnit>>,
  ) {
    for (const [fullHeader, weightUnits] of fullHeaderToWeightUnits) {
      const weightUnit = maxWeightUnit([...weightUnits]);
      const weightUnitMultiplier = weightUnitToGramsMultiplier(weightUnit);
      const weightUnitDisplay =
        ingredientAmountUnitEnumToDisplayForm(weightUnit);

      const newFullHeader = `${fullHeader} [${weightUnitDisplay}]`;
      const shortHeader = getOrThrow(fullHeaderToShortHeader, fullHeader);
      const newShortHeader = `${shortHeader} [${weightUnitDisplay}]`;

      fullHeaderToShortHeader.set(newFullHeader, newShortHeader);
      fullHeaderToShortHeader.delete(fullHeader);

      if (shortHeaderCounts.has(shortHeader)) {
        shortHeaderCounts.set(
          newShortHeader,
          getOrThrow(shortHeaderCounts, shortHeader),
        );
        shortHeaderCounts.delete(shortHeader);
      }

      for (const headerToValues of dayToHeaderToValues.values()) {
        const value = headerToValues.get(fullHeader);
        if (!value) {
          continue;
        }
        headerToValues.set(newFullHeader, value / weightUnitMultiplier);
        headerToValues.delete(fullHeader);
      }
    }
  }

  const getAssessmentData = React.useCallback(async (): Promise<
    [string[], Map<string, Map<string, string>>]
  > => {
    const scheuledMeasurmentRecrods = await dbGetScheduledMeasurmentRecords(db);
    const unscheduledMeasurmentRecords =
      await dbGetUnscheduledMeasurmentRecords(db);

    const assessmentSchedules = await dbGetAssessmentSchedules(db);
    const idToAssessmentSchedule = new Map<number, AssessmentSchedule>();
    assessmentSchedules.forEach((a) => {
      idToAssessmentSchedule.set(a.dbId, a);
    });

    const groups = await dbGetGroups(db);
    const idToGroup = new Map<number, Group>();
    groups.forEach((g) => {
      idToGroup.set(g.dbId, g);
    });

    const assessments = await dbGetAssessments(db);
    const idToAssessment = new Map<number, Assessment>();
    assessments.forEach((a) => {
      idToAssessment.set(a.dbId, a);
    });

    const dayToHeaderToValues = new Map<string, Map<string, string>>();

    /* to handle shortening of header labels*/
    const fullHeaderToShortHeader = new Map<string, string>();
    const shortHeaderCounts = new Map<string, number>();

    const getGroupLabel = (groupId: number | null): string => {
      const group = groupId === null ? null : idToGroup.get(groupId);
      let groupLabel = "";
      if (group === undefined) {
        throw Error("Measurment record has invalid group.");
      } else if (group === null) {
        groupLabel = "ungrouped";
      } else {
        groupLabel = group?.name;
      }
      return groupLabel;
    };

    for (const r of unscheduledMeasurmentRecords) {
      const dateStr = extractDate(r.date);
      const dailyRow =
        dayToHeaderToValues.get(extractDate(r.date)) ||
        new Map<string, string>();

      const assessment = idToAssessment.get(r.assessmentId);
      if (!assessment) {
        throw Error("Record not connected to assessment.");
      }

      const groupLabel = getGroupLabel(r.groupId);
      const fullHeader = `${assessment.name} – ${groupLabel}`;
      const shortHeader = assessment.name;

      updateHeaderCounter(
        fullHeaderToShortHeader,
        shortHeaderCounts,
        fullHeader,
        shortHeader,
      );

      dailyRow.set(fullHeader, r.value.toString());
      dayToHeaderToValues.set(dateStr, dailyRow);
    }

    for (const r of scheuledMeasurmentRecrods) {
      const dateStr = extractDate(r.date);
      const dailyRow =
        dayToHeaderToValues.get(dateStr) || new Map<string, string>();

      const assessmentSchedule = idToAssessmentSchedule.get(
        r.assessmentScheduleId,
      );
      if (!assessmentSchedule) {
        throw Error("Record not connected to assessment schedule.");
      }
      const measurment = assessmentSchedule.measurments[r.measurmentIndex];

      const groupLabel = getGroupLabel(measurment.groupId);
      const fullHeader = `${assessmentSchedule.assessment.name} – ${groupLabel}`;
      const shortHeader = assessmentSchedule.assessment.name;

      updateHeaderCounter(
        fullHeaderToShortHeader,
        shortHeaderCounts,
        fullHeader,
        shortHeader,
      );

      dailyRow.set(fullHeader, r.value.toString());
      dayToHeaderToValues.set(dateStr, dailyRow);
    }

    const headers = calculateHeaders(
      fullHeaderToShortHeader,
      shortHeaderCounts,
      dayToHeaderToValues,
    );

    return [headers, dayToHeaderToValues];
  }, [db]);

  const getMedicineData = React.useCallback(async (): Promise<
    [string[], Map<string, Map<string, number>>]
  > => {
    const scheduledDosageRecords = await dbGetScheduledDosageRecords(db);
    const unscheduledDosageRecords = await dbGetUnscheduledDosageRecords(db);

    const schedules = await dbGetMedicineSchedules(db);
    const idToSchedule = new Map<number, MedicineSchedule>();
    schedules.forEach((s) => {
      idToSchedule.set(s.dbId, s);
    });

    const medicines = await dbGetMedicines(db);
    const idToMedicine = new Map<number, Medicine>();
    medicines.forEach((m) => {
      idToMedicine.set(m.dbId, m);
    });

    const dayToHeaderToValues = new Map<string, Map<string, number>>();

    /* to handle shortening of header labels*/
    const fullHeaderToShortHeader = new Map<string, string>();
    const shortHeaderCounts = new Map<string, number>();

    const fullActiveIngredientHeaderToWeightUnits = new Map<
      string,
      Set<IngredientAmountUnit>
    >();

    for (const r of unscheduledDosageRecords) {
      const dateStr = extractDate(r.date);
      const dailyRow =
        dayToHeaderToValues.get(dateStr) || new Map<string, number>();

      const medicine = idToMedicine.get(r.medicineId);
      if (!medicine) {
        throw Error("Record not connected to medicine.");
      }
      const baseUnitLabel = baseUnitShorFormPlural(medicine.baseUnit);

      if (recordHistoryConfiguration.showActiveIngredients) {
        for (const ai of medicine.activeIngredients) {
          const fullHeader = `${ai.name} – ${baseUnitLabel}`;
          const shortHeader = `${ai.name}`;

          fullActiveIngredientHeaderToWeightUnits.set(
            fullHeader,
            (
              fullActiveIngredientHeaderToWeightUnits.get(fullHeader) ||
              new Set()
            ).add(ai.unit),
          );

          updateHeaderCounter(
            fullHeaderToShortHeader,
            shortHeaderCounts,
            fullHeader,
            shortHeader,
          );

          const weightUnitMultiplier = weightUnitToGramsMultiplier(ai.unit);
          let amountTotal = dailyRow.get(fullHeader) || 0;
          amountTotal += ai.amount * r.amount * weightUnitMultiplier;
          dailyRow.set(fullHeader, amountTotal);
        }
      }

      if (recordHistoryConfiguration.showMedicines) {
        const header = `${medicine.name} [${baseUnitLabel}]`;
        let amountTotal = dailyRow.get(header) || 0;

        updateHeaderCounter(
          fullHeaderToShortHeader,
          shortHeaderCounts,
          header,
          header,
        );

        amountTotal += r.amount;
        dailyRow.set(header, amountTotal);
      }

      dayToHeaderToValues.set(dateStr, dailyRow);
    }

    for (const r of scheduledDosageRecords) {
      const dateStr = extractDate(r.date);
      const dailyRow =
        dayToHeaderToValues.get(dateStr) || new Map<string, number>();

      const schedule = idToSchedule.get(r.medicineScheduleId);
      if (!schedule) {
        throw Error("Record not connected to medicine schedule.");
      }

      const medicine = schedule.medicine;
      const baseUnitLabel = baseUnitShorFormPlural(medicine.baseUnit);

      if (recordHistoryConfiguration.showActiveIngredients) {
        for (const ai of medicine.activeIngredients) {
          const fullHeader = `${ai.name} – ${baseUnitLabel}`;
          const shortHeader = `${ai.name}`;

          fullActiveIngredientHeaderToWeightUnits.set(
            fullHeader,
            (
              fullActiveIngredientHeaderToWeightUnits.get(fullHeader) ||
              new Set()
            ).add(ai.unit),
          );

          updateHeaderCounter(
            fullHeaderToShortHeader,
            shortHeaderCounts,
            fullHeader,
            shortHeader,
          );

          const weightUnitMultiplier = weightUnitToGramsMultiplier(ai.unit);
          let amountTotal = dailyRow.get(fullHeader) || 0;
          amountTotal +=
            ai.amount *
            schedule.dosages[r.dosageIndex].amount *
            weightUnitMultiplier;
          dailyRow.set(fullHeader, amountTotal);
        }
      }

      if (recordHistoryConfiguration.showMedicines) {
        const header = `${medicine.name} [${baseUnitLabel}]`;

        updateHeaderCounter(
          fullHeaderToShortHeader,
          shortHeaderCounts,
          header,
          header,
        );

        let amountTotal = dailyRow.get(header) || 0;
        amountTotal += schedule.dosages[r.dosageIndex].amount;
        dailyRow.set(header, amountTotal);
      }
      dayToHeaderToValues.set(dateStr, dailyRow);
    }

    insertActiveIngredientWeightUnits(
      dayToHeaderToValues,
      fullHeaderToShortHeader,
      shortHeaderCounts,
      fullActiveIngredientHeaderToWeightUnits,
    );

    const headers = calculateHeaders(
      fullHeaderToShortHeader,
      shortHeaderCounts,
      dayToHeaderToValues,
    );

    return [headers, dayToHeaderToValues];
  }, [
    db,
    recordHistoryConfiguration.showActiveIngredients,
    recordHistoryConfiguration.showMedicines,
  ]);

  const loadAndCombineDataForTable = React.useCallback(async () => {
    const [medicinesHeaders, medicinesHistory] = await getMedicineData();
    const [assessmentsHeaders, assessmentsHistory] =
      recordHistoryConfiguration.showAssessments
        ? await getAssessmentData()
        : [[], new Map()];

    const newTableRows = new Array();

    const daysSet = new Set([
      ...medicinesHistory.keys(),
      ...assessmentsHistory.keys(),
    ]);
    const days = Array.from(daysSet).sort().reverse();

    const newRowHeaders = new Array();

    for (const day of days) {
      const record = [];
      for (const header of medicinesHeaders) {
        const value = medicinesHistory.get(day)?.get(header);
        if (value) {
          record.push(value.toString());
        } else {
          record.push("");
        }
      }
      for (const header of assessmentsHeaders) {
        const value = assessmentsHistory.get(day)?.get(header);
        if (value) {
          record.push(value.toString());
        } else {
          record.push("");
        }
      }
      newTableRows.push(record);
      newRowHeaders.push(formatDate(new Date(day)));
    }

    const headers = medicinesHeaders.concat(assessmentsHeaders);
    headers.unshift("Date");

    setColumnHeaders(headers);
    setRowHeaders(newRowHeaders);
    setCells(newTableRows);
  }, [
    getAssessmentData,
    getMedicineData,
    formatDate,
    recordHistoryConfiguration.showAssessments,
  ]);

  const loadConfiguration = React.useCallback(async () => {
    setRecordHistoryConfiguration(
      new RecordHistoryConfiguration(true, true, true, false, []),
    );
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadAndCombineDataForTable();
      loadConfiguration();
    }, [loadAndCombineDataForTable, loadConfiguration]),
  );

  const handleMenuToggle = React.useCallback(() => {
    setIsMenuOpen(!isMenuOpen);
  }, [isMenuOpen]);

  const handleSaveToCSV = React.useCallback(async () => {
    try {
      const csvContent = generateCSV(columnHeaders, cells);

      const today = getTodayDateOnly();
      const todayStr = serializeDateOnly(today);
      const fileName = `dosage-history-${todayStr}.csv`;

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
        }
        /*
        else {
          await shareAsync(tempFileUri, {
            mimeType: "text/csv",
            dialogTitle: "Share CSV File",
          });
        } */
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
  }, [cells, columnHeaders]);

  const handleOpenConfiguration = React.useCallback(() => {
    setIsMenuOpen(false);
  }, []);

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
  }, [navigation, isMenuOpen, handleMenuToggle, theme.colors]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("No dosage records found.")}
      </Text>
    </View>
  );

  return (
    <DefaultMainContainer>
      <MenuModal
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        handleSaveToCSV={handleSaveToCSV}
        handleOpenConfiguration={handleOpenConfiguration}
      ></MenuModal>
      {cells.length === 0 ? (
        renderEmptyState()
      ) : (
        <View style={[styles.mainContainer]}>
          <StickyTable
            columnHeaders={columnHeaders}
            rowHeaders={rowHeaders}
            data={cells}
          />
        </View>
      )}
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    padding: 36,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 8,
  },
  mainContainer: {
    padding: 6,
    width: "100%",
    height: "100%",
  },
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
    alignItems: "center",
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  menuItem: {
    alignContent: "flex-start",
    padding: 20,
    borderBottomWidth: 2,
    width: "100%",
  },
  menuText: {
    alignItems: "center",
  },
});
