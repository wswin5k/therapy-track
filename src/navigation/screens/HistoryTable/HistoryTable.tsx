import { useFocusEffect, useTheme } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedRef,
  scrollTo,
  useAnimatedScrollHandler,
  useScrollOffset,
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
import { scheduleOnUI } from "react-native-worklets";

const TABLE_RADIUS = DEFAULT_BORDER_RADIUS;
const DELTA_WIDTH_BUFFER = 10;

const COLUMN_HEADER_PADDING = 8;

const MIN_CELL_HEIGHT = 50;
const MIN_CELL_LINES_LENGTH = 2;

const MIN_CELL_WIDTH = 60; //should fit at least 4 characters in one line
const MID_CELL_WIDTH = 150;

const ROW_HEADER_WIDTH = 90;

const COLUMN_MENU_TABLE_SCROLL_MARGIN_X = 150;
const COLUMN_MENU_TABLE_SCROLL_MARGIN_Y = 80;
const COLUMN_MENU_APPROX_WIDTH = 80;

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
    public expandAllRows: boolean,
  ) {}
}

type HistoryTableProps = {
  td: TableData;
  id: number;
  settingsColumnWidths: Map<string, number | null>;
  menuIsOpen: boolean;
  saveColumnWidth: (header: string, width: number) => Promise<void>;
  saveColumnVisibility: (header: string, isShown: boolean) => Promise<void>;
};

export default function HistoryTable({
  td,
  id,
  settingsColumnWidths,
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

  const [visibleHeaders, setVisibleColumns] = React.useState<Set<string>>(
    new Set(td.headers),
  );
  const [lastColumnIndex, setLastColumnIndex] = React.useState<number>(
    td.headers.length - 1,
  );

  const [columnIndexMap, setColumnIndexMap] = React.useState<number[]>(
    Array.from({ length: td.headers.length }, (_, idx: number) => idx),
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

  const { left: safeInsetsLeft, right: sefeInsetsRight } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { width: windowDimensionsWidth } = useWindowDimensions();

  const columnHeadersRef = useAnimatedRef<Animated.ScrollView>();
  const tableBodyHorizontalRef = useAnimatedRef<Animated.ScrollView>();

  const scrollFromBodyY = useSharedValue(0);
  const bodyIsUserScrolling = useSharedValue(false);
  const scrollFromRowHeadersY = useSharedValue(0);
  const rowHeadersIsUserScrolling = useSharedValue(false);

  const rowHeadersRef = useAnimatedRef<Animated.ScrollView>();
  const tableBodyVerticalRef = useAnimatedRef<Animated.ScrollView>();

  const horizontalOffset = useScrollOffset(tableBodyHorizontalRef);

  const scrollHorizontally = (delta: number) => {
    scheduleOnUI(() => {
      "worklet";
      if (!delta) {
        return;
      }
      const offset = Math.max(0, horizontalOffset.value + delta);
      scrollTo(columnHeadersRef, offset, 0, false);
      scrollTo(tableBodyHorizontalRef, offset, 0, false);
    });
  };

  const scrollHandlerX = useAnimatedScrollHandler({
    onScroll: (event: ReanimatedScrollEvent) => {
      if (columnHeadersRef) {
        scrollTo(columnHeadersRef, event.contentOffset.x, 0, false);
      }
    },
  });
  const scrollHandlerBodyY = useAnimatedScrollHandler({
    onScroll: (event: ReanimatedScrollEvent) => {
      if (bodyIsUserScrolling.value && !rowHeadersIsUserScrolling.value) {
        scrollFromBodyY.value = event.contentOffset.y;
      }
    },
    onBeginDrag: () => {
      rowHeadersIsUserScrolling.value = false;
      bodyIsUserScrolling.value = true;
    },
    onMomentumEnd: () => {
      bodyIsUserScrolling.value = false;
    },
  });
  const scrollHandlerRowHeadersY = useAnimatedScrollHandler({
    onScroll: (event: ReanimatedScrollEvent) => {
      if (rowHeadersIsUserScrolling.value && !bodyIsUserScrolling.value) {
        scrollFromRowHeadersY.value = event.contentOffset.y;
      }
    },
    onBeginDrag: () => {
      rowHeadersIsUserScrolling.value = true;
      bodyIsUserScrolling.value = false;
    },
    onMomentumEnd: () => {
      rowHeadersIsUserScrolling.value = false;
    },
  });

  useDerivedValue(() => {
    if (rowHeadersRef) {
      scrollTo(rowHeadersRef, 0, scrollFromBodyY.value, false);
    }
  });
  useDerivedValue(() => {
    if (tableBodyVerticalRef) {
      scrollTo(tableBodyVerticalRef, 0, scrollFromRowHeadersY.value, false);
    }
  });

  const viewportWidthRef = React.useRef(0);
  const horizontalContentWidthRef = React.useRef(0);
  const [maxScrollX, setMaxScrollX] = React.useState(0);

  const updateMaxScroll = () => {
    const max = Math.max(
      0,
      horizontalContentWidthRef.current - viewportWidthRef.current,
    );
    setMaxScrollX(max);
  };

  const handleColumnHeadersLayout = (event: LayoutChangeEvent) => {
    viewportWidthRef.current = event.nativeEvent.layout.width;
    updateMaxScroll();
  };

  const handleColumnHeadersContentSizeChange = (
    width: number,
    _height: number,
  ) => {
    horizontalContentWidthRef.current = width;
    updateMaxScroll();
  };

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

  const computeColumnHeaderStyles = (
    columnIndex: number,
    columnDataIndex: number,
  ) => {
    const styles: Record<string, any> = {};
    const isInLastColumn = columnIndex === lastColumnIndex;
    if (isInLastColumn) {
      styles.borderTopRightRadius = TABLE_RADIUS;
    }

    styles.width = columnWidths[columnDataIndex];

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
    columnDataIndex: number,
  ) => {
    const styles: Record<string, any> = {};
    const isInLastRow = rowIndex === td.cells.length - 1;
    const isInLastColumn = columnIndex === lastColumnIndex;

    if (isInLastColumn) {
      if (isInLastRow) {
        styles.borderBottomRightRadius = TABLE_RADIUS;
      }
    }

    styles.width = columnWidths[columnDataIndex];
    styles.height = rowHeights[rowIndex];

    if (
      td.headerToValueType.get(td.headers[columnDataIndex]) ===
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

  const handleHiddenColumnHeaderLayout = (
    columnIndex: number,
    headerFitWidth: number,
  ) => {
    // called on initial mount
    const multiSelectFitWidth = calculateMultiSelectFitWidth(columnIndex);
    setColumnWidthsFromHeaderLayout((current) => {
      const newValue = current.map((el, idx) => {
        if (columnIndex === idx) {
          if (el !== null && el.headerFit > headerFitWidth) {
            return el;
          }
          return new ColumnFitWidths(headerFitWidth, multiSelectFitWidth);
        } else {
          return el;
        }
      });
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
          if (td.expandAllRows) {
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
          if (td.expandAllRows) {
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

  const handleCellPress = (rowIndex: number, columnDataIndex: number) => {
    // toggles row height
    if (td.expandAllRows) {
      return;
    }
    setRowHeights((current) =>
      current.map((el, idx) => {
        if (rowIndex === idx) {
          const fittingHeight =
            fittingCellHeights.current[rowIndex][columnDataIndex];
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
            fittingCellLineLenghts.current[rowIndex][columnDataIndex];
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
    relevantColumnForRowHeight.current[rowIndex] = columnDataIndex;
  };

  const handleToggleColumnWidth = async (columnDataIndex: number) => {
    // this triggers a layout event handler that updates the actual column width
    const nextWidth = columnWidthsCycles.current[columnDataIndex].next().value;
    setIntermediateColumnsWidths((current) =>
      current.map((el, idx) => {
        if (columnDataIndex === idx) {
          return nextWidth;
        } else {
          return el;
        }
      }),
    );
    await saveColumnWidth(td.headers[columnDataIndex], nextWidth);
  };

  const handleOpenHeaderMenu = (columnIndex: number) => {
    headerPositionRefs.current[columnIndex]?.measure(
      (
        x: number,
        y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number,
      ) => {
        setHeaderMenu({
          index: columnIndex,
          left: pageX - TABLE_MARGIN_TOPLEFT - safeInsetsLeft,
          top: pageY + height - headerHeight - TABLE_MARGIN_TOPLEFT,
        });
      },
    );
  };

  const handleHideHeaderMenu = () => {
    setHeaderMenu(null);
  };

  const handleColumnMenuHidePress = async () => {
    if (headerMenu === null) {
      return;
    }
    const dataIndex = columnIndexMap[headerMenu.index];
    const header = td.headers[dataIndex];
    setLastColumnIndex((prev) =>
      headerMenu?.index === prev ? prev - 1 : prev,
    );
    setHeaderMenu(null);
    setVisibleColumns((prev) => {
      prev.delete(header);
      return new Set([...prev]);
    });
    await saveColumnVisibility(td.headers[dataIndex], false);
  };

  const handleColumnMoveLeftPress = () => {
    if (headerMenu === null || headerMenu.index <= 0) {
      return;
    }
    setColumnIndexMap((prev) => {
      const leftDataIndex = prev[headerMenu.index - 1];
      const currentDataIndex = prev[headerMenu.index];
      return prev.map((el, idx) => {
        if (idx === headerMenu.index - 1) {
          return currentDataIndex;
        } else if (idx === headerMenu.index) {
          return leftDataIndex;
        } else {
          return el;
        }
      });
    });

    const nextColumnIndex = headerMenu.index - 1;
    const nextDataColumnIndex = columnIndexMap[nextColumnIndex];
    const moveWidth = -columnWidths[nextDataColumnIndex];

    let tableMoveWidth = 0;
    const offsetBefore = horizontalOffset.value;
    if (
      headerMenu.left + moveWidth <
      COLUMN_MENU_TABLE_SCROLL_MARGIN_X - TABLE_MARGIN_TOPLEFT - safeInsetsLeft
    ) {
      if (-offsetBefore > moveWidth) {
        tableMoveWidth = -offsetBefore;
      } else {
        tableMoveWidth = moveWidth;
      }
    }

    scrollHorizontally(tableMoveWidth);
    setHeaderMenu({
      index: headerMenu.index - 1,
      left:
        headerMenu.left - columnWidths[nextDataColumnIndex] - tableMoveWidth,
      top: headerMenu.top,
    });
  };

  const handleColumnMoveRightPress = async () => {
    if (headerMenu === null || headerMenu.index >= lastColumnIndex) {
      return;
    }
    setColumnIndexMap((prev) => {
      const rightDataIndex = prev[headerMenu.index + 1];
      const currentDataIndex = prev[headerMenu.index];
      return prev.map((el, idx) => {
        if (idx === headerMenu.index + 1) {
          return currentDataIndex;
        } else if (idx === headerMenu.index) {
          return rightDataIndex;
        } else {
          return el;
        }
      });
    });

    const nextColumnIndex = headerMenu.index + 1;
    const nextDataColumnIndex = columnIndexMap[nextColumnIndex];
    const moveWidth = columnWidths[nextDataColumnIndex];

    let tableMoveWidth = 0;
    if (
      headerMenu.left + COLUMN_MENU_APPROX_WIDTH + moveWidth >
      windowDimensionsWidth -
        COLUMN_MENU_TABLE_SCROLL_MARGIN_Y -
        TABLE_MARGIN_BOTTOMRIGHT -
        sefeInsetsRight
    ) {
      if (moveWidth > maxScrollX - horizontalOffset.value) {
        tableMoveWidth = maxScrollX - horizontalOffset.value;
      } else {
        tableMoveWidth = moveWidth;
      }
    }

    scrollHorizontally(tableMoveWidth);
    setHeaderMenu({
      index: headerMenu.index + 1,
      left:
        headerMenu.left + columnWidths[nextDataColumnIndex] - tableMoveWidth,
      top: headerMenu.top,
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("No data to display")}
      </Text>
    </View>
  );

  if (
    td.headers.length === 0 ||
    td.cells.length === 0 ||
    td.rowHeaders.length === 0 ||
    visibleHeaders.size === 0
  ) {
    return renderEmptyState();
  }
  return (
    <View style={styles.container}>
      {headerMenu !== null && !menuIsOpen && (
        <ColumnMenuModal
          onClose={handleHideHeaderMenu}
          handleHidePress={handleColumnMenuHidePress}
          handleMoveLeftPress={handleColumnMoveLeftPress}
          handleMoveRightPress={handleColumnMoveRightPress}
          topPosition={headerMenu.top}
          leftPosition={headerMenu.left}
        />
      )}

      {/* Hidden column headers for measuring purposes */}
      {td.headers.map((columnHeader, columnIndex) => (
        <View
          key={columnIndex}
          style={[
            styles.hiddenContainer,
            styles.columnHeaderCell,
            // faster layout?
            { height: 60 },
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
              handleHiddenColumnHeaderLayout(columnIndex, width);
            }}
          >
            {columnHeader}
          </Text>
          {td.headerToUnit.get(columnHeader) && (
            <Text
              numberOfLines={1}
              style={[styles.headerUnitText]}
              onLayout={(event) => {
                const width =
                  Math.ceil(event.nativeEvent.layout.width) +
                  COLUMN_HEADER_PADDING * 2 +
                  10;
                handleHiddenColumnHeaderLayout(columnIndex, width);
              }}
            >
              {td.headerToUnit.get(columnHeader)}
            </Text>
          )}
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
                      Math.ceil(event.nativeEvent.layout.height) + 10;
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
            ref={columnHeadersRef}
            style={styles.row}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            onLayout={handleColumnHeadersLayout}
            onContentSizeChange={handleColumnHeadersContentSizeChange}
          >
            {Array.from({ length: td.headers.length }, (_, columnIndex) => {
              const columnDataIndex = columnIndexMap[columnIndex];
              const header = td.headers[columnDataIndex];
              const unit = td.headerToUnit.get(header);
              return (
                visibleHeaders.has(header) && (
                  <TouchableOpacity
                    key={columnDataIndex}
                    style={[
                      styles.columnHeaderCell,
                      computeColumnHeaderStyles(columnIndex, columnDataIndex),
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => handleToggleColumnWidth(columnDataIndex)}
                    // @ts-ignore
                    ref={(el) => {
                      headerPositionRefs.current[columnIndex] = el;
                    }}
                    onLongPress={() => {
                      handleOpenHeaderMenu(columnIndex);
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.headerText,
                        { color: theme.colors.textOnPrimary },
                      ]}
                    >
                      {header}
                    </Text>
                    {unit && (
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[
                          styles.headerUnitText,
                          { color: theme.colors.textSecondaryOnPrimary },
                        ]}
                      >
                        {unit}
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              );
            })}
          </Animated.ScrollView>
        </View>
      </View>
      {/* Main - vertical sticky header + scrollable body */}
      <View style={styles.table}>
        {/* Row Header */}
        <View style={[styles.rowHeaderClip]}>
          <Animated.ScrollView
            ref={rowHeadersRef}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandlerRowHeadersY}
            bounces={false}
            overScrollMode="never"
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
        <Animated.ScrollView
          horizontal
          onScroll={scrollHandlerX}
          bounces={false}
          ref={tableBodyHorizontalRef}
          overScrollMode="never"
        >
          <Animated.ScrollView
            onScroll={scrollHandlerBodyY}
            nestedScrollEnabled={true}
            ref={tableBodyVerticalRef}
            bounces={false}
            overScrollMode="never"
          >
            {td.cells.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((_, columnIndex) => {
                  const columnDataIndex = columnIndexMap[columnIndex];
                  return (
                    visibleHeaders.has(td.headers[columnDataIndex]) && (
                      <TouchableOpacity
                        key={columnDataIndex}
                        disabled={td.expandAllRows}
                        onPress={() =>
                          handleCellPress(rowIndex, columnDataIndex)
                        }
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
                            columnDataIndex,
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
                          {row[columnDataIndex]}
                        </Text>
                      </TouchableOpacity>
                    )
                  );
                })}
              </View>
            ))}
          </Animated.ScrollView>
        </Animated.ScrollView>
      </View>
    </View>
  );
}

const TABLE_MARGIN_TOPLEFT = 6;
const TABLE_MARGIN_BOTTOMRIGHT = 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: TABLE_MARGIN_TOPLEFT,
    marginLeft: TABLE_MARGIN_TOPLEFT,
    marginBottom: TABLE_MARGIN_BOTTOMRIGHT,
    marginRight: TABLE_MARGIN_BOTTOMRIGHT,
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
  headerUnitText: {
    fontSize: 14,
    fontWeight: 300,
  },
  cellText: {
    fontSize: 15,
    lineHeight: 19,
  },
  cornerCell: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  cell: {
    borderWidth: 0.5,
    paddingHorizontal: 6,
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
    alignItems: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 8,
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
