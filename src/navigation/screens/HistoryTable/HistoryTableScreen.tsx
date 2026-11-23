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
import {
  castToStringArray,
  getDisplayDirectoryName,
  transpose2DArray,
} from "../../utils";
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
import { ColumnVisibilityConfigurationDialog } from "./ColumnVisibilityConfigurationDialog";

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

  // when there is change in table data the HistoryTable component
  // is re-mounted using version as a component key
  const [tableDataAndVersion, setTableDataAndVersion] = React.useState<{
    tableData: TableData | null;
    version: number;
  }>({ tableData: null, version: 0 });

  //todo consider moving moving to Ref
  const [rowHeadersAll, setRowHeadersAll] = React.useState<Date[]>([]);
  const [cellsAll, setCellsAll] = React.useState<string[][]>([]);
  const [headersAll, setHeadersAll] = React.useState<string[]>([]);

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
  const [columnVisibilitDialogOpen, setColumnVisibilitDialogOpen] =
    React.useState<boolean>(false);

  const combineColumnConfigs = React.useCallback(
    async (
      newColumnConfigs: Map<string, NewColumnConfig>,
      existingColumnConfigs: Map<string, ColumnConfig>,
    ): Promise<Map<string, ColumnConfig>> => {
      const allColumnConfigs: ColumnConfig[] = [
        ...existingColumnConfigs.values(),
      ];
      for (const [header, newCC] of newColumnConfigs) {
        const existingCC = existingColumnConfigs.get(header);
        if (!existingCC) {
          allColumnConfigs.push(
            new ColumnConfig(
              [ColumnType.ActiveIngredient, ColumnType.Assessment].includes(
                newCC.type,
              ),
              null,
              -1,
              newCC.source_created_at,
              header,
            ),
          );
        }
      }
      allColumnConfigs.sort((a: ColumnConfig, b: ColumnConfig) => {
        if (a.ordinal !== -1 && b.ordinal !== -1) {
          return a.ordinal - b.ordinal;
        } else {
          return b.source_created_at.getTime() - a.source_created_at.getTime();
        }
      });

      const updatedColumnConfigs = new Map();
      allColumnConfigs.forEach((cc, idx) => {
        cc.ordinal = idx;
        updatedColumnConfigs.set(cc.header, cc);
      });

      return updatedColumnConfigs;
    },
    [],
  );

  const filterDateRange = React.useCallback(
    (rowHeadersAll: Date[], cellsAll: string[][], dateRange: DateRange) => {
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
      return {
        rowHeaders: rowHeadersAll.slice(startIdx, endIdx),
        cells: cellsAll.slice(startIdx, endIdx),
      };
    },
    [],
  );

  const filterHeaderVisibility = (
    headers: string[],
    cellsAll: string[][],
    visibleHeaders: Set<string>,
  ) => {
    const filteredHeaders = [];
    const filteredIndices = new Set();

    const transposedCellsAll = transpose2DArray(cellsAll);

    for (const [idx, header] of headers.entries()) {
      if (visibleHeaders.has(header)) {
        filteredHeaders.push(header);
        filteredIndices.add(idx);
      }
    }
    const transposedFilteredCells = transposedCellsAll.filter((_, idx) =>
      filteredIndices.has(idx),
    );
    const filteredCells = transpose2DArray(transposedFilteredCells);
    return {
      filteredHeaders,
      filteredCells,
    };
  };

  const getVisibleHeaders = (columnConfigs: Map<string, ColumnConfig>) => {
    const visibleHeaders = new Set<string>();
    columnConfigs.forEach((cc, header) => {
      if (cc.isShown) {
        visibleHeaders.add(header);
      }
    });
    return visibleHeaders;
  };

  const sortHeaders = (
    headers: string[],
    columnConfigs?: Map<string, ColumnConfig>,
  ) => {
    if (!columnConfigs) {
      return headers;
    }
    const getOrdinal = (header: string): number => {
      const cc = columnConfigs.get(header);
      if (!cc) {
        console.warn(`Unexpected missing column config for ${header}`);
        return 0;
      } else {
        return cc.ordinal;
      }
    };
    return [...headers].sort((a, b) => getOrdinal(a) - getOrdinal(b));
  };

  const loadAndCombineDataForTable = React.useCallback(
    async (initialSettings: HistoryTableSettings) => {
      const medicineTableData = await getMedicineRecords(db);
      const assessmentTableData = await getAssessmentRecords(db);

      const allNewColumnConfigs = new Map([
        ...medicineTableData.labelToColumnConfig,
        ...assessmentTableData.labelToColumnConfig,
      ]);

      const columnConfigs = await combineColumnConfigs(
        allNewColumnConfigs,
        initialSettings.columnConfigs,
      );
      await dbUpdateHistoryTableSettings(db, {
        ...initialSettings,
        columnConfigs,
      });

      const headersUnsorted = new Array(
        ...medicineTableData.labels,
        ...assessmentTableData.labels,
      );

      const headers = sortHeaders(headersUnsorted, columnConfigs);

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
      setHeadersAll(headers);

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

      const { rowHeaders, cells } = filterDateRange(
        dates,
        newTableRows,
        dateRange,
      );

      const visibleHeaders = getVisibleHeaders(columnConfigs);
      const { filteredHeaders, filteredCells } = filterHeaderVisibility(
        headers,
        cells,
        visibleHeaders,
      );

      setTableDataAndVersion((prev) => {
        return {
          tableData: new TableData(
            filteredHeaders,
            types,
            medicineTableData.labelToUnit,
            rowHeaders,
            filteredCells,
            initialSettings.expandAllRows,
          ),
          version: prev.version + 1,
        };
      });
    },
    [db, filterDateRange, dateRange, combineColumnConfigs],
  );

  const loadSettingsAndColumnWidths = React.useCallback(async () => {
    const newSettings = await dbGetHistoryTableSettings(db);
    setSettings(newSettings);
    const newSettingsColumnWidths = new Map();
    newSettings.columnConfigs.forEach((cc, header) => {
      newSettingsColumnWidths.set(header, cc.width);
    });
    setSetingsColumnWidths(newSettingsColumnWidths);
  }, [db]);

  useFocusEffect(
    React.useCallback(() => {
      const setUp = async () => {
        const initialSettings = await dbGetHistoryTableSettings(db);
        await loadAndCombineDataForTable(initialSettings);
        await loadSettingsAndColumnWidths();
      };
      setUp();
      return () => {
        setIsMenuOpen(false);
        //is this needed?
        setTableDataAndVersion((prev) => {
          return { tableData: null, version: prev.version + 1 };
        });
      };
    }, [db, loadAndCombineDataForTable, loadSettingsAndColumnWidths]),
  );

  const handleMenuToggle = React.useCallback(() => {
    setToastMessage(null);
    setIsMenuOpen(!isMenuOpen);
  }, [isMenuOpen]);

  const handleSaveToCSV = React.useCallback(async () => {
    const csvContent = generateCSV(headersAll, rowHeadersAll, cellsAll);

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
  }, [cellsAll, rowHeadersAll, headersAll, t]);

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

      if (settings === null || tableDataAndVersion.tableData === null) {
        return;
      }
      const td = tableDataAndVersion.tableData;

      if (
        settings.expandAllRows === displayOptions.expandAllRows &&
        settings.showDaysWithoutEntries ===
          displayOptions.showDaysWithoutEntries
      ) {
        return;
      }

      const newSettings = new HistoryTableSettings(
        displayOptions.expandAllRows,
        displayOptions.showDaysWithoutEntries,
        settings.mergeIngredientsWithDifferentForms,
        settings.columnConfigs,
      );
      setTableDataAndVersion((prev) => {
        return { tableData: null, version: prev.version + 1 };
      });

      if (
        settings.showDaysWithoutEntries !==
        displayOptions.showDaysWithoutEntries
      ) {
        await loadAndCombineDataForTable(newSettings);
      } else {
        // only expandAllRows changed
        setTableDataAndVersion((prev) => {
          return {
            tableData: new TableData(
              td.headers,
              td.headerToValueType,
              td.headerToUnit,
              td.rowHeaders,
              td.cells,
              displayOptions.expandAllRows,
            ),
            version: prev.version + 1,
          };
        });
      }
      await dbUpdateHistoryTableSettings(db, newSettings);
      setSettings(newSettings);
    },
    [db, loadAndCombineDataForTable, settings, tableDataAndVersion],
  );

  const displayOptions = React.useMemo(
    () =>
      new DisplayOptions(
        settings?.expandAllRows ?? false,
        settings?.showDaysWithoutEntries ?? true,
      ),
    [settings],
  );

  const handleColumnVisibilityMenuItemPress = () => {
    if (settings !== null) {
      setIsMenuOpen(false);
      setColumnVisibilitDialogOpen(true);
    }
  };

  const handleColumnVisibilityConfigurationChange = React.useCallback(
    async (visibleHeaders: Set<string>) => {
      setColumnVisibilitDialogOpen(false);

      if (settings === null || tableDataAndVersion.tableData === null) {
        return;
      }
      const td = tableDataAndVersion.tableData;

      setTableDataAndVersion((prev) => {
        return {
          tableData: null,
          version: prev.version + 1,
        };
      });

      for (const [header, cc] of settings.columnConfigs.entries()) {
        if (visibleHeaders.has(header)) {
          cc.isShown = true;
        } else {
          cc.isShown = false;
        }
      }
      const settingsPromise = dbUpdateHistoryTableSettings(db, settings);

      const { rowHeaders, cells } = filterDateRange(
        rowHeadersAll,
        cellsAll,
        dateRange,
      );
      const { filteredHeaders, filteredCells } = filterHeaderVisibility(
        headersAll,
        cells,
        visibleHeaders,
      );

      setTableDataAndVersion((prev) => {
        return {
          tableData: new TableData(
            filteredHeaders,
            td.headerToValueType,
            td.headerToUnit,
            rowHeaders,
            filteredCells,
            td.expandAllRows,
          ),
          version: prev.version + 1,
        };
      });

      await settingsPromise;
    },
    [
      db,
      tableDataAndVersion,
      settings,
      cellsAll,
      dateRange,
      filterDateRange,
      headersAll,
      rowHeadersAll,
    ],
  );

  const saveColumnWidth = React.useCallback(
    async (header: string, width: number) => {
      if (settings === null) {
        return;
      }
      const columnConfig = settings.columnConfigs.get(header);
      if (columnConfig) {
        columnConfig.width = width;
        await dbUpdateHistoryTableSettings(db, settings);
        // not reloaded/out of sync (only theoretically) on purpose
      }
    },
    [db, settings],
  );

  const saveColumnVisibility = React.useCallback(
    async (header: string, isShown: boolean) => {
      if (settings === null) {
        return;
      }
      const columnConfig = settings.columnConfigs.get(header);
      if (columnConfig) {
        columnConfig.isShown = isShown;
        await dbUpdateHistoryTableSettings(db, settings);
        // not reloaded/out of sync (only theoretically) on purpose
      }
    },
    [db, settings],
  );

  const swapColumnOrdinals = React.useCallback(
    async (headerFirst: string, headerSecond: string) => {
      if (settings === null) {
        return;
      }
      const ccFirst = settings.columnConfigs.get(headerFirst);
      const ccSecond = settings.columnConfigs.get(headerSecond);
      if (ccFirst && ccSecond) {
        const temp = ccFirst.ordinal;
        ccFirst.ordinal = ccSecond.ordinal;
        ccSecond.ordinal = temp;
      }
      await dbUpdateHistoryTableSettings(db, settings);
      // not reloaded/out of sync (only theoretically) on purpose
    },
    [db, settings],
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
        handleVisibleColumns={handleColumnVisibilityMenuItemPress}
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

      {columnVisibilitDialogOpen && (
        <ColumnVisibilityConfigurationDialog
          columnsAll={sortHeaders(headersAll, settings?.columnConfigs)}
          initialVisibleColumns={
            // not-null checked when the dialog toggle is set
            getVisibleHeaders(settings?.columnConfigs!)
          }
          onApply={handleColumnVisibilityConfigurationChange}
          onCancel={() => setColumnVisibilitDialogOpen(false)}
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
            settingsColumnWidths={settingsColumnWidths}
            menuIsOpen={isMenuOpen}
            saveColumnWidth={saveColumnWidth}
            saveColumnVisibility={saveColumnVisibility}
            swapColumnOrdinals={swapColumnOrdinals}
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
