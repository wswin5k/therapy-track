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
  dbGetGroups,
  dbDeleteUnscheduledDosageRecord,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { useTranslation } from "react-i18next";
import { BaseUnit, Medicine } from "../../models/Medicine";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Group } from "../../models/Schedule";
import RNDateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  cancelGroupNotification,
  scheduleGroupNotification,
} from "../../services/notificationService";

class DosageInfo {
  medicineName: string;
  medicineBaseUnit: BaseUnit;
  amount: number;
  index: number;
  scheduleId: number;
  dosageRecordId: number | null;
  groupId: number | null;

  constructor(
    medicinName: string,
    medicineBaseUnit: BaseUnit,
    amount: number,
    index: number,
    scheduleId: number,
    dosageRecordId: number | null = null,
    groupId: number | null,
  ) {
    this.medicineName = medicinName;
    this.medicineBaseUnit = medicineBaseUnit;
    this.amount = amount;
    this.index = index;
    this.scheduleId = scheduleId;
    this.dosageRecordId = dosageRecordId;
    this.groupId = groupId;
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

function UnscheduledDosage({
  dosage,
  bottomBorder,
  loadUnscheduledRecords,
}: {
  dosage: UnscheduledDosageInfo;
  bottomBorder: boolean;
  loadUnscheduledRecords: () => void;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const db = useSQLiteContext();

  const [optionsOpened, setOptionsOpened] = React.useState<boolean>(false);

  const handleOptionsToggle = () => {
    setOptionsOpened(!optionsOpened);
  };

  const handleDelete = async () => {
    await dbDeleteUnscheduledDosageRecord(db, dosage.dosageRecordId);
    loadUnscheduledRecords();
  };

  const renderOptions = () => (
    <TouchableOpacity
      style={[styles.optionsOverlay, { zIndex: 1, position: "absolute" }]}
      onPress={handleOptionsToggle}
    >
      <TouchableOpacity
        style={[styles.optionsButton, { backgroundColor: theme.colors.error }]}
        onPress={handleDelete}
      >
        <Text style={styles.optionsButtonText}>{t("Delete")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleOptionsToggle}
      >
        <Text style={styles.optionsButtonText}>{t("Cancel")}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View>
      {optionsOpened && renderOptions()}
      <TouchableOpacity
        key={dosage.dosageRecordId}
        style={[
          styles.scheduleItem,
          {
            borderColor: theme.colors.border,
            filter: optionsOpened ? "blur(4px), opacity(50%)" : "opacity(50%)",
            borderBottomWidth: bottomBorder ? 2 : 0,
          },
        ]}
        onLongPress={handleOptionsToggle}
      >
        <View style={[styles.scheduleContent, { flex: 5 }]}>
          <Text
            style={[
              styles.contentText,
              {
                textDecorationLine: "line-through",
                color: theme.colors.text,
              },
            ]}
            numberOfLines={1}
          >
            {dosage.medicineName}
            {"  –  "}
            {dosage.amount}{" "}
            {t(dosage.medicineBaseUnit, { count: dosage.amount })}
          </Text>
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={theme.colors.success}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function Home() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<HomeNavigationProp>();
  const db = useSQLiteContext();
  const theme = useTheme();

  const [date, setDate] = React.useState(new Date());
  const [isDatePickerOpened, setIsDatePickerOpened] =
    React.useState<boolean>(false);

  const [groups, setGroups] = React.useState<Map<number | null, Group>>(
    new Map(),
  );
  const [scheduledDosages, setScheduledDosages] = React.useState<
    Map<number | null, DosageInfo[]>
  >(new Map());
  const [isDosageDone, setIsDosageDone] = React.useState<Map<number, boolean>>(
    new Map(),
  );
  const [unscheduledDosages, setUnscheduledDosages] = React.useState<
    Map<number | null, UnscheduledDosageInfo[]>
  >(new Map());

  const [isEmpty, setIsEmpty] = React.useState<boolean>(true);
  const [areGroupsEmpty, setAreGroupsEmpty] = React.useState<boolean>(true);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const loadGroups = React.useCallback(async () => {
    const groups = await dbGetGroups(db);
    const idToGroup = new Map();
    groups.forEach((g) => {
      idToGroup.set(g.dbId, g);
    });
    setGroups(idToGroup);
  }, []);

  const loadScheduledDosages = React.useCallback(async () => {
    const result = await dbGetSchedulesWithMedicines(db);
    const selectedTime = date.getTime();
    const schedulesToday = result.filter((s) => {
      return (
        s.startDate.getTime() <= selectedTime &&
        (!s.endDate || (s.endDate && selectedTime <= s.endDate.getTime()))
      );
    });

    let newIsEmpty = true;
    let newAreGroupsEmpty = true;

    const dosageRecords = await dbGetScheduledDosageRecords(db, date, date);

    let newScheduledDosages = new Map<number | null, DosageInfo[]>();
    for (const s of schedulesToday) {
      for (const dose of s.doses) {
        const groupId = dose.groupId;
        const groupDosages = newScheduledDosages.get(groupId) || [];
        const dosageRecord = dosageRecords.find(
          (dr) => dr.scheduleId === s.dbId && dr.doseIndex == dose.index,
        );
        const dosageRecordId = dosageRecord ? dosageRecord.dbId : null;
        groupDosages.push(
          new DosageInfo(
            s.medicine.name,
            s.medicine.baseUnit,
            dose.amount,
            dose.index,
            s.dbId,
            dosageRecordId,
            groupId,
          ),
        );
        newIsEmpty = false;
        if (groupId !== null) {
          newAreGroupsEmpty = false;
        }
        newScheduledDosages.set(groupId, groupDosages);
      }
    }
    setScheduledDosages(newScheduledDosages);
    if (!newIsEmpty) setIsEmpty(newIsEmpty);
    if (!newAreGroupsEmpty) setAreGroupsEmpty(newAreGroupsEmpty);

    const newIsDosageDone = new Map<number, boolean>();
    dosageRecords.forEach((dr) => {
      const key = pair(dr.scheduleId, dr.doseIndex);
      newIsDosageDone.set(key, true);
    });
    setIsDosageDone(newIsDosageDone);
  }, [date]);

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

    let newIsEmpty = true;
    let newAreGroupsEmpty = true;
    const newUnscheduledDosageInfos = new Map();
    unscheduledDosageRecords.map((dr) => {
      const groupDosages = newUnscheduledDosageInfos.get(dr.groupId) || [];
      const m = medicinesMap.get(dr.medicineId);
      if (m) {
        groupDosages.push(
          new UnscheduledDosageInfo(m?.name, m.baseUnit, dr.amount, dr.dbId),
        );
        newIsEmpty = false;
        if (dr.groupId !== null) {
          newAreGroupsEmpty = false;
        }
      }
      newUnscheduledDosageInfos.set(dr.groupId, groupDosages);
    });

    if (!newIsEmpty) setIsEmpty(newIsEmpty);
    if (!newAreGroupsEmpty) setAreGroupsEmpty(newAreGroupsEmpty);

    setUnscheduledDosages(newUnscheduledDosageInfos);
  };

  useFocusEffect(
    React.useCallback(() => {
      const newDate = new Date();
      setDate(newDate);
      navigation.setOptions({ title: formatDate(date) });
    }, []),
  );

  useFocusEffect(
    React.useCallback(() => {
      loadGroups();
      loadScheduledDosages();
      loadUnscheduledRecords();
    }, [date]),
  );

  React.useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setIsDatePickerOpened(true)}
          style={{ marginLeft: 16, marginRight: 20 }}
        >
          <Ionicons name="calendar" size={28} color={theme.colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

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

    if (dosage.groupId) {
      let allInGroupDone = true;
      for (const di of scheduledDosages.get(dosage.groupId) ?? []) {
        if (di.dosageRecordId === null) {
          allInGroupDone = false;
        }
      }
      if (allInGroupDone) {
        cancelGroupNotification(dosage.groupId);
      } else {
        const group = groups.get(dosage.groupId);
        if (group) {
          if (group.reminderTime && group.isReminderOn) {
            scheduleGroupNotification({
              reminderTime: group.reminderTime,
              dbId: dosage.groupId,
              name: group.name,
            });
          }
        }
      }
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, newDate?: Date) => {
    setIsDatePickerOpened(false);
    if (event.type === "dismissed") {
    } else if (newDate) {
      setDate(newDate);
      navigation.setOptions({ title: formatDate(newDate) });
    }
  };

  const fabActions = [
    {
      label: "Single dosage",
      onPress: () =>
        navigation.navigate("SelectMedicineScreen", {
          mode: "one-time",
          selectedDate: date.toISOString(),
        }),
    },
    {
      label: "Schedule",
      onPress: () =>
        navigation.navigate("SelectMedicineScreen", { mode: "schedule" }),
    },
  ];

  const renderScheduledDosage = (dosage: DosageInfo, bottomBorder: boolean) => {
    const isDone = isDosageDone.get(pair(dosage.scheduleId, dosage.index));

    return (
      <TouchableOpacity
        style={[
          styles.scheduleItem,
          {
            borderColor: theme.colors.border,
            filter: isDone ? "opacity(50%)" : "",
            borderBottomWidth: bottomBorder ? 2 : 0,
          },
        ]}
        onPress={() => handleCheck(dosage)}
      >
        <View style={[styles.scheduleContent, { flex: 5 }]}>
          <Text
            style={[
              styles.contentText,
              {
                textDecorationLine: isDone ? "line-through" : "none",
                color: theme.colors.text,
              },
            ]}
            numberOfLines={1}
          >
            {dosage.medicineName}
            {"  –  "}
            {dosage.amount}{" "}
            {t(dosage.medicineBaseUnit, { count: dosage.amount })}
          </Text>
          {isDone ? (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={theme.colors.success}
            />
          ) : (
            <Ionicons
              name="ellipse"
              size={24}
              color={theme.colors.textTertiary}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getScheduledDosages = (groupId?: number) =>
    scheduledDosages.get(groupId ?? null);

  const renderScheduledDosages = (group?: Group) => {
    const dosages = getScheduledDosages(group?.dbId);
    const lastIdx = dosages?.length ? dosages.length - 1 : 0;
    if (dosages) {
      return (
        <>
          <Text style={[styles.modeLabel, { color: theme.colors.text }]}>
            Scheduled dosages
          </Text>
          {dosages.map((di, idx) => (
            <View key={pair(di.scheduleId, di.index)}>
              {renderScheduledDosage(di, idx !== lastIdx)}
            </View>
          ))}
        </>
      );
    }
    return "";
  };

  const getUnscheduledDosages = (groupId?: number) =>
    unscheduledDosages.get(groupId ?? null);

  const renderUnscheduledDosages = (group?: Group) => {
    const dosages = getUnscheduledDosages(group?.dbId);
    const lastIdx = dosages?.length ? dosages.length - 1 : 0;
    if (dosages) {
      return (
        <>
          <Text
            style={[styles.modeLabel, { color: theme.colors.textSecondary }]}
          >
            Unscheduled dosages
          </Text>
          {dosages.map((di, idx) => (
            <View key={di.dosageRecordId}>
              <UnscheduledDosage
                dosage={di}
                bottomBorder={idx !== lastIdx}
                loadUnscheduledRecords={loadUnscheduledRecords}
              />
            </View>
          ))}
        </>
      );
    }
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

  return (
    <DefaultMainContainer>
      {isDatePickerOpened ? (
        <RNDateTimePicker
          mode="date"
          value={date}
          onChange={handleDateChange}
        />
      ) : (
        ""
      )}
      <ScrollView style={styles.list}>
        {[...groups.values()].map(
          (group) =>
            (getUnscheduledDosages(group.dbId) ||
              getScheduledDosages(group.dbId)) && (
              <LinearGradient
                key={group.dbId}
                colors={[theme.colors.card, theme.colors.card]}
                start={{ x: 1, y: 0.0 }}
                end={{ x: 0.0, y: 10 }}
                style={[
                  styles.groupContainer,
                  { borderColor: theme.colors.border },
                ]}
              >
                <Text
                  style={[styles.headerLabel, { color: theme.colors.text }]}
                >
                  {group.name}
                </Text>
                {renderScheduledDosages(group)}
                {renderUnscheduledDosages(group)}
              </LinearGradient>
            ),
        )}
        {(getUnscheduledDosages() || getScheduledDosages()) && (
          <LinearGradient
            key={-1}
            colors={[theme.colors.card, theme.colors.card, theme.colors.card]}
            start={{ x: 0.0, y: 0.0 }}
            end={{ x: 1, y: 1.0 }}
            style={[
              styles.groupContainer,
              { borderColor: theme.colors.border },
            ]}
          >
            {areGroupsEmpty || (
              <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
                Ungrouped
              </Text>
            )}
            {renderScheduledDosages()}
            {renderUnscheduledDosages()}
          </LinearGradient>
        )}
        {isEmpty && renderEmptyState()}
      </ScrollView>

      <FloatingActionButton actions={fabActions} position="right" />
    </DefaultMainContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 10,
  },
  scheduleItem: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 2,
    alignItems: "center",
    margin: 1,
  },
  headerLabel: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 8,
    alignSelf: "center",
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    alignSelf: "center",
  },
  scheduleContent: {
    flex: 1,
    padding: 16,
    flexDirection: "row",
    gap: 5,
    justifyContent: "space-between",
  },
  groupContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  contentText: {
    fontSize: 15,
    fontWeight: 400,
    marginBottom: 4,
    maxWidth: "85%",
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
    borderRadius: 15,
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
  optionsOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "rgba(255, 0, 0, 0.0)",
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 0,
    borderColor: "red",
  },
  optionsButton: {
    borderRadius: 8,
    minWidth: "25%",
    minHeight: 35,
    justifyContent: "center",
  },
  optionsButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
});
