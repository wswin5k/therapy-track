import { useTheme } from "@react-navigation/native";
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

const TABLE_RADIUS = 10;

const CELL_HEIGHT = 50;

const MIN_CELL_WIDTH = 60; //should fit at least 4 characters in one line
const MID_CELL_WIDTH = 150;
const DIFF_BUFFER_WIDTH = 10;

const ROW_HEADER_WIDTH = 106;

function isSizeClose(a: number, b: number): boolean {
  return Math.abs(a - b) < DIFF_BUFFER_WIDTH;
}

type StickyTableProps = {
  columnHeaders: string[];
  rowHeaders: string[];
  data: string[][];
};

export default function StickyTable({
  columnHeaders,
  rowHeaders,
  data,
}: StickyTableProps) {
  const theme = useTheme();

  const [rowHeights, setRowHeights] = React.useState<number[]>(
    Array.from({ length: data.length }, () => CELL_HEIGHT),
  );
  const fittingCellHeights = React.useRef<number[][]>(
    Array.from({ length: data.length }, () =>
      Array.from({ length: data[0].length }, () => CELL_HEIGHT),
    ),
  );
  const [rowsNumberOfLines, setRowsNumberOfLines] = React.useState<number[]>(
    Array.from({ length: data.length }, () => 2),
  );

  const [columnWidthsFromHeaderLayout, setColumnWidthsFromHeaderLayout] =
    React.useState<(number[] | null)[]>(
      Array.from({ length: columnHeaders.length - 1 }, () => null),
    );
  const [columnWidthsFromCellLayout, setColumnWidthsFromCellLayout] =
    React.useState<(number | null)[]>(
      Array.from({ length: columnHeaders.length - 1 }, () => null),
    );
  const columnWidthsCycles = React.useRef(
    Array.from({ length: columnHeaders.length }, () => cycle([MID_CELL_WIDTH])),
  );
  const [intermediateColumnWidths, setIntermediateColumnsWidths] =
    React.useState<number[]>(
      Array.from({ length: columnHeaders.length }, () => MID_CELL_WIDTH),
    );
  const [columnWidths, setColumnsWidths] = React.useState<number[]>(
    Array.from({ length: columnHeaders.length }, () => MID_CELL_WIDTH),
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
    styles.height = CELL_HEIGHT;

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

    return styles;
  };

  const handleColumnHeaderLayout = (index: number, fittingWidth: number) => {
    const newMaxWidth = Math.max(fittingWidth, MIN_CELL_WIDTH);
    const newDefaultWidth = Math.min(newMaxWidth, MID_CELL_WIDTH);
    let widthOptions = [MIN_CELL_WIDTH, newDefaultWidth, newMaxWidth];
    setColumnWidthsFromHeaderLayout((current) =>
      current.map((el, idx) => (index === idx ? widthOptions : el)),
    );
  };

  const handleCellTextLayout = (index: number, linesNumber: number) => {
    setColumnWidthsFromCellLayout((current) =>
      current.map((el, idx) => {
        const elOrMin = el ?? MIN_CELL_WIDTH;
        return index === idx
          ? linesNumber < 10
            ? elOrMin
            : Math.max(elOrMin, MID_CELL_WIDTH)
          : el;
      }),
    );
  };

  const calculateColumnWidths = () => {
    const allNotNull = (arr: (number[] | number | null)[]) =>
      arr.every((el) => el !== null);

    if (
      !allNotNull(columnWidthsFromHeaderLayout) ||
      !allNotNull(columnWidthsFromCellLayout)
    ) {
      return;
    }

    const columnWidthsFromLayouts = columnWidthsFromHeaderLayout.map(
      (widthsFromHeaders, idx) =>
        [
          ...new Set([
            ...(widthsFromHeaders ?? []),
            columnWidthsFromCellLayout[idx],
          ]),
        ].sort((a, b) => a - b),
    );

    const newColumnWidths = [];
    for (const [idx, widths] of columnWidthsFromLayouts.entries()) {
      const coalescedWidths = widths.filter((a, idx) =>
        widths.slice(idx + 1).every((b) => !isSizeClose(a, b)),
      );

      let cycleOptions = [columnWidths[0]];
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
      console.log(idx, cycleOptions);
      columnWidthsCycles.current[idx] = cycle(cycleOptions);
      newColumnWidths.push(startingWidth);
    }
    setColumnsWidths(newColumnWidths);
  };

  React.useEffect(() => {
    calculateColumnWidths();
  }, [columnWidthsFromHeaderLayout, columnWidthsFromCellLayout]);

  const handleToggleRowHeight = (rowIndex: number, columnIndex: number) => {
    setRowHeights((current) =>
      current.map((el, idx) => {
        if (rowIndex === idx) {
          const fittingHeight =
            fittingCellHeights.current[rowIndex][columnIndex];
          if (el === CELL_HEIGHT) {
            return fittingHeight;
          } else {
            return CELL_HEIGHT;
          }
        } else {
          return el;
        }
      }),
    );
    setRowsNumberOfLines((current) =>
      current.map((el, idx) =>
        idx === rowIndex && rowHeights[idx] === CELL_HEIGHT ? 1000 : 2,
      ),
    );
  };

  const alignRowHeight = (rowIndex: number, columnIndex: number) => {
    setRowHeights((current) =>
      current.map((el, idx) => {
        if (rowIndex === idx) {
          const fittingHeight =
            fittingCellHeights.current[rowIndex][columnIndex];
          if (el === CELL_HEIGHT) {
            return CELL_HEIGHT;
          } else {
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

  const handleToggleColumnWidth = (index: number) => {
    // this triggers a layout event handler that updates the actual column width
    setIntermediateColumnsWidths((current) =>
      current.map((el, idx) => {
        if (index === idx) {
          const v = columnWidthsCycles.current[index].next().value;
          console.log(v);
          return v;
        } else {
          return el;
        }
      }),
    );
  };

  const handleCellLayout = (
    rowIndex: number,
    columnIndex: number,
    fittingHeight: number,
  ) => {
    console.log("handleCellLayout", rowIndex, columnIndex);
    let newFittingHeight = Math.max(fittingHeight, CELL_HEIGHT);
    if (isSizeClose(newFittingHeight, CELL_HEIGHT)) {
      newFittingHeight = CELL_HEIGHT;
    }
    fittingCellHeights.current[rowIndex][columnIndex] = newFittingHeight;
    alignRowHeight(rowIndex, columnIndex);
  };

  return (
    <View style={styles.container}>
      {/* Hidden column headers for measuring purposes */}
      {columnHeaders.slice(1).map((columnHeader, index) => (
        <View
          key={index}
          style={[
            styles.hiddenContainer,
            styles.columnHeaderCell,
            { height: CELL_HEIGHT },
          ]}
          pointerEvents="none"
        >
          <Text
            numberOfLines={1}
            style={[styles.headerText]}
            onLayout={(event) => {
              const width = Math.ceil(event.nativeEvent.layout.width) + 40;
              handleColumnHeaderLayout(index, width);
            }}
          >
            {columnHeader}
          </Text>
        </View>
      ))}
      {/* Hidden cells for measuring purposes */}
      {data.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, styles.hiddenContainer]}>
          {row.map((cell, columnIndex) => (
            <View key={columnIndex}>
              <View style={[styles.cell, { width: MIN_CELL_WIDTH }]}>
                <Text
                  style={[styles.cellText]}
                  onTextLayout={(event) => {
                    const linesLength = event.nativeEvent.lines.length;
                    handleCellTextLayout(columnIndex, linesLength);
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
                  style={[styles.cellText]}
                  onLayout={(event) => {
                    const height =
                      Math.ceil(event.nativeEvent.layout.height) + 20;
                    handleCellLayout(rowIndex, columnIndex, height);
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
            { width: ROW_HEADER_WIDTH, height: CELL_HEIGHT },
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.primary,
            },
          ]}
        >
          <Text style={[styles.headerText, { color: theme.colors.text }]}>
            {columnHeaders[0]}
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
            {columnHeaders.slice(1).map((columnHeader, index) => (
              <View key={index}>
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.columnHeaderCell,
                    computeColumnHeaderStyles(index, columnHeaders.length - 2),
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
                    {columnHeader}
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
        <View style={[styles.rowHeaderClip, { width: ROW_HEADER_WIDTH }]}>
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
                    onPress={() => handleToggleRowHeight(rowIndex, columnIndex)}
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
  },
  columnHeaderCell: {
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
  },
  rowHeaderCell: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  hiddenContainer: {
    position: "absolute",
    opacity: 0,
    // Prevents text from wrapping so you get full string width
    //alignSelf: "flex-start",
  },
});
