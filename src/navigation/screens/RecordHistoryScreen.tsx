import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { DataTable } from "react-native-paper";
import React from "react";
import {
  dbGetScheduledDosageRecords,
  dbGetSchedulesWithMedicines,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { Schedule } from "../../models/Schedule";

function extractDate(datetime: Date): string {
  return datetime.toISOString().split("T")[0];
}

export function RecordHistoryScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();

  const [dailyRecords, setDailyRecords] = React.useState<Array<Array<string>>>(
    [],
  );
  const [tableHeaders, setTableHeaders] = React.useState<Array<string>>([]);

  const loadData = React.useCallback(async () => {
    const scheduledRecords = await dbGetScheduledDosageRecords(db);
    console.log(scheduledRecords);

    const schedules = await dbGetSchedulesWithMedicines(db);
    const schedulesMap = new Map<number, Schedule>();

    schedules.forEach((s) => {
      schedulesMap.set(s.dbId, s);
    });

    const dayToHeaderValues = new Map<string, Map<string, number>>();
    const headersSet = new Set<string>();

    for (const r of scheduledRecords) {
      const dRecrod =
        dayToHeaderValues.get(extractDate(r.date)) || new Map<string, number>();

      const schedule = schedulesMap.get(r.scheduleId);
      if (!schedule) {
        throw Error("Record not connected to schedule");
      }
      const medicine = schedule.medicine;

      for (const ai of medicine.activeIngredients) {
        const label = `${ai.name} [${ai.unit}]`;
        headersSet.add(label.slice(0, 200));
        let amountTotal = dRecrod.get(label) || 0;
        amountTotal += ai.amount * schedule.doses[r.doseIndex].amount;
        dRecrod.set(label, amountTotal);
      }
      dayToHeaderValues.set(extractDate(r.date), dRecrod);
    }

    const newDailyRecords = new Array();

    const days = Array.from(dayToHeaderValues.keys()).sort().reverse();

    for (const day of days) {
      const record = [day];
      for (const header of headersSet) {
        const value = dayToHeaderValues.get(day)?.get(header);
        if (value) {
          record.push(value.toString());
        } else {
          record.push("");
        }
      }
      newDailyRecords.push(record);
    }
    setDailyRecords(newDailyRecords);
    const newTableHeaders = Array.from(headersSet);
    newTableHeaders.unshift("Date");
    setTableHeaders(newTableHeaders);

    console.log(headersSet);
    console.log(days);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const hasRecords = dailyRecords.length > 0;

  return (
    <DefaultMainContainer>
      {!hasRecords ? (
        <Text
          style={[styles.emptyState, { color: theme.colors.textSecondary }]}
        >
          No dosage records found
        </Text>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContainer]}
          horizontal={true}
        >
          <DataTable style={[styles.table]}>
            <DataTable.Row
              style={[
                styles.tableHeader,
                {
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
              {Array.from(tableHeaders).map((header, idx) => {
                return (
                  <DataTable.Cell
                    key={idx}
                    style={[
                      styles.tableCell,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    textStyle={[
                      styles.headerText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {header}
                  </DataTable.Cell>
                );
              })}
            </DataTable.Row>

            {dailyRecords.map((values, index) => (
              <DataTable.Row
                key={index}
                style={[
                  styles.tableRow,
                  {
                    borderBottomColor: theme.colors.border,
                  },
                ]}
              >
                {values.map((v, idx) => (
                  <DataTable.Cell
                    key={idx}
                    style={[
                      styles.tableCell,

                      {
                        borderColor: theme.colors.border,

                        backgroundColor:
                          index % 2 === 0
                            ? theme.colors.surface
                            : theme.colors.card,
                      },
                    ]}
                    textStyle={[styles.cellText, { color: theme.colors.text }]}
                    numeric={idx === 0 ? false : true}
                  >
                    {v}
                  </DataTable.Cell>
                ))}
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
      )}
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
    fontStyle: "italic",
  },
  scrollContainer: {},
  table: {},
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
    width: 150,
  },
  cellText: {
    fontSize: 14,
  },
});
