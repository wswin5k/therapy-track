import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../index";
import { FloatingActionButton } from "../../components/FloatingActionButton";
import React from "react";
import { dbGetSchedules, ScheduleRow } from "../../dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { Schedule } from "../../models/Schedule";
import { useTranslation } from "react-i18next";
import { BaseUnit } from "../../models/Medicine";

class IntakeInfo {
  medicineName: string;
  medicineBaseUnit: BaseUnit;
  dose: number;
  intakeIdx: number;

  constructor(
    medicinName: string,
    medicineBaseUnit: BaseUnit,
    dose: number,
    intakeIdx: number,
  ) {
    this.medicineName = medicinName;
    this.medicineBaseUnit = medicineBaseUnit;
    this.dose = dose;
    this.intakeIdx = intakeIdx;
  }
}

class DefaultDict<T> {
  [key: string]: T[];

  constructor() {
    return new Proxy(this, {
      get: (target: any, prop: string) => {
        if (!(prop in target)) {
          target[prop] = [];
        }
        return target[prop];
      },
    }) as DefaultDict<T>;
  }
}

type HomeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "HomeTabs"
>;

export function Home() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<HomeNavigationProp>();
  const db = useSQLiteContext();

  const [schedules, setSchedules] = React.useState<DefaultDict<IntakeInfo>>(
    new DefaultDict<IntakeInfo>(),
  );

  const loadSchedules = React.useCallback(async () => {
    const result = await dbGetSchedules(db);
    const today = new Date().getTime();
    console.log(result);
    const schedulesToday = result.filter((s) => {
      console.log(s.startDate.getTime());
      console.log(today, typeof today);
      console.log(today <= s.endDate?.getTime());
      return (
        s.startDate.getTime() <= today &&
        (!s.endDate || (s.endDate && today <= s.endDate.getTime()))
      );
    });
    console.log(schedulesToday);

    let intakes = new DefaultDict<IntakeInfo>();

    for (const s of schedulesToday) {
      for (const [idx, dose] of s.doses.entries()) {
        intakes[idx.toString()].push(
          new IntakeInfo(s.medicine.name, s.medicine.baseUnit, dose, idx),
        );
      }
    }

    setSchedules(intakes);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadSchedules();
    }, [loadSchedules]),
  );

  const handleCheck = (scheduleId: number) => {};

  const fabActions = [
    {
      label: "Add one-time entry",
      onPress: () =>
        navigation.navigate("SelectMedicineScreen", { mode: "one-time" }),
    },
    {
      label: "Add Schedule",
      onPress: () =>
        navigation.navigate("SelectMedicineScreen", { mode: "schedule" }),
    },
  ];

  const renderScheduleItem = (intake: IntakeInfo) => {
    return (
      <View
        key={intake.medicineName + intake.intakeIdx}
        style={styles.scheduleItem}
      >
        <View style={styles.scheduleContent}>
          <Text style={styles.medicineName}>
            {intake.medicineName} {intake.dose}{" "}
            {t(intake.medicineBaseUnit, { count: intake.dose })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleCheck(1)}
        >
          {/* <Text style={styles.deleteButtonText}>{t("o")}</Text> */}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{t("Nothing planned for today")}</Text>
      <Text style={styles.emptySubtext}>
        {t(
          "Use the button with a plus sign to add a schedule or one time entry.",
        )}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {Object.keys(schedules).length > 1
          ? Object.values(schedules).map((s) =>
              s.map((intake) => renderScheduleItem(intake)),
            )
          : renderEmptyState()}
      </ScrollView>

      <FloatingActionButton actions={fabActions} position="right" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  scheduleItem: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginLeft: 20,
    marginRight: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  scheduleContent: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  frequency: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  doses: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 13,
    color: "#999",
  },
  deleteButton: {
    backgroundColor: "#abeebdff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
    height: 20,
    width: 20,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
