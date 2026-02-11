import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useTheme,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../index";
import { FloatingActionButton } from "../../components/FloatingActionButton";
import React from "react";
import {
  dbDeleteScheduledDosageRecord,
  dbGetScheduledDosageRecords,
  dbGetMedicines,
  dbGetSchedulesWithMedicines,
  dbGetUnscheduledDosageRecords,
  dbInsertScheduledDosageRecord,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { useTranslation } from "react-i18next";
import { BaseUnit, Medicine } from "../../models/Medicine";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";

class DosageInfo {
  medicineName: string;
  medicineBaseUnit: BaseUnit;
  amount: number;
  index: number;
  scheduleId: number;
  dosageRecordId: number | null;

  constructor(
    medicinName: string,
    medicineBaseUnit: BaseUnit,
    amount: number,
    index: number,
    scheduleId: number,
    dosageRecordId: number | null = null,
  ) {
    this.medicineName = medicinName;
    this.medicineBaseUnit = medicineBaseUnit;
    this.amount = amount;
    this.index = index;
    this.scheduleId = scheduleId;
    this.dosageRecordId = dosageRecordId;
  }
}

class UnscheduledDosageInfo {
  medicineName: string;
  medicineBaseUnit: BaseUnit;
  amount: number;
  dosageRecordId: number;

  constructor(
    medicinName: string,
    medicineBaseUnit: BaseUnit,
    amount: number,
    dosageRecordId: number,
  ) {
    this.medicineName = medicinName;
    this.medicineBaseUnit = medicineBaseUnit;
    this.amount = amount;
    this.dosageRecordId = dosageRecordId;
  }
}

class DefaultDict<T> {
  [key: string]: T[];

  constructor() {
    return new Proxy(this, {
      get: (target: any, prop: string) => {
        if (!(prop in target)) {
          target[prop] = new Array();
        }
        return target[prop];
      },
    }) as DefaultDict<T>;
  }
}

const pair = (a: number, b: number): number => {
  return 0.5 * (a + b) * (a + b + 1) + b;
};

type HomeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "HomeTabs"
>;

export function Home() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<HomeNavigationProp>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const [date, setDate] = React.useState(new Date());

  const [schedules, setSchedules] = React.useState<DefaultDict<DosageInfo>>(
    new DefaultDict<DosageInfo>(),
  );
  const [unscheduledDosages, setUnscheduledDosages] = React.useState<
    Array<UnscheduledDosageInfo>
  >([]);

  const [isDosageDone, setIsDosageDone] = React.useState<Map<number, boolean>>(
    new Map(),
  );

  const loadSchedules = React.useCallback(async () => {
    const result = await dbGetSchedulesWithMedicines(db);
    const selectedTime = date.getTime();
    const schedulesToday = result.filter((s) => {
      return (
        s.startDate.getTime() <= selectedTime &&
        (!s.endDate || (s.endDate && selectedTime <= s.endDate.getTime()))
      );
    });

    let intakes = new DefaultDict<DosageInfo>();

    for (const s of schedulesToday) {
      for (const [idx, dose] of s.doses.entries()) {
        intakes[idx.toString()].push(
          new DosageInfo(
            s.medicine.name,
            s.medicine.baseUnit,
            dose.amount,
            dose.index,
            s.dbId,
          ),
        );
      }
    }

    setSchedules(intakes);

    const dosageRecords = await dbGetScheduledDosageRecords(db, date, date);

    dosageRecords.forEach((dr) => {
      isDosageDone.set(pair(dr.scheduleId, dr.doseIndex), true);
    });
  }, []);

  const loadUnscheduledRecords = async () => {
    const unscheduledDosageRecords = await dbGetUnscheduledDosageRecords(
      db,
      date,
      date,
    );

    console.log(unscheduledDosageRecords);

    const medicinesMap = new Map<number, Medicine>();
    const medicines = await dbGetMedicines(db);
    medicines.forEach((m) => {
      medicinesMap.set(m.dbId, m);
    });

    const newUnscheduledDosageInfos: UnscheduledDosageInfo[] = [];
    unscheduledDosageRecords.map((dr) => {
      const m = medicinesMap.get(dr.medicineId);
      if (m) {
        newUnscheduledDosageInfos.push(
          new UnscheduledDosageInfo(m?.name, m.baseUnit, dr.amount, dr.dbId),
        );
      }
    });

    setUnscheduledDosages(newUnscheduledDosageInfos);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadSchedules();
      loadUnscheduledRecords();
    }, [loadSchedules]),
  );

  const handleCheck = async (dosage: DosageInfo) => {
    if (dosage.dosageRecordId) {
      await dbDeleteScheduledDosageRecord(db, dosage.dosageRecordId);

      dosage.dosageRecordId = null;

      const newIsDosageDone = new Map(isDosageDone);
      newIsDosageDone.set(pair(dosage.scheduleId, dosage.index), false);
      setIsDosageDone(newIsDosageDone);
    } else {
      const id = await dbInsertScheduledDosageRecord(db, {
        scheduleId: dosage.scheduleId,
        date,
        doseIndex: dosage.index,
      });

      dosage.dosageRecordId = id;

      const newIsDosageDone = new Map(isDosageDone);
      newIsDosageDone.set(pair(dosage.scheduleId, dosage.index), true);
      setIsDosageDone(newIsDosageDone);
      console.log(newIsDosageDone);
    }
  };

  const fabActions = [
    {
      label: "Single dosage",
      onPress: () =>
        navigation.navigate("SelectMedicineScreen", { mode: "one-time" }),
    },
    {
      label: "Schedule",
      onPress: () =>
        navigation.navigate("SelectMedicineScreen", { mode: "schedule" }),
    },
  ];

  const renderScheduledDosage = (dosage: DosageInfo, key: number) => {
    return (
      <View
        key={key}
        style={[
          styles.scheduleItem,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.scheduleContent}>
          <Text style={[styles.medicineName, { color: theme.colors.text }]}>
            {dosage.medicineName} {dosage.amount}{" "}
            {t(dosage.medicineBaseUnit, { count: dosage.amount })}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.checkButton,
            {
              backgroundColor: isDosageDone.get(
                pair(dosage.scheduleId, dosage.index),
              )
                ? theme.colors.success
                : theme.colors.textSecondary,
            },
          ]}
          onPress={() => handleCheck(dosage)}
        ></TouchableOpacity>
      </View>
    );
  };

  const renderUnscheduledDosage = (dosage: UnscheduledDosageInfo) => {
    return (
      <View
        key={dosage.dosageRecordId}
        style={[
          styles.scheduleItem,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.scheduleContent}>
          <Text style={[styles.medicineName, { color: theme.colors.text }]}>
            {dosage.medicineName} {dosage.amount}{" "}
            {t(dosage.medicineBaseUnit, { count: dosage.amount })}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {t("Nothing planned for today")}
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
        {t(
          "Use the button with a plus sign to add a schedule or one time entry.",
        )}
      </Text>
    </View>
  );

  let key = 0;
  let intakesAll = new Array<[number, DosageInfo]>();
  for (const intakes of Object.values(schedules)) {
    for (const intake of intakes) {
      intakesAll.push([key, intake]);
      key += 1;
    }
  }

  return (
    <DefaultMainContainer>
      <ScrollView style={styles.list}>
        {intakesAll.map(([key, intake]) => renderScheduledDosage(intake, key))}
        {unscheduledDosages.map((di) => renderUnscheduledDosage(di))}
        {!unscheduledDosages && !intakesAll && renderEmptyState()}
      </ScrollView>

      <FloatingActionButton actions={fabActions} position="right" />
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  scheduleItem: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  scheduleContent: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  frequency: {
    fontSize: 14,
    marginBottom: 2,
  },
  doses: {
    fontSize: 14,
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 13,
  },
  checkButton: {
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
});
