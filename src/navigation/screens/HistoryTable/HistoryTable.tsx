import { useFocusEffect, useTheme } from "@react-navigation/native";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedRef,
  scrollTo,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import type { ReanimatedScrollEvent } from "react-native-reanimated/lib/typescript/hook/commonTypes";
import { cycle, mixColors } from "../../utils";
import React from "react";
import { ValueType } from "../../../models/AssessmentSchedule";
import { useTranslation } from "react-i18next";
import { dayDifference } from "../../../dateOnlyUtils";
import { t } from "i18next";
import { DEFAULT_BORDER_RADIUS } from "../../../commonStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ColumnMenuModal } from "./ColumnMenuModal";
import { useHeaderHeight } from "@react-navigation/elements";

const TABLE_RADIUS = DEFAULT_BORDER_RADIUS;
const DELTA_WIDTH_BUFFER = 10;
const COLUMN_HEADER_PADDING = 8;

const MIN_CELL_HEIGHT = 52;
const MIN_CELL_LINES_LENGTH = 2;

const MIN_CELL_WIDTH = 60; //should fit at least 4 characters in one line
const MID_CELL_WIDTH = 150;

const ROW_HEADER_WIDTH = 90;

function isSizeClose(a: number, b: number): boolean {
  return Math.abs(a - b) < DELTA_WIDTH_BUFFER;
}

class ColumnFitWidths {
  constructor(
    public headerFit: number,
    public multiSelectFit: number | null,
  ) {}
}

// packed into one object to maintain data integrity
// - when the object changes all of the internal fields are compliant
// with each other
export class TableData {
  constructor(
    public headers: string[],
    // todo possbily take the cells in the following types
    // not strings
    public headerToValueType: Map<string, ValueType>,
    public headerToUnit: Map<string, string>,
    public rowHeaders: Date[],
    public cells: string[][],
  ) {}
}

type HistoryTableProps = {
  td: TableData;
  id: number;
  expandAllRows: boolean;
  settingsColumnWidths: Map<string, number | null>;
  initialVisibleColumns: Set<string>;
  menuIsOpen: boolean;
  saveColumnWidth: (header: string, width: number) => Promise<void>;
  saveColumnVisibility: (header: string, isShown: boolean) => Promise<void>;
};

export default function HistoryTable({
  td,
  id,
  expandAllRows,
  settingsColumnWidths,
  initialVisibleColumns,
  menuIsOpen,
  saveColumnWidth,
  saveColumnVisibility,
}: HistoryTableProps) {
  console.log("history table key", id);
  const theme = useTheme();
  const { i18n } = useTranslation();

  const formatDate = React.useCallback(
    (date: Date) => {
      return new Intl.DateTimeFormat(i18n.resolvedLanguage, {
        weekday: "narrow",
        day: "2-digit",
        month: "short",
      }).format(date);
    },
    [i18n.resolvedLanguage],
  );

  const [rowHeights, setRowHeights] = React.useState<number[]>(
    Array.from({ length: td.cells.length }, () => MIN_CELL_HEIGHT),
  );
  const fittingCellHeights = React.useRef<number[][]>(
    Array.from({ length: td.cells.length }, () =>
      Array.from({ length: td.cells[0].length }, () => MIN_CELL_HEIGHT),
    ),
  );
  const fittingCellLineLenghts = React.useRef<number[][]>(
    Array.from({ length: td.cells.length }, () =>
      Array.from({ length: td.cells[0].length }, () => MIN_CELL_LINES_LENGTH),
    ),
  );
  React.useEffect(() => {
    fittingCellLineLenghts.current = Array.from(
      { length: td.cells.length },
      () =>
        Array.from({ length: td.cells[0].length }, () => MIN_CELL_LINES_LENGTH),
    );
  });
  const [rowsNumberOfLines, setRowsNumberOfLines] = React.useState<number[]>(
    Array.from({ length: td.cells.length }, () => MIN_CELL_LINES_LENGTH),
  );
  const relevantColumnForRowHeight = React.useRef<number[]>(
    Array.from({ length: td.cells.length }, () => 0),
  );

  const [columnWidthsFromHeaderLayout, setColumnWidthsFromHeaderLayout] =
    React.useState<(ColumnFitWidths | null)[]>(
      Array.from({ length: td.headers.length }, () => null),
    );
  const [columnWidthsFromCellLayout, setColumnWidthsFromCellLayout] =
    React.useState<(number | null)[]>(
      Array.from({ length: td.headers.length }, () => null),
    );
  const columnWidthsCycles = React.useRef(
    Array.from({ length: td.headers.length }, () => cycle([MID_CELL_WIDTH])),
  );

  const fillInitialColumnWidths = () => {
    return Array.from(
      { length: td.headers.length },
      (_, idx) => settingsColumnWidths.get(td.headers[idx]) ?? MID_CELL_WIDTH,
    );
  };
  const [intermediateColumnWidths, setIntermediateColumnsWidths] =
    React.useState<number[]>(fillInitialColumnWidths());
  const [columnWidths, setColumnsWidths] = React.useState<number[]>(
    fillInitialColumnWidths(),
  );

  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(
    initialVisibleColumns,
  );
  const computeLastColumnIndex = () => {
    // todo: toReversed and toSorted should be suppoorted in RN 0.89
    const reversed = [...td.headers].reverse();
    for (const [idx, header] of reversed.entries()) {
      if (initialVisibleColumns.has(header)) {
        return reversed.length - 1 - idx;
      }
    }
    return 0;
  };
  const [lastColumnIndex, setLastColumnIndex] = React.useState<number>(
    computeLastColumnIndex(),
  );

  const headerPositionRefs = React.useRef<
    (React.ComponentRef<TouchableOpacity> | null)[]
  >(Array.from({ length: td.headers.length }, () => null));

  const [headerMenu, setHeaderMenu] = React.useState<{
    index: number;
    left: number;
    top: number;
  } | null>(null);

  const [prevIsMenuOpen, setPrevIsMenuOpen] = React.useState(false);

  if (menuIsOpen !== prevIsMenuOpen) {
    setPrevIsMenuOpen(menuIsOpen);
    if (menuIsOpen) {
      setHeaderMenu(null);
    }
  }

  const { left: safeInsetsLeft } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const scrollX = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const columnHeaderRef = useAnimatedRef<Animated.ScrollView>();
  const rowHeaderRef = useAnimatedRef<Animated.ScrollView>();

  // Runs on the UI thread
  const scrollHandlerX = useAnimatedScrollHandler({
    onScroll: (event: ReanimatedScrollEvent) => {
      scrollX.value = event.contentOffset.x;
    },
  });
  const scrollHandlerY = useAnimatedScrollHandler({
    onScroll: (event: ReanimatedScrollEvent) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Sync the scroll position of the headers with the body
  useDerivedValue(() => {
    scrollTo(columnHeaderRef, scrollX.value, 0, false);
  });
  useDerivedValue(() => {
    scrollTo(rowHeaderRef, 0, scrollY.value, false);
  });

  const dateGapStyle = (rowIndex: number) => {
    const styles: Record<string, any> = {};
    if (rowIndex > 0) {
      if (
        dayDifference(td.rowHeaders[rowIndex - 1], td.rowHeaders[rowIndex]) > 1
      ) {
        styles.borderTopWidth = 3;
      }
    }
    return styles;
  };

  const computeColumnHeaderStyles = (columnIndex: number) => {
    const styles: Record<string, any> = {};
    const isInLastColumn = columnIndex === lastColumnIndex;
    if (isInLastColumn) {
      styles.borderTopRightRadius = TABLE_RADIUS;
    }

    styles.width = columnWidths[columnIndex];
    styles.height = MIN_CELL_HEIGHT;

    return styles;
  };

  const computeRowHeaderStyles = (rowIndex: number, rowsLength: number) => {
    const styles: Record<string, any> = {};
    const isInFirstRow = rowIndex === 0;
    const isInLastRow = rowIndex === rowsLength;
    if (isInFirstRow) {
      styles.borderTopLeftRadius = TABLE_RADIUS;
    }
    if (isInLastRow) {
      styles.borderBottomLeftRadius = TABLE_RADIUS;
    }

    styles.width = ROW_HEADER_WIDTH;
    styles.height = rowHeights[rowIndex - 1];

    return { ...styles, ...dateGapStyle(rowIndex - 1) };
  };

  const computeCellStyles = (
    rowIndex: number,
    columnIndex: number,
    rowsLength: number,
  ) => {
    const styles: Record<string, any> = {};
    const isInLastRow = rowIndex === rowsLength;
    const isInLastColumn = columnIndex === lastColumnIndex;

    if (isInLastColumn) {
      if (isInLastRow) {
        styles.borderBottomRightRadius = TABLE_RADIUS;
      }
    }

    styles.width = columnWidths[columnIndex];
    styles.height = rowHeights[rowIndex];

    if (
      td.headerToValueType.get(td.headers[columnIndex]) ===
      ValueType.MultiSelect
    ) {
      styles.alignItems = "flex-start";
    }

    return { ...styles, ...dateGapStyle(rowIndex) };
  };

  const calculateMultiSelectFitWidth = (columnIndex: number): number | null => {
    if (
      td.headerToValueType.get(td.headers[columnIndex]) !==
      ValueType.MultiSelect
    ) {
      return null;
    }
    const lognestLineLength = Math.max(
      ...td.cells.map((rowData) =>
        Math.max(
          ...rowData[columnIndex].split("\n").map((line) => line.length),
        ),
      ),
    );
    // todo this is an approximation, calculate it with hidden columns
    return lognestLineLength * 14 * 0.55;
  };

  const handleColumnHeaderLayout = (index: number, headerFitWidth: number) => {
    // called on initial mount
    const multiSelectFitWidth = calculateMultiSelectFitWidth(index);
    setColumnWidthsFromHeaderLayout((current) => {
      const newValue = current.map((el, idx) =>
        index === idx
          ? new ColumnFitWidths(headerFitWidth, multiSelectFitWidth)
          : el,
      );
      return newValue;
    });
  };

  const handleMinCellTextLayout = (
    rowIndex: number,
    columnIndex: number,
    linesLength: number,
  ) => {
    // effectively called on initial mount
    // if the content does not fit in 6 lines adds MID_CELL_WIDTH as one
    // of the columns widths

    setColumnWidthsFromCellLayout((current) =>
      current.map((el, idx) => {
        const elOrMin = el ?? MIN_CELL_WIDTH;
        return columnIndex === idx
          ? linesLength < 6
            ? elOrMin
            : Math.max(elOrMin, MID_CELL_WIDTH)
          : el;
      }),
    );
  };

  const handleIntermediateCellTextLayout = (
    rowIndex: number,
    columnIndex: number,
    fittingLinesLength: number,
  ) => {
    // effectively called on initial mount
    // and on column width toggle (header click)

    fittingCellLineLenghts.current[rowIndex][columnIndex] = Math.max(
      fittingLinesLength,
      MIN_CELL_LINES_LENGTH,
    );

    setRowsNumberOfLines((current) =>
      current.map((el, idx) => {
        if (rowIndex === idx) {
          if (expandAllRows) {
            return 1000;
          } else if (el === MIN_CELL_LINES_LENGTH) {
            return MIN_CELL_LINES_LENGTH;
          } else {
            return fittingCellLineLenghts.current[rowIndex][
              relevantColumnForRowHeight.current[rowIndex]
            ];
          }
        } else {
          return el;
        }
      }),
    );
  };

  const handleIntermediateCellLayout = async (
    rowIndex: number,
    columnIndex: number,
    fittingHeight: number,
  ) => {
    // effectively called on initial mount
    // and on column width toggle (header click)

    let newFittingHeight = Math.max(fittingHeight, MIN_CELL_HEIGHT);
    if (isSizeClose(newFittingHeight, MIN_CELL_HEIGHT)) {
      newFittingHeight = MIN_CELL_HEIGHT;
    }
    fittingCellHeights.current[rowIndex][columnIndex] = newFittingHeight;

    setRowHeights((current) =>
      current.map((el, idx) => {
        if (rowIndex === idx) {
          if (expandAllRows) {
            const maxFittingHeight = Math.max(
              ...fittingCellHeights.current[rowIndex],
            );
            return maxFittingHeight;
          } else if (el === MIN_CELL_HEIGHT) {
            return MIN_CELL_HEIGHT;
          } else {
            const fittingHeight =
              fittingCellHeights.current[rowIndex][
                relevantColumnForRowHeight.current[rowIndex]
              ];
            return fittingHeight;
          }
        } else {
          return el;
        }
      }),
    );

    setColumnsWidths((current) =>
      current.map((el, idx) =>
        idx === columnIndex ? intermediateColumnWidths[idx] : el,
      ),
    );
  };

  const calculateColumnWidths = React.useCallback(
    (
      columnWidthsFromHeaderLayout: (ColumnFitWidths | null)[],
      columnWidthsFromCellLayout: (number | null)[],
    ) => {
      const allNotNull = (arr: (ColumnFitWidths | number | null)[]) =>
        arr.every((el) => el !== null);

      if (
        !allNotNull(columnWidthsFromHeaderLayout) ||
        !allNotNull(columnWidthsFromCellLayout)
      ) {
        return;
      }

      const newColumnWidths = [];
      for (const [idx, textFitWidth] of columnWidthsFromCellLayout.entries()) {
        const fitWidths = columnWidthsFromHeaderLayout[idx];

        let defaultWidth =
          fitWidths.headerFit < MID_CELL_WIDTH
            ? fitWidths.headerFit
            : MID_CELL_WIDTH;

        let contentFitWidth = defaultWidth;

        if (textFitWidth !== null && fitWidths !== null) {
          contentFitWidth = Math.max(
            defaultWidth,
            textFitWidth,
            fitWidths.multiSelectFit ?? defaultWidth,
          );
        }

        let widths = [];
        if (fitWidths.headerFit > contentFitWidth) {
          widths = [MIN_CELL_WIDTH, contentFitWidth, fitWidths.headerFit];
        } else {
          // if header can be displayed within contentFitWidth then
          // it is not needed
          widths = [MIN_CELL_WIDTH, contentFitWidth];
        }

        let coalescedWidths = widths.filter((a, idx) =>
          widths.slice(idx + 1).every((b) => !isSizeClose(a, b)),
        );

        let cycleOptions = [coalescedWidths[0]];
        let startingWidth = coalescedWidths[0];
        if (coalescedWidths.length === 3) {
          startingWidth = coalescedWidths[1];
          cycleOptions = [
            coalescedWidths[2],
            coalescedWidths[1],
            coalescedWidths[0],
            coalescedWidths[1],
          ];
        } else if (coalescedWidths.length === 2) {
          startingWidth = coalescedWidths[1];
          cycleOptions = [coalescedWidths[0], coalescedWidths[1]];
        }

        // update start and cycles based on saved column widths in settings
        const settingsWidth = settingsColumnWidths.get(td.headers[idx]);
        if (settingsWidth) {
          const cycleOptionsDiffs = cycleOptions.map((el) =>
            Math.abs(el - settingsWidth),
          );
          const settingsWidthIdx = cycleOptionsDiffs.indexOf(
            Math.min(...cycleOptionsDiffs),
          );
          cycleOptions = Array.prototype.concat(
            cycleOptions.slice(settingsWidthIdx + 1),
            cycleOptions.slice(0, settingsWidthIdx + 1),
          );
          startingWidth = settingsWidth;
        }

        columnWidthsCycles.current[idx] = cycle(cycleOptions);
        newColumnWidths.push(startingWidth);
      }
      setIntermediateColumnsWidths(newColumnWidths);
    },
    [td.headers, settingsColumnWidths],
  );

  useFocusEffect(
    React.useCallback(() => {
      calculateColumnWidths(
        columnWidthsFromHeaderLayout,
        columnWidthsFromCellLayout,
      );
    }, [
      calculateColumnWidths,
      columnWidthsFromHeaderLayout,
      columnWidthsFromCellLayout,
    ]),
  );

  const handleCellPress = (rowIndex: number, columnIndex: number) => {
    // toggles row height
    if (expandAllRows) {
      return;
    }
    setRowHeights((current) =>
      current.map((el, idx) => {
        if (rowIndex === idx) {
          const fittingHeight =
            fittingCellHeights.current[rowIndex][columnIndex];
          if (fittingHeight > el || el === MIN_CELL_HEIGHT) {
            return fittingHeight;
          } else {
            return MIN_CELL_HEIGHT;
          }
        } else {
          return el;
        }
      }),
    );
    setRowsNumberOfLines((current) =>
      current.map((el, idx) => {
        if (rowIndex === idx) {
          const fittitngLinesLegth =
            fittingCellLineLenghts.current[rowIndex][columnIndex];
          if (fittitngLinesLegth > el || el === MIN_CELL_LINES_LENGTH) {
            return fittitngLinesLegth;
          } else {
            return MIN_CELL_LINES_LENGTH;
          }
        } else {
          return el;
        }
      }),
    );
    relevantColumnForRowHeight.current[rowIndex] = columnIndex;
  };

  const handleToggleColumnWidth = async (index: number) => {
    // this triggers a layout event handler that updates the actual column width
    const nextWidth = columnWidthsCycles.current[index].next().value;
    setIntermediateColumnsWidths((current) =>
      current.map((el, idx) => {
        if (index === idx) {
          return nextWidth;
        } else {
          return el;
        }
      }),
    );
    await saveColumnWidth(td.headers[index], nextWidth);
  };

  const handleOpenHeaderMenu = (index: number) => {
    headerPositionRefs.current[index]?.measure(
      (
        x: number,
        y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number,
      ) => {
        setHeaderMenu({
          index,
          left: pageX - TABLE_MARGIN - safeInsetsLeft,
          top: pageY + height - headerHeight - TABLE_MARGIN,
        });
      },
    );
  };

  const handleHideHeaderMenu = () => {
    setHeaderMenu(null);
  };

  const handleHidePress = async () => {
    if (headerMenu !== null) {
      const header = td.headers[headerMenu.index];
      setVisibleColumns((prev) => {
        prev.delete(header);
        return new Set([...prev]);
      });
      setLastColumnIndex((prev) =>
        headerMenu.index === prev ? prev - 1 : prev,
      );
      await saveColumnVisibility(td.headers[headerMenu.index], false);
      setHeaderMenu(null);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("No data to display")}
      </Text>
    </View>
  );

  const formatColumnHeader = (header: string) => {
    const unit = td.headerToUnit.get(header);
    return unit ? `${header} [${unit}]` : header;
  };

  if (
    td.headers.length === 0 ||
    td.cells.length === 0 ||
    td.rowHeaders.length === 0
  ) {
    return renderEmptyState();
  }
  return (
    <View style={styles.container}>
      {headerMenu !== null && !menuIsOpen && (
        <ColumnMenuModal
          onClose={handleHideHeaderMenu}
          handleHidePress={handleHidePress}
          topPosition={headerMenu?.top}
          leftPosition={headerMenu?.left}
        />
      )}
      {/* Hidden column headers for measuring purposes */}
      {td.headers.map((columnHeader, index) => (
        <View
          key={index}
          style={[
            styles.hiddenContainer,
            styles.columnHeaderCell,
            { height: MIN_CELL_HEIGHT },
          ]}
          pointerEvents="none"
        >
          <Text
            numberOfLines={1}
            style={[styles.headerText]}
            onLayout={(event) => {
              const width =
                Math.ceil(event.nativeEvent.layout.width) +
                COLUMN_HEADER_PADDING * 2 +
                10;
              handleColumnHeaderLayout(index, width);
            }}
          >
            {formatColumnHeader(columnHeader)}
          </Text>
        </View>
      ))}
      {/* Hidden cells for measuring purposes */}
      {td.cells.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, styles.hiddenContainer]}>
          {row.map((cell, columnIndex) => (
            <View key={columnIndex}>
              <View
                style={[styles.cell, styles.row, { width: MIN_CELL_WIDTH }]}
              >
                <Text
                  style={[styles.cellText]}
                  onTextLayout={(event) => {
                    const linesLength = event.nativeEvent.lines.length;
                    handleMinCellTextLayout(rowIndex, columnIndex, linesLength);
                  }}
                >
                  {cell}
                </Text>
              </View>
              <View
                style={[
                  styles.cell,
                  { width: intermediateColumnWidths[columnIndex] },
                ]}
              >
                <Text
                  style={[styles.cellText, { color: theme.colors.success }]}
                  onLayout={(event) => {
                    const height =
                      Math.ceil(event.nativeEvent.layout.height) + 20;
                    handleIntermediateCellLayout(rowIndex, columnIndex, height);
                  }}
                  onTextLayout={(event) => {
                    const linesLength = event.nativeEvent.lines.length;
                    handleIntermediateCellTextLayout(
                      rowIndex,
                      columnIndex,
                      linesLength,
                    );
                  }}
                >
                  {cell}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ))}

      {/* Top row: corner + horizontal sticky header */}
      <View style={styles.row}>
        <View
          style={[
            styles.cornerCell,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.primary,
            },
            computeRowHeaderStyles(0, td.rowHeaders.length),
          ]}
        >
          <Text
            style={[styles.headerText, { color: theme.colors.textOnPrimary }]}
          >
            {t("Date")}
          </Text>
        </View>

        {/* Top Header */}
        <View style={styles.columnHeaderClip}>
          <Animated.ScrollView
            ref={columnHeaderRef}
            style={styles.row}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
          >
            {td.headers.map(
              (columnHeader, index) =>
                visibleColumns.has(columnHeader) && (
                  <View key={index}>
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.columnHeaderCell,
                        computeColumnHeaderStyles(index),
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.primary,
                        },
                      ]}
                      onPress={() => handleToggleColumnWidth(index)}
                      // @ts-ignore
                      ref={(el) => (headerPositionRefs.current[index] = el)}
                      onLongPress={() => {
                        handleOpenHeaderMenu(index);
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        style={[
                          styles.headerText,
                          { color: theme.colors.textOnPrimary },
                        ]}
                      >
                        {formatColumnHeader(columnHeader)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ),
            )}
          </Animated.ScrollView>
        </View>
      </View>
      {/* Main - vertical sticky header + scrollable body */}
      <View style={styles.table}>
        {/* Row Header */}
        <View style={[styles.rowHeaderClip]}>
          <Animated.ScrollView
            ref={rowHeaderRef}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          >
            {td.rowHeaders.map((rowHeader, index) => (
              <View
                key={index}
                style={[
                  styles.rowHeaderCell,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: mixColors(
                      index % 2 === 0
                        ? theme.colors.surface
                        : theme.colors.card,
                      theme.colors.primary,
                      0.85,
                    ),
                  },
                  computeRowHeaderStyles(index + 1, td.rowHeaders.length),
                ]}
              >
                <Text style={[{ color: theme.colors.text }, styles.headerText]}>
                  {formatDate(rowHeader)}
                </Text>
              </View>
            ))}
          </Animated.ScrollView>
        </View>

        {/* Scrollable body */}
        <Animated.ScrollView horizontal onScroll={scrollHandlerX}>
          <Animated.ScrollView
            onScroll={scrollHandlerY}
            nestedScrollEnabled={true}
          >
            {td.cells.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map(
                  (cell, columnIndex) =>
                    visibleColumns.has(td.headers[columnIndex]) && (
                      <TouchableOpacity
                        key={columnIndex}
                        disabled={expandAllRows}
                        onPress={() => handleCellPress(rowIndex, columnIndex)}
                        style={[
                          styles.cell,

                          {
                            borderColor: theme.colors.border,
                            backgroundColor:
                              rowIndex % 2 === 0
                                ? theme.colors.surface
                                : theme.colors.card,
                          },
                          computeCellStyles(
                            rowIndex,
                            columnIndex,
                            td.cells.length - 1,
                          ),
                        ]}
                      >
                        <Text
                          style={[
                            { color: theme.colors.text },
                            styles.cellText,
                          ]}
                          numberOfLines={rowsNumberOfLines[rowIndex]}
                          ellipsizeMode="tail"
                        >
                          {cell}
                        </Text>
                      </TouchableOpacity>
                    ),
                )}
              </View>
            ))}
          </Animated.ScrollView>
        </Animated.ScrollView>
      </View>
    </View>
  );
}

const TABLE_MARGIN = 6;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: TABLE_MARGIN,
  },
  table: {
    flexDirection: "row",
    flex: 1,
  },
  row: {
    flexDirection: "row",
  },
  headerText: {
    fontSize: 16,
    fontWeight: 500,
  },
  cellText: {
    fontSize: 15,
  },
  cornerCell: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  cell: {
    borderWidth: 0.5,
    minHeight: 48,
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  columnHeaderClip: {
    overflow: "hidden",
    flex: 1,
  },
  rowHeaderClip: {
    overflow: "hidden",
    width: ROW_HEADER_WIDTH,
  },
  columnHeaderCell: {
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
    borderWidth: 1,
  },
  rowHeaderCell: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderWidth: 1,
    padding: 6,
  },
  hiddenContainer: {
    position: "absolute",
    opacity: 0,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 24,
    marginBottom: 8,
    marginTop: 14,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
});
