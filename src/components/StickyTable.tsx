import { useTheme } from "@react-navigation/native";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedRef,
  scrollTo,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import type { ReanimatedScrollEvent } from "react-native-reanimated/lib/typescript/hook/commonTypes";
import { mixColors } from "../navigation/utils";

const TABLE_RADIUS = 10;
const CELL_WIDTH = 140;
const CELL_HEIGHT = 50;
const ROW_HEADER_WIDTH = 120;

type StickyTableProps = {
  columnHeaders: string[];
  rowHeaders: string[];
  data: string[][];
  tableVerticalPadding?: number;
  tableHorizontalPadding?: number;
};

export default function StickyTable({
  columnHeaders,
  rowHeaders,
  data,
  tableVerticalPadding = 0,
  tableHorizontalPadding = 0,
}: StickyTableProps) {
  const theme = useTheme();

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

  /**
   * The following compute...Styles functions are all to add tableHorizontalPadding
   * & tableVerticalPadding support
   */

  function computeColumnHeaderStyles(
    columnIndex: number,
    columnsLength: number,
  ) {
    const styles: Record<string, any> = {};
    const isInFirstColumn = columnIndex === 0;
    const isInLastColumn = columnIndex === columnsLength;
    if (isInFirstColumn) {
      styles.paddingLeft = tableHorizontalPadding;
    }
    if (isInLastColumn) {
      styles.borderTopRightRadius = TABLE_RADIUS;
      styles.paddingRight = tableHorizontalPadding;
    }

    styles.width = CELL_WIDTH;
    styles.height = CELL_HEIGHT;
    if (isInFirstColumn || isInLastColumn) {
      styles.width += tableHorizontalPadding;
    }

    return styles;
  }

  function computeRowHeaderStyles(rowIndex: number, rowsLength: number) {
    const styles: Record<string, any> = {};
    const isInFirstRow = rowIndex === 0;
    const isInLastRow = rowIndex === rowsLength;
    if (isInFirstRow) {
      styles.borderTopLeftRadius = TABLE_RADIUS;
      styles.paddingTop = tableVerticalPadding;
    }
    if (isInLastRow) {
      styles.borderBottomLeftRadius = TABLE_RADIUS;
      styles.paddingBottom = tableVerticalPadding;
    }

    styles.width = ROW_HEADER_WIDTH;
    styles.height = CELL_HEIGHT;
    if (isInFirstRow || isInLastRow) {
      styles.height += tableVerticalPadding;
    }
    return styles;
  }

  function computeCellStyles(
    rowIndex: number,
    columnIndex: number,
    rowsLength: number,
    columnsLength: number,
  ) {
    const styles: Record<string, any> = {};
    const isInFirstRow = rowIndex === 0;
    const isInLastRow = rowIndex === rowsLength;
    const isInFirstColumn = columnIndex === 0;
    const isInLastColumn = columnIndex === columnsLength;

    if (isInFirstRow) {
      styles.paddingTop = tableVerticalPadding;
    }
    if (isInLastRow) {
      styles.paddingBottom = tableVerticalPadding;
    }
    if (isInFirstColumn) {
      styles.paddingLeft = tableHorizontalPadding;
    }
    if (isInLastColumn) {
      styles.paddingRight = tableHorizontalPadding;
      if (isInLastRow) {
        styles.borderBottomRightRadius = TABLE_RADIUS;
      }
    }

    styles.width = CELL_WIDTH;
    styles.height = CELL_HEIGHT;
    if (isInFirstRow || isInLastRow) {
      styles.height += tableVerticalPadding;
    }
    if (isInFirstColumn || isInLastColumn) {
      styles.width += tableHorizontalPadding;
    }

    return styles;
  }

  return (
    <View style={styles.container}>
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
          <Text style={[styles.headerText]}>{columnHeaders[0]}</Text>
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
              <View
                key={index}
                style={[
                  styles.columnHeaderCell,
                  computeColumnHeaderStyles(index, columnHeaders.length - 2),
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              >
                <Text style={[{ color: theme.colors.text }, styles.headerText]}>
                  {columnHeader}
                </Text>
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
                {row.map((cell, index) => (
                  <View
                    key={index}
                    style={[
                      styles.cell,
                      computeCellStyles(
                        rowIndex,
                        index,
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
                    >
                      {cell}
                    </Text>
                  </View>
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
    padding: 10,
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
    borderWidth: 1,
  },
  rowHeaderCell: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
});
