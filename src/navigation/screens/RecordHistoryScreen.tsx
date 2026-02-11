import { View, StyleSheet, Text } from "react-native";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";

function TableRow({ children }: Readonly<{ children: React.ReactNode }>) {
  return <View style={styles.tableRow}>{children}</View>;
}

function TableCell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <View style={styles.tableCell}>
      <Text>{children}</Text>
    </View>
  );
}

export function RecordHistoryScreen() {
  return (
    <DefaultMainContainer justifyContent="flex-start">
      <TableRow>
        <TableCell>{"Date"}</TableCell>
        <TableCell>{"adalimumab [mg]"}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>{"2026-02-11"}</TableCell>
        <TableCell>{"40"}</TableCell>
      </TableRow>
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  tableRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "nowrap",
  },
  tableCell: {
    borderWidth: 1,
    padding: 10,
    height: 40,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100, // Space for footer
  },
});
