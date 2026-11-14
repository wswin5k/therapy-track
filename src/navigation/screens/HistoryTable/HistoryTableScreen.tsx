import {
  ActivityIndicator,
  Platform,
  StyleSheet,
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
  dbGetHistoryTableSettings,
  dbUpdateHistoryTableSettings,
} from "../../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import * as Sharing from "expo-sharing";
import { useTranslation } from "react-i18next";
import { ValueType } from "../../../models/AssessmentSchedule";
import HistoryTable, { TableData } from "./HistoryTable";
import {
  deserializeDateOnly,
  getShiftedDateOnly,
  isLessDateOnly,
  serializeDateOnly,
} from "../../../dateOnlyUtils";
import { castToStringArray, getDisplayDirectoryName } from "../../utils";
import { AssessmentValue } from "../../../models/Records";
import {
  ColumnConfig,
  ColumnType,
  HistoryTableSettings,
} from "../../../models/Settings";
import { Toast, ToastType } from "../../../components/Toast";
import {
  getAssessmentRecords,
  getMedicineRecords,
  NewColumnConfig,
} from "../../../models/dbRecordsService";
import { File, Paths, Directory } from "expo-file-system";
import {
  DateRange,
  DateRangeConfigurationDialog,
} from "./DateRangeConfigurationDialog";
import {
  DisplayOptions,
  DisplayOptionsConfigurationDialog,
} from "./DisplayOptionsConfigurationDialog";
import { MenuModal } from "./MenuModal";
import { generateCSV } from "./exportUtils";

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
      const valueArray = castToStringArray(value);
      return valueArray.length === 0 ? "" : " • " + valueArray.join("\n • ");
  }
}

export function HistoryTableScreen() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const theme = useTheme();
  const navigation = useNavigation();

  const [tableDataAndVersion, setTableDataAndVersion] = React.useState<{
    tableData: TableData | null;
    version: number;
  }>({ tableData: null, version: 0 });

  //todo consider moving moving to Ref
  const [rowHeadersAll, setRowHeadersAll] = React.useState<Date[]>([]);
  const [cellsAll, setCellsAll] = React.useState<string[][]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);

  const [settingsColumnWidths, setSetingsColumnWidths] = React.useState<
    Map<string, number>
  >(new Map());

  const [settings, setSettings] = React.useState<HistoryTableSettings | null>(
    null,
  );

  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [toastType, setToastType] = React.useState<ToastType>(
    ToastType.Success,
  );

  const [dateRangeDialogOpen, setDateRangeDialogOpen] =
    React.useState<boolean>(false);
  const [dateRange, setDateRange] = React.useState<DateRange>(
    new DateRange(null, null),
  );
  const [displayOptionsDialogOpen, setDisplayOptionsDialogOpen] =
    React.useState<boolean>(false);

  const combineColumnConfigs = async (
    newColumnConfigs: Map<string, NewColumnConfig>,
    existingColumnConfigs: Map<string, ColumnConfig>,
  ): Promise<Map<string, ColumnConfig>> => {
    const allColumnConfigs: ColumnConfig[] = [
      ...existingColumnConfigs.values(),
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

    return updatedColumnConfigs;
  };

  const computeAndSetTableData = React.useCallback(
    (
      rowHeadersAll: Date[],
      cellsAll: string[][],
      dateRange: DateRange,
      headers: string[],
      headerToValueType: Map<string, ValueType>,
    ) => {
      let endIdx = rowHeadersAll.length - 1;
      if (dateRange.startDate !== null) {
        while (
          isLessDateOnly(rowHeadersAll[endIdx], dateRange.startDate) &&
          endIdx > 0
        ) {
          endIdx -= 1;
        }
        endIdx += 1;
        if (isLessDateOnly(rowHeadersAll[0], dateRange.startDate)) {
          endIdx = 0;
        }
      }
      let startIdx = 0;
      if (dateRange.endDate !== null) {
        while (
          isLessDateOnly(dateRange.endDate, rowHeadersAll[startIdx]) &&
          startIdx < rowHeadersAll.length - 1
        ) {
          startIdx += 1;
        }
        if (
          isLessDateOnly(
            dateRange.endDate,
            rowHeadersAll[rowHeadersAll.length - 1],
          )
        ) {
          startIdx = rowHeadersAll.length;
        }
      }

      // when there is change in table data the HistoryTable component
      // is re-mounted using version as a component key
      setTableDataAndVersion((prev) => {
        return {
          tableData: new TableData(
            headers,
            headerToValueType,
            rowHeadersAll.slice(startIdx, endIdx),
            cellsAll.slice(startIdx, endIdx),
          ),
          version: prev.version + 1,
        };
      });
    },
    [],
  );

  const loadAndCombineDataForTable = React.useCallback(
    async (initialSettings: HistoryTableSettings) => {
      const medicineTableData = await getMedicineRecords(db);
      const assessmentTableData = await getAssessmentRecords(db);

      const allNewColumnConfigs = new Map([
        ...medicineTableData.internalLabelToColumnConfig,
        ...assessmentTableData.internalLabelToColumnConfig,
      ]);

      const columnConfigs = await combineColumnConfigs(
        allNewColumnConfigs,
        initialSettings.columnConfigs,
      );
      await dbUpdateHistoryTableSettings(db, {
        ...initialSettings,
        columnConfigs,
      });

      const headers = new Array(
        ...medicineTableData.labels,
        ...assessmentTableData.labels,
      );

      const getOrdinal = (header: string): number => {
        const settingsHeader =
          medicineTableData.labelToInternalLabel.get(header) ??
          assessmentTableData.labelToInternalLabel.get(header) ??
          header;
        const cc = columnConfigs.get(settingsHeader);
        if (!cc) {
          return 0;
        } else {
          return cc.ordinal;
        }
      };
      headers.sort((a, b) => getOrdinal(a) - getOrdinal(b));

      const newTableRows = new Array();

      const medicinesHistory = medicineTableData.dayToLabelToValue;
      const assessmentsHistory = assessmentTableData.dayToLabelToValue;

      const daysSet = new Set([
        ...medicinesHistory.keys(),
        ...assessmentsHistory.keys(),
      ]);
      const days = Array.from(daysSet).sort();
      let dates = [];
      if (initialSettings.showDaysWithoutEntries && days.length > 0) {
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

      const types = new Map([
        ...medicineTableData.labelToValueType,
        ...assessmentTableData.labelToValueType,
      ]);
      setHeaders(headers);

      for (const date of dates) {
        const day = serializeDateOnly(date);

        const record = [];
        for (const header of headers) {
          const value =
            medicinesHistory.get(day)?.get(header) ??
            assessmentsHistory.get(day)?.get(header);
          if (value !== undefined) {
            const type = types.get(header) ?? ValueType.Numeric;
            record.push(formatAssessmentValue(value, type));
          } else {
            record.push("");
          }
        }
        newTableRows.push(record);
      }
      setRowHeadersAll(dates);
      setCellsAll(newTableRows);
      computeAndSetTableData(dates, newTableRows, dateRange, headers, types);
    },
    [db, computeAndSetTableData, dateRange],
  );

  const loadSettings = React.useCallback(async () => {
    const newSettings = await dbGetHistoryTableSettings(db);
    setSettings(newSettings);
    const newSettingsColumnWidths = new Map();
    newSettings.columnConfigs.forEach((cc, fullHeader) =>
      newSettingsColumnWidths.set(fullHeader, cc.width),
    );
    setSetingsColumnWidths(newSettingsColumnWidths);
  }, [db]);

  const saveColumnWidth = React.useCallback(
    async (fullHeader: string, width: number) => {
      if (settings === null) {
        return;
      }
      const columnConfig = settings.columnConfigs.get(fullHeader);
      if (columnConfig) {
        columnConfig.width = width;
        await dbUpdateHistoryTableSettings(db, settings);
        // not reloaded/out of sync (only theoretically) on purpose
      }
    },
    [db, settings],
  );

  useFocusEffect(
    React.useCallback(() => {
      const setUp = async () => {
        setTableDataAndVersion((prev) => {
          return { tableData: null, version: prev.version + 1 };
        });
        const initialSettings = await dbGetHistoryTableSettings(db);
        const tableDataPromise = loadAndCombineDataForTable(initialSettings);
        const settingsPromise = loadSettings();
        await Promise.all([tableDataPromise, settingsPromise]);
      };
      setUp();
    }, [db, loadAndCombineDataForTable, loadSettings]),
  );

  const handleMenuToggle = React.useCallback(() => {
    setToastMessage(null);
    setIsMenuOpen(!isMenuOpen);
  }, [isMenuOpen]);

  const handleSaveToCSV = React.useCallback(async () => {
    const csvContent = generateCSV(headers, rowHeadersAll, cellsAll);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `therapy-track-records-${timestamp}.csv`;

    const tempFile = new File(Paths.cache, fileName);
    if (tempFile.exists) {
      tempFile.delete();
    }
    tempFile.write(csvContent);

    const showErrorToast = () => {
      setToastType(ToastType.Error);
      setToastMessage(t("Failed to export the file."));
    };

    try {
      if (Platform.OS === "android") {
        const directory = await Directory.pickDirectoryAsync();
        if (!directory) {
          return;
        }
        await tempFile.copy(directory);
        const directoryDisplayName = getDisplayDirectoryName(directory.uri);
        const message =
          directoryDisplayName === null
            ? "File exported successfully."
            : `File saved in ${directoryDisplayName}.`;
        setToastType(ToastType.Success);
        setToastMessage(message);
      } else if (Platform.OS === "ios") {
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          showErrorToast();
          return;
        }
        await Sharing.shareAsync(tempFile.uri, {
          dialogTitle: "Export CSV file",
          mimeType: "text/csv",
          UTI: "public.comma-separated-values-text",
        });
      }
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ERR_PICKER_CANCELLED"
      ) {
        return;
      }
      showErrorToast();
    } finally {
      if (tempFile.exists) {
        tempFile.delete();
      }
    }
    setIsMenuOpen(false);
  }, [cellsAll, rowHeadersAll, headers, t]);

  const handleDateRangeMenuItemPress = React.useCallback(() => {
    setIsMenuOpen(false);
    setDateRangeDialogOpen(true);
  }, []);

  const handleDateRangeConfigurationChange = React.useCallback(
    (dateRange: DateRange) => {
      setTableDataAndVersion((prev) => {
        return { tableData: null, version: prev.version + 1 };
      });
      setDateRangeDialogOpen(false);
      setDateRange(dateRange);
      // the range will applied via useFocusEffect dependencies
    },
    [],
  );

  const dateRangeWhole = React.useMemo(
    () =>
      rowHeadersAll.length > 0
        ? new DateRange(
            rowHeadersAll[rowHeadersAll.length - 1],
            rowHeadersAll[0],
          )
        : new DateRange(null, null),
    [rowHeadersAll],
  );

  const handleDisplayOptionsMenuItemPress = React.useCallback(() => {
    setIsMenuOpen(false);
    setDisplayOptionsDialogOpen(true);
  }, []);

  const handleDisplayOptionsConfigurationChange = React.useCallback(
    async (displayOptions: DisplayOptions) => {
      setDisplayOptionsDialogOpen(false);
      if (settings) {
        const newSettings = new HistoryTableSettings(
          displayOptions.expandAllRows,
          displayOptions.showDaysWithoutEntries,
          settings.mergeIngredientsWithDifferentForms,
          settings.columnConfigs,
        );
        dbUpdateHistoryTableSettings(db, newSettings);
        const tableDataPromise = loadAndCombineDataForTable(newSettings);
        const settingsPromise = loadSettings();
        await Promise.all([tableDataPromise, settingsPromise]);
      }
    },
    [db, loadAndCombineDataForTable, loadSettings, settings],
  );

  const displayOptions = React.useMemo(
    () =>
      new DisplayOptions(
        settings?.expandAllRows ?? false,
        settings?.showDaysWithoutEntries ?? true,
      ),
    [settings],
  );

  React.useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleMenuToggle}
          style={styles.menuToggleButton}
        >
          <Ionicons
            name="ellipsis-vertical"
            style={styles.menuToggleIcon}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isMenuOpen, handleMenuToggle, theme.colors]);

  return (
    <DefaultMainContainer>
      <MenuModal
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        handleSaveToCSV={handleSaveToCSV}
        handleVisibleColumns={handleDisplayOptionsMenuItemPress}
        handleDateRange={handleDateRangeMenuItemPress}
        handleDisplayOptions={handleDisplayOptionsMenuItemPress}
      />

      <Toast
        message={toastMessage ?? ""}
        visible={toastMessage !== null}
        onHide={() => setToastMessage(null)}
        type={toastType}
      />

      {dateRangeDialogOpen && (
        <DateRangeConfigurationDialog
          initialDateRange={dateRangeWhole}
          onApply={handleDateRangeConfigurationChange}
          onCancel={() => setDateRangeDialogOpen(false)}
        />
      )}

      {displayOptionsDialogOpen && (
        <DisplayOptionsConfigurationDialog
          initialDisplayOptions={displayOptions}
          onApply={handleDisplayOptionsConfigurationChange}
          onCancel={() => setDisplayOptionsDialogOpen(false)}
        />
      )}

      {tableDataAndVersion.tableData === null ? (
        <ActivityIndicator size="large" style={styles.activityIndicator} />
      ) : (
        <View style={[styles.mainContainer]}>
          <HistoryTable
            key={tableDataAndVersion.version}
            id={tableDataAndVersion.version}
            td={tableDataAndVersion.tableData}
            expandAllRows={settings?.expandAllRows === true}
            settingsColumnWidths={settingsColumnWidths}
            saveColumnWidth={saveColumnWidth}
          />
        </View>
      )}
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  activityIndicator: {
    margin: 30,
    alignSelf: "center",
  },
  mainContainer: {
    padding: 6,
    width: "100%",
    height: "100%",
  },
  menuToggleButton: {
    marginLeft: 16,
    marginRight: 20,
  },
  menuToggleIcon: {
    fontSize: 24,
  },
});
