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

  const [scheduledDosages, setScheduledDosages] = React.useState<
    Map<number, Map<number, DosageInfo>>
  >(new Map());
  const [isDosageDone, setIsDosageDone] = React.useState<Map<number, boolean>>(
    new Map(),
  );
  const [unscheduledDosages, setUnscheduledDosages] = React.useState<
    Array<UnscheduledDosageInfo>
  >([]);

  const loadScheduledDosages = React.useCallback(async () => {
    const result = await dbGetSchedulesWithMedicines(db);
    const selectedTime = date.getTime();
    const schedulesToday = result.filter((s) => {
      return (
        s.startDate.getTime() <= selectedTime &&
        (!s.endDate || (s.endDate && selectedTime <= s.endDate.getTime()))
      );
    });

    let newScheduledDosages = new Map<number, Map<number, DosageInfo>>();

    for (const s of schedulesToday) {
      for (const [idx, dose] of s.doses.entries()) {
        const dosages = newScheduledDosages.get(idx) || new Map();
        dosages.set(
          pair(s.dbId, dose.index),
          new DosageInfo(
            s.medicine.name,
            s.medicine.baseUnit,
            dose.amount,
            dose.index,
            s.dbId,
          ),
        );
        newScheduledDosages.set(idx, dosages);
      }
    }

    const dosageRecords = await dbGetScheduledDosageRecords(db, date, date);

    const newIsDosageDone = new Map<number, boolean>();
    dosageRecords.forEach((dr) => {
      const key = pair(dr.scheduleId, dr.doseIndex);
      newIsDosageDone.set(key, true);
      const dosage = newScheduledDosages.get(dr.doseIndex)?.get(key);
      if (dosage) {
        dosage.dosageRecordId = dr.dbId;
      }
    });

    setScheduledDosages(newScheduledDosages);
    setIsDosageDone(newIsDosageDone);
  }, []);

  const loadUnscheduledRecords = async () => {
    const unscheduledDosageRecords = await dbGetUnscheduledDosageRecords(
      db,
      date,
      date,
    );

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
      loadScheduledDosages();
      loadUnscheduledRecords();
    }, [loadScheduledDosages]),
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
        <View style={[styles.scheduleContent, { flex: 5 }]}>
          <Text style={[styles.medicineName, { color: theme.colors.text }]}>
            {dosage.medicineName} {dosage.amount}{" "}
            {t(dosage.medicineBaseUnit, { count: dosage.amount })}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            {
              flex: 1,
            },
            styles.checkButton,
          ]}
          onPress={() => handleCheck(dosage)}
        >
          <View
            style={[
              styles.checkIcon,
              {
                backgroundColor: isDosageDone.get(
                  pair(dosage.scheduleId, dosage.index),
                )
                  ? theme.colors.success
                  : theme.colors.textSecondary,
              },
            ]}
          ></View>
        </TouchableOpacity>
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
  let scheduledDosagesFlat = new Array<[number, DosageInfo]>();
  for (const intakes of scheduledDosages.values()) {
    for (const [idx, dosage] of intakes.entries()) {
      scheduledDosagesFlat.push([idx, dosage]);
      key += 1;
    }
  }

  return (
    <DefaultMainContainer>
      <ScrollView style={styles.list}>
        <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
          {t("Scheduled dosages")}
        </Text>
        {scheduledDosagesFlat.map(([key, intake]) =>
          renderScheduledDosage(intake, key),
        )}
        {unscheduledDosages.length > 0 ? (
          <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
            {t("One time dosages")}
          </Text>
        ) : (
          ""
        )}
        {unscheduledDosages.map((di) => renderUnscheduledDosage(di))}
        {!unscheduledDosages && !scheduledDosagesFlat && renderEmptyState()}
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
    flex: 1,
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  scheduleContent: {
    flex: 1,
    padding: 16,
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
  checkIcon: {
    borderRadius: 10,
    height: 25,
    width: 25,
  },
  checkButton: {
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "stretch",
    padding: 0,
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
