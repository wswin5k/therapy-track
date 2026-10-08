import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DefaultMainContainer } from "../../../components/DefaultMainContainer";
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
  dbGetScheduledMeasurementRecords,
  dbGetMedicineSchedules,
  dbGetUnscheduledDosageRecords,
  dbGetUnscheduledMeasurementRecords,
  dbGetHistoryTableSettings,
  dbUpdateHistoryTableSettings,
} from "../../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import {
  IngredientAmountUnit,
  isWeightUnit,
  maxWeightUnit,
  MedicineSchedule,
  weightUnitToGramsMultiplier,
} from "../../../models/MedicineSchedule";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import * as FileSystem from "expo-file-system/legacy";
import { shareAsync } from "expo-sharing";
import { Medicine } from "../../../models/MedicineSchedule";
import { useTranslation } from "react-i18next";
import {
  Assessment,
  AssessmentSchedule,
  ValueType,
} from "../../../models/AssessmentSchedule";
import { Group } from "../../../models/Frequency";
import {
  baseUnitShorFormPlural,
  ingredientAmountUnitEnumToDisplayForm,
} from "../../enumMappings";
import HistoryTable from "./HistoryTable";
import {
  deserializeDateOnly,
  getShiftedDateOnly,
  getTodayDateOnly,
  serializeDateOnly,
} from "../../../dateOnlyUtils";
import { getOrThrow, castToStringArray } from "../../utils";
import {
  AssessmentValue,
  ScheduledDosageRecord,
  ScheduledMeasurementRecord,
  UnscheduledDosageRecord,
  UnscheduledMeasurementRecord,
} from "../../../models/Records";
import {
  ColumnConfig,
  ColumnType,
  HistoryTableSettings,
} from "../../../models/Settings";
import { DEFAULT_BORDER_RADIUS } from "../../../commonStyles";
import { t } from "i18next";

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

function formatAssessmentValue(
  value: AssessmentValue,
  type: ValueType,
): string {
  switch (type) {
    case ValueType.Text:
      return value.toString();
    case ValueType.Numeric:
      return value.toString();
    case ValueType.Boolean:
      return value ? "Yes" : "No";
    case ValueType.SingleSelect:
      return value.toString();
    case ValueType.MultiSelect:
      // uses no-break space U+00A0
      return " • " + castToStringArray(value).join("\n • ");
  }
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
              {t("Save to CSV")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderColor: theme.colors.border }]}
            onPress={handleOpenConfiguration}
          >
            <Text style={[styles.menuText, { color: theme.colors.text }]}>
              {t("Configure")}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  );
}

class TableData {
  constructor(
    public fullHeaders: string[],
    public fullHeaderToDisplayHeader: Map<string, string>,
    public fullHeaderToValueType: Map<string, ValueType>,
    public dayToFullHeaderToValue: Map<string, Map<string, string | number>>,
  ) {}
}

class NewColumnConfig {
  constructor(
    public type: ColumnType,
    public source_created_at: Date,
  ) {}
}

export function HistoryTableScreen() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const theme = useTheme();
  const navigation = useNavigation();

  const [rowHeaders, setRowHeaders] = React.useState<Date[]>([]);
  const [fullHeaders, setFullHeaders] = React.useState<string[]>([]);
  const [fullHeaderToDisplayHeader, setFullHeaderToDisplayHeader] =
    React.useState<Map<string, string>>(new Map());
  const [fullHeaderToValueType, setFullHeaderToValueType] = React.useState<
    Map<string, ValueType>
  >(new Map());
  const [cells, setCells] = React.useState<string[][]>([]);

  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);
  const [settings, setSettings] = React.useState<HistoryTableSettings | null>(
    null,
  );
  const [settingsColumnWidths, setSetingsColumnWidths] = React.useState<
    Map<string, number>
  >(new Map());
  const newColumnConfigs = React.useRef<Map<string, NewColumnConfig>>(
    new Map(),
  );

  function calculateHeaders(
    fullHeaderToShortHeader: Map<string, string>,
    shortHeaderCounts: Map<string, number>,
  ): Map<string, string> {
    const headers = new Map();
    for (const [fullHeader, shortHeader] of fullHeaderToShortHeader) {
      if (shortHeaderCounts.get(shortHeader) === 1) {
        headers.set(fullHeader, shortHeader);
      } else {
        headers.set(fullHeader, fullHeader);
      }
    }
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

  const getAssessmentData = React.useCallback(
    async (settings: HistoryTableSettings): Promise<TableData> => {
      const scheuledMeasurementRecrods =
        await dbGetScheduledMeasurementRecords(db);
      const unscheduledMeasurementRecords =
        await dbGetUnscheduledMeasurementRecords(db);

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

      /* to handle shortening of header labels */
      const fullHeaderToShortHeader = new Map<string, string>();
      const shortHeaderCounts = new Map<string, number>();

      const getGroupLabel = (groupId: number | null): string => {
        const group = groupId === null ? null : idToGroup.get(groupId);
        let groupLabel = "";
        if (group === undefined) {
          throw Error("Measurement record has invalid group.");
        } else if (group === null) {
          groupLabel = "ungrouped";
        } else {
          groupLabel = group?.name;
        }
        return groupLabel;
      };

      const fullHeaderToValueType = new Map();

      const digestMeasurementRecord = (
        record: ScheduledMeasurementRecord | UnscheduledMeasurementRecord,
        assessment: Assessment,
        groupLabel: string,
      ) => {
        const fullHeader = assessment.getLabel(groupLabel);
        const shortHeader = assessment.name;

        const columnConfig = settings.columnConfigs.get(fullHeader);
        if (!columnConfig) {
          newColumnConfigs.current.set(
            fullHeader,
            new NewColumnConfig(ColumnType.Assessment, assessment.createdAt),
          );
        }

        // assessments by default are not shown
        if (columnConfig === undefined || columnConfig.isShown) {
          const dateStr = extractDate(record.date);
          const dailyRow =
            dayToHeaderToValues.get(dateStr) || new Map<string, string>();

          updateHeaderCounter(
            fullHeaderToShortHeader,
            shortHeaderCounts,
            fullHeader,
            shortHeader,
          );

          dailyRow.set(
            fullHeader,
            formatAssessmentValue(record.value, assessment.type),
          );
          dayToHeaderToValues.set(dateStr, dailyRow);

          fullHeaderToValueType.set(fullHeader, assessment.type);
        }
      };

      for (const record of unscheduledMeasurementRecords) {
        const assessment = idToAssessment.get(record.assessmentId);
        if (!assessment) {
          throw Error("Record not connected to assessment.");
        }
        const groupLabel = getGroupLabel(record.groupId);
        digestMeasurementRecord(record, assessment, groupLabel);
      }

      for (const record of scheuledMeasurementRecrods) {
        const assessmentSchedule = idToAssessmentSchedule.get(
          record.assessmentScheduleId,
        );
        if (!assessmentSchedule) {
          throw Error("Record not connected to assessment schedule.");
        }
        const assessment = assessmentSchedule.assessment;
        const measurement =
          assessmentSchedule.measurements[record.measurementIndex];
        const groupLabel = getGroupLabel(measurement.groupId);

        digestMeasurementRecord(record, assessment, groupLabel);
      }

      const headersMap = calculateHeaders(
        fullHeaderToShortHeader,
        shortHeaderCounts,
      );

      const fullHeaders = Array.from(fullHeaderToShortHeader.keys()).sort();

      return new TableData(
        fullHeaders,
        headersMap,
        fullHeaderToValueType,
        dayToHeaderToValues,
      );
    },
    [db],
  );

  const getMedicineData = React.useCallback(
    async (settings: HistoryTableSettings): Promise<TableData> => {
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

      const digestDosageRecord = (
        record: ScheduledDosageRecord | UnscheduledDosageRecord,
        medicineAmount: number,
        medicine: Medicine,
      ) => {
        const dateStr = extractDate(record.date);
        const dailyRow =
          dayToHeaderToValues.get(dateStr) || new Map<string, number>();

        const baseUnitLabel = baseUnitShorFormPlural(medicine.baseUnit);

        for (const ai of medicine.activeIngredients) {
          let fullHeader = ai.getLabel(baseUnitLabel);
          let shortHeader = ai.getShortLabel();

          let weightUnitMultiplier = 1;
          if (isWeightUnit(ai.unit)) {
            fullHeader = ai.getLabelWithoutUnit(baseUnitLabel);
            shortHeader = ai.getShortLabelWithoutUnit();
            if (settings.mergeIngredientsWithDifferentForms) {
              fullHeader = shortHeader;
            }
            weightUnitMultiplier = weightUnitToGramsMultiplier(ai.unit);
            fullActiveIngredientHeaderToWeightUnits.set(
              fullHeader,
              (
                fullActiveIngredientHeaderToWeightUnits.get(fullHeader) ||
                new Set()
              ).add(ai.unit),
            );
          }

          const ccFullHeader = settings.columnConfigs.get(fullHeader);
          if (
            !ccFullHeader ||
            ccFullHeader._source_created_at > medicine.createdAt
          ) {
            newColumnConfigs.current.set(
              fullHeader,
              new NewColumnConfig(
                ColumnType.ActiveIngredient,
                medicine.createdAt,
              ),
            );
          }
          const ccShortHeader = settings.columnConfigs.get(shortHeader);
          if (
            !ccShortHeader ||
            ccShortHeader._source_created_at > medicine.createdAt
          ) {
            newColumnConfigs.current.set(
              shortHeader,
              new NewColumnConfig(
                ColumnType.ActiveIngredient,
                medicine.createdAt,
              ),
            );
          }
          let columnConfig = ccFullHeader;
          if (settings.mergeIngredientsWithDifferentForms) {
            fullHeader = shortHeader;
            columnConfig = ccShortHeader;
          }

          // active ingredients by default are shown
          if (columnConfig === undefined || columnConfig.isShown) {
            updateHeaderCounter(
              fullHeaderToShortHeader,
              shortHeaderCounts,
              fullHeader,
              shortHeader,
            );
            let amountTotal = dailyRow.get(fullHeader) || 0;
            amountTotal += ai.amount * medicineAmount * weightUnitMultiplier;
            dailyRow.set(fullHeader, amountTotal);
          }
        }

        const header = medicine.getLabel();

        const columnConfig = settings.columnConfigs.get(header);
        if (!columnConfig) {
          newColumnConfigs.current.set(
            header,
            new NewColumnConfig(ColumnType.Medicine, medicine.createdAt),
          );
        }
        // medicines by default are not shown
        // so if the config does not exists the column is omitted
        if (columnConfig?.isShown === true) {
          updateHeaderCounter(
            fullHeaderToShortHeader,
            shortHeaderCounts,
            header,
            header,
          );

          let amountTotal = dailyRow.get(header) || 0;
          amountTotal += medicineAmount;
          dailyRow.set(header, amountTotal);

          dayToHeaderToValues.set(dateStr, dailyRow);
        }
      };

      for (const record of unscheduledDosageRecords) {
        const medicine = idToMedicine.get(record.medicineId);
        if (!medicine) {
          throw Error("Record not connected to medicine.");
        }
        digestDosageRecord(record, record.amount, medicine);
      }

      for (const record of scheduledDosageRecords) {
        const schedule = idToSchedule.get(record.medicineScheduleId);
        if (!schedule) {
          throw Error("Record not connected to medicine schedule.");
        }
        digestDosageRecord(
          record,
          schedule.dosages[record.dosageIndex].amount,
          schedule.medicine,
        );
      }

      insertActiveIngredientWeightUnits(
        dayToHeaderToValues,
        fullHeaderToShortHeader,
        shortHeaderCounts,
        fullActiveIngredientHeaderToWeightUnits,
      );

      const headersMap = calculateHeaders(
        fullHeaderToShortHeader,
        shortHeaderCounts,
      );

      const fullHeaders = Array.from(fullHeaderToShortHeader.keys()).sort();

      const fullHeaderToValueType = new Map();
      fullHeaders.forEach((header) =>
        fullHeaderToValueType.set(header, ValueType.Numeric),
      );

      return new TableData(
        fullHeaders,
        headersMap,
        fullHeaderToValueType,
        dayToHeaderToValues,
      );
    },
    [db],
  );

  const insertNewColumnConfigs = async (
    newColumnConfigs: Map<string, NewColumnConfig>,
  ): Promise<Map<string, ColumnConfig>> => {
    if (settings === null) {
      return new Map();
    }
    const allColumnConfigs: ColumnConfig[] = [
      ...Object.values(settings.columnConfigs),
    ];
    for (const [header, newCC] of newColumnConfigs) {
      allColumnConfigs.push(
        new ColumnConfig(
          [ColumnType.ActiveIngredient, ColumnType.Assessment].includes(
            newCC.type,
          ),
          null,
          0,
          newCC.type,
          newCC.source_created_at,
          header,
        ),
      );
    }
    allColumnConfigs.sort((a: ColumnConfig, b: ColumnConfig) => {
      if (a._type !== b._type) {
        return a._type - b._type;
      } else {
        return a._source_created_at.getTime() - b._source_created_at.getTime();
      }
    });

    const updatedColumnConfigs = new Map();
    allColumnConfigs.forEach((cc, idx) => {
      cc.ordinal = idx;
      updatedColumnConfigs.set(cc._header, cc);
    });
    await dbUpdateHistoryTableSettings(db, {
      ...settings,
      columnConfigs: updatedColumnConfigs,
    });
    loadSettings();

    return updatedColumnConfigs;
  };

  const loadAndCombineDataForTable = React.useCallback(async () => {
    if (settings === null) {
      return;
    }
    const medicineTableData = await getMedicineData(settings);
    const assessmentTableData = await getAssessmentData(settings);

    const columnConfigs = await insertNewColumnConfigs(newColumnConfigs.current);

    const newTableRows = new Array();

    const medicinesHistory = medicineTableData.dayToFullHeaderToValue;
    const assessmentsHistory = assessmentTableData.dayToFullHeaderToValue;

    const daysSet = new Set([
      ...medicinesHistory.keys(),
      ...assessmentsHistory.keys(),
    ]);
    const days = Array.from(daysSet).sort();
    let dates = [];
    if (settings.showDaysWithoutEntries) {
      const startDay = deserializeDateOnly(days[0]);
      const endDate = deserializeDateOnly(days[days.length - 1]);

      for (
        let date = endDate;
        date >= startDay;
        date = getShiftedDateOnly(date, -1)
      ) {
        dates.push(date);
      }
    } else {
      dates = days.map((d) => deserializeDateOnly(d)).toReversed();
    }

    for (const date of dates) {
      const day = serializeDateOnly(date);

      const record = [];
      for (const header of medicineTableData.fullHeaders) {
        const value = medicinesHistory.get(day)?.get(header);
        if (value) {
          record.push(value.toString());
        } else {
          record.push("");
        }
      }
      for (const header of assessmentTableData.fullHeaders) {
        const value = assessmentsHistory.get(day)?.get(header);
        if (value) {
          record.push(value);
        } else {
          record.push("");
        }
      }
      newTableRows.push(record);
    }

    const headers = new Array(
      ...medicineTableData.fullHeaders,
      ...assessmentTableData.fullHeaders,
    );

    const getOrdinal = (header: string): number => {
      const cc =  columnConfigs.get(header);
      if(!cc) {
        return 0;
      } else {
        return cc.ordinal;
      }
    }
    headers.sort((a, b) => getOrdinal(a) - getOrdinal(b));
    setFullHeaders(headers);

    const types = new Map([
      ...medicineTableData.fullHeaderToValueType,
      ...assessmentTableData.fullHeaderToValueType,
    ]);
    setFullHeaderToValueType(types);

    const headersMap = new Map([
      ...medicineTableData.fullHeaderToDisplayHeader,
      ...assessmentTableData.fullHeaderToDisplayHeader,
    ]);
    setFullHeaderToDisplayHeader(headersMap);

    setRowHeaders(dates);
    setCells(newTableRows);
  }, [getAssessmentData, getMedicineData]);

  const loadSettings = React.useCallback(async () => {
    const newSettings = await dbGetHistoryTableSettings(db);
    setSettings(newSettings);
    const newSettingsColumnWidths = new Map();
    newSettings.columnConfigs.forEach((cc, fullHeader) =>
      newSettingsColumnWidths.set(fullHeader, cc.width),
    );
    setSetingsColumnWidths(newSettingsColumnWidths);
  }, [db]);

  /*   const saveSettings = async (update: Partial<HistoryTableSettings>) => {
    await dbUpdateHistoryTableSettings(db, { ...settings, ...update });
    loadSettings();
  }; */

  const saveColumnWidth = async (fullHeader: string, width: number) => {
    if (settings === null) {
      return;
    }
    const columnConfig = settings.columnConfigs.get(fullHeader);
    if (columnConfig) {
      columnConfig.width = width;
      await dbUpdateHistoryTableSettings(db, settings);
      // not reloaded/out of sync (only theoretically) on purpose
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
      loadAndCombineDataForTable();
    }, [loadAndCombineDataForTable, loadSettings]),
  );

  const handleMenuToggle = React.useCallback(() => {
    setIsMenuOpen(!isMenuOpen);
  }, [isMenuOpen]);

  const handleSaveToCSV = React.useCallback(async () => {
    try {
      const csvContent = generateCSV(fullHeaders, cells);

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
  }, [cells, fullHeaders]);

  const handleOpenConfiguration = React.useCallback(() => {
    navigation.navigate("EditRecordHistoryConfigurationScreen");
    setIsMenuOpen(false);
  }, [navigation]);

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

  const isTableDataReady = () => {
    return !(
      settings === null ||
      fullHeaders.length === 0 ||
      fullHeaderToValueType.size === 0 ||
      fullHeaderToDisplayHeader.size === 0 ||
      rowHeaders.length === 0 ||
      cells.length === 0
    );
  };

  return (
    <DefaultMainContainer>
      <MenuModal
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        handleSaveToCSV={handleSaveToCSV}
        handleOpenConfiguration={handleOpenConfiguration}
      ></MenuModal>
      {!isTableDataReady() ? (
        renderEmptyState()
      ) : (
        <View style={[styles.mainContainer]}>
          <HistoryTable
            fullHeaders={fullHeaders}
            fullHeaderToValueType={fullHeaderToValueType}
            fullHeaderToDisplayHeader={fullHeaderToDisplayHeader}
            rowHeaders={rowHeaders}
            data={cells}
            expandAllRows={settings?.expandAllRows == true}
            settingsColumnWidths={settingsColumnWidths}
            saveColumnWidth={saveColumnWidth}
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
    borderBottomLeftRadius: DEFAULT_BORDER_RADIUS,
  },
  menuItem: {
    alignContent: "flex-start",
    padding: 18,
    borderBottomWidth: 1,
    width: "100%",
  },
  menuText: {
    alignItems: "center",
    fontSize: 16,
    fontWeight: "400",
  },
});
