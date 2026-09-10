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
import { cycle, mixColors } from "../navigation/utils";
import React from "react";
import { ValueType } from "../models/AssessmentSchedule";

const TABLE_RADIUS = 10;
const DELTA_WIDTH_BUFFER = 10;
const COLUMN_HEADER_PADDING = 8;

const MIN_CELL_HEIGHT = 50;
const MIN_CELL_LINES_LENGTH = 2;

const MIN_CELL_WIDTH = 60; //should fit at least 4 characters in one line
const MID_CELL_WIDTH = 150;

const ROW_HEADER_WIDTH = 106;

function isSizeClose(a: number, b: number): boolean {
  return Math.abs(a - b) < DELTA_WIDTH_BUFFER;
}

type RecordHistoryTableProps = {
  fullHeaders: string[];
  fullHeaderToDisplayHeader: Map<string, string>;
  // todo possbily take the cells in the following types
  // not strings
  fullHeaderToValueType: Map<string, ValueType>;
  rowHeaders: string[];
  data: string[][];
  expandCells: boolean;
};

export default function RecordHistoryTable({
  fullHeaders,
  fullHeaderToDisplayHeader,
  fullHeaderToValueType,
  rowHeaders,
  data,
  expandCells,
}: RecordHistoryTableProps) {
  console.log(fullHeaderToValueType);
  const theme = useTheme();

  const [rowHeights, setRowHeights] = React.useState<number[]>(
    Array.from({ length: data.length }, () => MIN_CELL_HEIGHT),
  );
  const fittingCellHeights = React.useRef<number[][]>(
    Array.from({ length: data.length }, () =>
      Array.from({ length: data[0].length }, () => MIN_CELL_HEIGHT),
    ),
  );
  const fittingCellLineLenghts = React.useRef<number[][]>(
    Array.from({ length: data.length }, () =>
      Array.from({ length: data[0].length }, () => MIN_CELL_LINES_LENGTH),
    ),
  );
  const [rowsNumberOfLines, setRowsNumberOfLines] = React.useState<number[]>(
    Array.from({ length: data.length }, () => MIN_CELL_LINES_LENGTH),
  );
  const relevantColumnForRowHeight = React.useRef<number[]>(
    Array.from({ length: data.length }, () => 0),
  );

  const [columnWidthsFromHeaderLayout, setColumnWidthsFromHeaderLayout] =
    React.useState<(number[] | null)[]>(
      Array.from({ length: fullHeaders.length - 1 }, () => null),
    );
  const [columnWidthsFromCellLayout, setColumnWidthsFromCellLayout] =
    React.useState<(number | null)[]>(
      Array.from({ length: fullHeaders.length - 1 }, () => null),
    );
  const columnWidthsCycles = React.useRef(
    Array.from({ length: fullHeaders.length }, () => cycle([MID_CELL_WIDTH])),
  );
  const [intermediateColumnWidths, setIntermediateColumnsWidths] =
    React.useState<number[]>(
      Array.from({ length: fullHeaders.length }, () => MID_CELL_WIDTH),
    );
  const [columnWidths, setColumnsWidths] = React.useState<number[]>(
    Array.from({ length: fullHeaders.length }, () => MID_CELL_WIDTH),
  );

  const scrollX = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const columnHeaderRef = useAnimatedRef();
  const rowHeaderRef = useAnimatedRef();

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

  // Sync the "scroll" position of the headers with the body
  useDerivedValue(() => {
    scrollTo(columnHeaderRef, scrollX.value, 0, false);
  });
  useDerivedValue(() => {
    scrollTo(rowHeaderRef, 0, scrollY.value, false);
  });

  const computeColumnHeaderStyles = (
    columnIndex: number,
    columnsLength: number,
  ) => {
    const styles: Record<string, any> = {};
    const isInLastColumn = columnIndex === columnsLength;
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

    return styles;
  };

  const computeCellStyles = (
    rowIndex: number,
    columnIndex: number,
    rowsLength: number,
    columnsLength: number,
  ) => {
    const styles: Record<string, any> = {};
    const isInLastRow = rowIndex === rowsLength;
    const isInLastColumn = columnIndex === columnsLength;

    if (isInLastColumn) {
      if (isInLastRow) {
        styles.borderBottomRightRadius = TABLE_RADIUS;
      }
    }

    styles.width = columnWidths[columnIndex];
    styles.height = rowHeights[rowIndex];

    if (
      fullHeaderToValueType.get(fullHeaders[columnIndex + 1]) ===
      ValueType.MultiSelect
    ) {
      styles.alignItems = "flex-start";
    }

    return styles;
  };

  const handleColumnHeaderLayout = (index: number, fittingWidth: number) => {
    // called on initial mount
    const newMaxWidth = Math.max(fittingWidth, MIN_CELL_WIDTH);
    const newDefaultWidth = Math.min(newMaxWidth, MID_CELL_WIDTH);
    let widthOptions = [MIN_CELL_WIDTH, newDefaultWidth, newMaxWidth];
    setColumnWidthsFromHeaderLayout((current) => {
      const newValue = current.map((el, idx) =>
        index === idx ? widthOptions : el,
      );
      //calculateColumnWidths(newValue,columnWidthsFromCellLayout);
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
          if (expandCells) {
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

  const handleIntermediateCellLayout = (
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
          if (expandCells) {
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
      columnWidthsFromHeaderLayout: (number[] | null)[],
      columnWidthsFromCellLayout: (number | null)[],
    ) => {
      const allNotNull = (arr: (number[] | number | null)[]) =>
        arr.every((el) => el !== null);

      if (
        !allNotNull(columnWidthsFromHeaderLayout) ||
        !allNotNull(columnWidthsFromCellLayout)
      ) {
        return;
      }

      const columnWidthsFromMultiSelectValues = fullHeaders.slice(1).map((header) =>
        fullHeaderToValueType.get(header) === ValueType.MultiSelect
          ? 200
          : MID_CELL_WIDTH,
      );

      const columnWidthsFromLayouts = columnWidthsFromHeaderLayout.map(
        (widthsFromHeaders, idx) =>
          [
            ...new Set([
              ...(widthsFromHeaders ?? []),
              columnWidthsFromCellLayout[idx],
              columnWidthsFromMultiSelectValues[idx],
            ]),
          ].sort((a, b) => a - b),
      );

      const newColumnWidths = [];
      for (const [idx, widths] of columnWidthsFromLayouts.entries()) {
        let coalescedWidths = widths.filter((a, idx) =>
          widths.slice(idx + 1).every((b) => !isSizeClose(a, b)),
        );

        if (
          coalescedWidths.length === 3 &&
          coalescedWidths[2] === MID_CELL_WIDTH
        ) {
          coalescedWidths = [coalescedWidths[0], coalescedWidths[2]];
        }

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
        columnWidthsCycles.current[idx] = cycle(cycleOptions);
        newColumnWidths.push(startingWidth);
      }
      setIntermediateColumnsWidths(newColumnWidths);
    },
    [],
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
    if (expandCells) {
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

  const handleToggleColumnWidth = (index: number) => {
    // this triggers a layout event handler that updates the actual column width
    setIntermediateColumnsWidths((current) =>
      current.map((el, idx) => {
        if (index === idx) {
          return columnWidthsCycles.current[index].next().value;
        } else {
          return el;
        }
      }),
    );
  };

  return (
    <View style={styles.container}>
      {/* Hidden column headers for measuring purposes */}
      {fullHeaders.slice(1).map((columnHeader, index) => (
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
            {fullHeaderToDisplayHeader.get(columnHeader)}
          </Text>
        </View>
      ))}
      {/* Hidden cells for measuring purposes */}
      {data.map((row, rowIndex) => (
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
            computeRowHeaderStyles(0, rowHeaders.length - 1),
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.primary,
            },
          ]}
        >
          <Text style={[styles.headerText, { color: theme.colors.text }]}>
            {fullHeaderToDisplayHeader.get(fullHeaders[0])}
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
            {fullHeaders.slice(1).map((columnHeader, index) => (
              <View key={index}>
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.columnHeaderCell,
                    computeColumnHeaderStyles(index, fullHeaders.length - 2),
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => handleToggleColumnWidth(index)}
                >
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="middle"
                    style={[styles.headerText, { color: theme.colors.text }]}
                  >
                    {fullHeaderToDisplayHeader.get(columnHeader)}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
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
            {rowHeaders.map((rowHeader, index) => (
              <View
                key={index}
                style={[
                  styles.rowHeaderCell,
                  computeRowHeaderStyles(index + 1, rowHeaders.length),
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
                ]}
              >
                <Text style={[{ color: theme.colors.text }, styles.headerText]}>
                  {rowHeader}
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
            {data.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((cell, columnIndex) => (
                  <TouchableOpacity
                    key={columnIndex}
                    disabled={expandCells}
                    onPress={() => handleCellPress(rowIndex, columnIndex)}
                    style={[
                      styles.cell,
                      computeCellStyles(
                        rowIndex,
                        columnIndex,
                        data.length - 1,
                        row.length - 1,
                      ),
                      {
                        borderColor: theme.colors.border,
                        backgroundColor:
                          rowIndex % 2 === 0
                            ? theme.colors.surface
                            : theme.colors.card,
                      },
                    ]}
                  >
                    <Text
                      style={[{ color: theme.colors.text }, styles.cellText]}
                      numberOfLines={rowsNumberOfLines[rowIndex]}
                      ellipsizeMode="tail"
                    >
                      {cell}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </Animated.ScrollView>
        </Animated.ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  table: {
    flexDirection: "row",
    flex: 1,
  },
  row: {
    flexDirection: "row",
  },
  headerText: {
    fontSize: 15,
    fontWeight: 500,
  },
  cellText: {
    fontSize: 14,
  },
  cornerCell: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  cell: {
    borderWidth: 1,
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
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    padding: 6,
  },
  hiddenContainer: {
    position: "absolute",
    opacity: 0,
  },
});
