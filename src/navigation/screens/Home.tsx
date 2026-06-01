import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useTheme } from "@react-navigation/native";
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
  dbGetUnscheduledMeasurmentRecords,
  dbGetAssessments,
  dbDeleteUnscheduledMeasurmentRecord,
  dbGetAssessmentSchedulesWithAssessments,
  dbGetScheduledMeasurmentRecords,
  dbInsertScheduledMeasurmentRecord,
  dbDeleteScheduledMeasurmentRecord,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { useTranslation } from "react-i18next";
import { BaseUnit, Medicine } from "../../models/MedicineSchedule";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Group } from "../../models/Frequency";
import {
  cancelGroupNotification,
  scheduleGroupNotification,
} from "../../services/notificationService";
import { baseUnitToSingularShortForm } from "../enumMappings";
import { AssessmentValue } from "../../models/Records";
import { Assessment, AssessmentType } from "../../models/AssessmentSchedule";
import { AssessmentInputDialog } from "../../components/ValueInputDialog";
import { dayDifference } from "../utils";

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
    medicineName: string,
    medicineBaseUnit: BaseUnit,
    amount: number,
    dosageRecordId: number,
  ) {
    this.medicineName = medicineName;
    this.medicineBaseUnit = medicineBaseUnit;
    this.amount = amount;
    this.dosageRecordId = dosageRecordId;
  }
}

class UnscheduledMeasurmentInfo {
  constructor(
    public assessmentName: string,
    public value: AssessmentValue,
    public measurmentRecordId: number,
  ) {}
}

class ScheduledMeasurmentInfo {
  constructor(
    public assessmentName: string,
    public assessmentType: AssessmentType,
    public value: AssessmentValue | null,
    public index: number,
    public assessmentScheduleId: number,
    public measurmentRecordId: number | null,
    public groupId: number | null,
  ) {}
}

const pair = (a: number, b: number): number => {
  return 0.5 * (a + b) * (a + b + 1) + b;
};

function UnscheduledDosage({
  dosage,
  bottomBorder,
  loadUnscheduledRecords,
}: {
  dosage: UnscheduledDosageInfo;
  bottomBorder: boolean;
  loadUnscheduledRecords: () => void;
}) {
  const { t } = useTranslation();
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
            {t(baseUnitToSingularShortForm[dosage.medicineBaseUnit], {
              count: dosage.amount,
            })}
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

function UnscheduledMeasurment({
  measurment,
  bottomBorder,
  loadUnscheduledRecords,
}: {
  measurment: UnscheduledMeasurmentInfo;
  bottomBorder: boolean;
  loadUnscheduledRecords: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const db = useSQLiteContext();

  const [optionsOpened, setOptionsOpened] = React.useState<boolean>(false);

  const handleOptionsToggle = () => {
    setOptionsOpened(!optionsOpened);
  };

  const handleDelete = async () => {
    await dbDeleteUnscheduledMeasurmentRecord(
      db,
      measurment.measurmentRecordId,
    );
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
        key={measurment.measurmentRecordId}
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
            {measurment.assessmentName}
            {"  –  "}
            {t("assessment")}
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

function ScheduledDosage({
  dosage,
  isDone,
  bottomBorder,
  handleClick,
}: {
  dosage: DosageInfo;
  isDone: boolean;
  bottomBorder: boolean;
  handleClick: (dosage: DosageInfo) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

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
      onPress={() => handleClick(dosage)}
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
          {t(baseUnitToSingularShortForm[dosage.medicineBaseUnit], {
            count: dosage.amount,
          })}
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
}

function ScheduledMeasurment({
  measurment,
  isDone,
  bottomBorder,
  handleClick,
}: {
  measurment: ScheduledMeasurmentInfo;
  isDone: boolean;
  bottomBorder: boolean;
  handleClick: (measurment: ScheduledMeasurmentInfo) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

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
      onPress={() => handleClick(measurment)}
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
          {measurment.assessmentName}
          {"  –  "}
          {t("assessment")}
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
}

export function Home({ date }: { date: Date }) {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const theme = useTheme();

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
  const [unscheduledMeasurements, setUnscheduledMeasurments] = React.useState<
    Map<number | null, UnscheduledMeasurmentInfo[]>
  >(new Map());
  const [scheduledMeasurments, setScheduledMeasurments] = React.useState<
    Map<number | null, ScheduledMeasurmentInfo[]>
  >(new Map());
  const [scheduledMeasurmentsValues, setScheduledMeasurmentValues] =
    React.useState<Map<number, AssessmentValue>>(new Map());

  const [clickedScheduledMeasurment, setClickedScheduledMeasurment] =
    React.useState<ScheduledMeasurmentInfo | null>(null);

  const [isScheduledEmpty, setIsScheduledEmpty] = React.useState<boolean>(true);
  const [isUnscheduledEmpty, setIsUnscheduledEmpty] =
    React.useState<boolean>(true);
  const [areGroupsEmpty, setAreGroupsEmpty] = React.useState<boolean>(true);

  const loadGroups = React.useCallback(async () => {
    const groups = await dbGetGroups(db);
    const idToGroup = new Map();
    groups.forEach((g) => {
      idToGroup.set(g.dbId, g);
    });
    setGroups(idToGroup);
  }, [db]);

  const loadScheduledDosages = React.useCallback(async () => {
    const result = await dbGetSchedulesWithMedicines(db);
    const selectedTime = date.getTime();
    const schedulesToday = result.filter((s) => {
      const timeMatch =
        s.startDate.getTime() <= selectedTime &&
        (!s.endDate || (s.endDate && selectedTime <= s.endDate.getTime()));

      let dayFreqMatch = true;
      if (s.freq.intervalUnit === "week") {
        const dayDiff = dayDifference(date, s.startDate);
        if (dayDiff % (s.freq.intervalLength * 7) !== 0) {
          dayFreqMatch = false;
        }
      }

      return timeMatch && dayFreqMatch;
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
          (dr) => dr.scheduleId === s.dbId && dr.doseIndex === dose.index,
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
    if (!newIsEmpty) setIsScheduledEmpty(newIsEmpty);
    if (!newAreGroupsEmpty) setAreGroupsEmpty(newAreGroupsEmpty);

    const newIsDosageDone = new Map<number, boolean>();
    dosageRecords.forEach((dr) => {
      const key = pair(dr.scheduleId, dr.doseIndex);
      newIsDosageDone.set(key, true);
    });
    setIsDosageDone(newIsDosageDone);
  }, [date, db]);

  const loadScheduledMeasurments = React.useCallback(async () => {
    const result = await dbGetAssessmentSchedulesWithAssessments(db);
    const selectedTime = date.getTime();
    const schedulesToday = result.filter((s) => {
      const timeMatch =
        s.startDate.getTime() <= selectedTime &&
        (!s.endDate || (s.endDate && selectedTime <= s.endDate.getTime()));

      let dayFreqMatch = true;
      if (s.freq.intervalUnit === "week") {
        const dayDiff = dayDifference(date, s.startDate);
        if (dayDiff % (s.freq.intervalLength * 7) !== 0) {
          dayFreqMatch = false;
        }
      }

      return timeMatch && dayFreqMatch;
    });

    let newIsEmpty = true;
    let newAreGroupsEmpty = true;

    const measurmentRecords = await dbGetScheduledMeasurmentRecords(
      db,
      date,
      date,
    );

    let newScheduledMeasurments = new Map<
      number | null,
      ScheduledMeasurmentInfo[]
    >();
    for (const s of schedulesToday) {
      for (const measurment of s.measurments) {
        const groupId = measurment.groupId;
        const groupMeasurments = newScheduledMeasurments.get(groupId) || [];
        const measurmentRecord = measurmentRecords.find(
          (mr) =>
            mr.assessmentScheduleId === s.dbId &&
            mr.measurmentIndex === measurment.index,
        );
        const measurmentRecordId = measurmentRecord
          ? measurmentRecord.dbId
          : null;
        groupMeasurments.push(
          new ScheduledMeasurmentInfo(
            s.assessment.name,
            s.assessment.type,
            measurmentRecord ? measurmentRecord.value : null,
            measurment.index,
            s.dbId,
            measurmentRecordId,
            groupId,
          ),
        );
        newIsEmpty = false;
        if (groupId !== null) {
          newAreGroupsEmpty = false;
        }
        newScheduledMeasurments.set(groupId, groupMeasurments);
      }
    }
    setScheduledMeasurments(newScheduledMeasurments);
    if (!newIsEmpty) setIsScheduledEmpty(newIsEmpty);
    if (!newAreGroupsEmpty) setAreGroupsEmpty(newAreGroupsEmpty);

    const newScheduledMeasurmentsValues = new Map<number, AssessmentValue>();
    measurmentRecords.forEach((mr) => {
      const key = pair(mr.assessmentScheduleId, mr.measurmentIndex);
      newScheduledMeasurmentsValues.set(key, mr.value);
    });
    setScheduledMeasurmentValues(newScheduledMeasurmentsValues);
  }, [date, db]);

  const loadUnscheduledDosageRecords = React.useCallback(async () => {
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

    if (!newIsEmpty) setIsUnscheduledEmpty(newIsEmpty);
    if (!newAreGroupsEmpty) setAreGroupsEmpty(newAreGroupsEmpty);

    setUnscheduledDosages(newUnscheduledDosageInfos);
  }, [date, db]);

  const loadUnscheduledMeasurmentRecords = React.useCallback(async () => {
    const unscheduledMeasurmentRecords =
      await dbGetUnscheduledMeasurmentRecords(db, date, date);

    const assessmentsMap = new Map<number, Assessment>();
    const assessments = await dbGetAssessments(db);
    assessments.forEach((a) => {
      assessmentsMap.set(a.dbId, a);
    });

    let newIsEmpty = true;
    let newAreGroupsEmpty = true;
    const newUnscheduledMeasurmentInfos = new Map();
    unscheduledMeasurmentRecords.map((mr) => {
      const groupDosages = newUnscheduledMeasurmentInfos.get(mr.groupId) || [];
      const a = assessmentsMap.get(mr.assessmentId);
      if (a) {
        groupDosages.push(
          new UnscheduledMeasurmentInfo(a?.name, mr.value, mr.dbId),
        );
        newIsEmpty = false;
        if (mr.groupId !== null) {
          newAreGroupsEmpty = false;
        }
      }
      newUnscheduledMeasurmentInfos.set(mr.groupId, groupDosages);
    });

    if (!newIsEmpty) setIsUnscheduledEmpty(newIsEmpty);
    if (!newAreGroupsEmpty) setAreGroupsEmpty(newAreGroupsEmpty);

    setUnscheduledMeasurments(newUnscheduledMeasurmentInfos);
  }, [date, db]);

  useFocusEffect(
    React.useCallback(() => {
      loadGroups();
      loadScheduledDosages();
      loadUnscheduledDosageRecords();
      loadScheduledMeasurments();
      loadUnscheduledMeasurmentRecords();
    }, [
      loadGroups,
      loadScheduledDosages,
      loadUnscheduledDosageRecords,
      loadScheduledMeasurments,
      loadUnscheduledMeasurmentRecords,
    ]),
  );

  const handleDosageClick = async (dosage: DosageInfo) => {
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

  const handleMeasurmentClick = (measurment: ScheduledMeasurmentInfo) => {
    setClickedScheduledMeasurment(measurment);
  };

  const handleMeasurmentInputCancel = () => {
    setClickedScheduledMeasurment(null);
  };

  const handleMeasurmentInputSave = async (value: AssessmentValue) => {
    if (clickedScheduledMeasurment) {
      if (clickedScheduledMeasurment.measurmentRecordId) {
        await dbDeleteScheduledMeasurmentRecord(
          db,
          clickedScheduledMeasurment.measurmentRecordId,
        );
      }
      const measurmentRecordId = await dbInsertScheduledMeasurmentRecord(db, {
        date,
        assessmentScheduleId: clickedScheduledMeasurment.assessmentScheduleId,
        measurmentIndex: clickedScheduledMeasurment.index,
        value,
      });

      clickedScheduledMeasurment.measurmentRecordId = measurmentRecordId;
      clickedScheduledMeasurment.value = value;

      const newScheduledMeasurmentsValues = new Map(scheduledMeasurmentsValues);
      newScheduledMeasurmentsValues.set(
        pair(
          clickedScheduledMeasurment.assessmentScheduleId,
          clickedScheduledMeasurment.index,
        ),
        value,
      );
      setScheduledMeasurmentValues(newScheduledMeasurmentsValues);
    }

    setClickedScheduledMeasurment(null);
  };

  const getScheduledDosages = (groupId?: number) =>
    scheduledDosages.get(groupId ?? null);
  const getScheduledMeasurments = (groupId?: number) =>
    scheduledMeasurments.get(groupId ?? null);

  const renderScheduledDosages = (group?: Group) => {
    const dosages = getScheduledDosages(group?.dbId);
    const measurments = getScheduledMeasurments(group?.dbId);
    const lastIdx = measurments
      ? measurments.length - 1
      : dosages?.length
        ? dosages.length - 1
        : 0;
    return (
      <>
        {(dosages || measurments) && (
          <Text style={[styles.modeLabel, { color: theme.colors.text }]}>
            Scheduled
          </Text>
        )}
        {dosages &&
          dosages.map((di, idx) => (
            <View key={pair(di.scheduleId, di.index)}>
              <ScheduledDosage
                dosage={di}
                isDone={
                  isDosageDone.get(pair(di.scheduleId, di.index)) ?? false
                }
                bottomBorder={!(!measurments && idx === lastIdx)}
                handleClick={handleDosageClick}
              />
            </View>
          ))}
        {measurments &&
          measurments.map((mi, idx) => (
            <View key={pair(mi.assessmentScheduleId, mi.index)}>
              <ScheduledMeasurment
                measurment={mi}
                isDone={
                  scheduledMeasurmentsValues.get(
                    pair(mi.assessmentScheduleId, mi.index),
                  ) !== undefined
                }
                bottomBorder={!(idx === lastIdx)}
                handleClick={handleMeasurmentClick}
              />
            </View>
          ))}
      </>
    );
  };

  const getUnscheduledDosages = (groupId?: number) =>
    unscheduledDosages.get(groupId ?? null);

  const getUnscheduledMeasurments = (groupId?: number) =>
    unscheduledMeasurements.get(groupId ?? null);

  const renderUnscheduled = (group?: Group) => {
    const dosages = getUnscheduledDosages(group?.dbId);
    const measurments = getUnscheduledMeasurments(group?.dbId);
    const lastIdx = measurments
      ? measurments.length - 1
      : dosages?.length
        ? dosages.length - 1
        : 0;
    return (
      <>
        {(dosages || measurments) && (
          <Text
            style={[styles.modeLabel, { color: theme.colors.textSecondary }]}
          >
            Unscheduled
          </Text>
        )}
        {dosages &&
          dosages.map((di, idx) => (
            <View key={di.dosageRecordId}>
              <UnscheduledDosage
                dosage={di}
                bottomBorder={!(!measurments && idx === lastIdx)}
                loadUnscheduledRecords={loadUnscheduledDosageRecords}
              />
            </View>
          ))}
        {measurments &&
          measurments.map((di, idx) => (
            <View key={di.measurmentRecordId}>
              <UnscheduledMeasurment
                measurment={di}
                bottomBorder={!(idx === lastIdx)}
                loadUnscheduledRecords={loadUnscheduledMeasurmentRecords}
              />
            </View>
          ))}
      </>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
        {t("Nothing planned for selected day.")}
      </Text>
    </View>
  );

  return (
    <DefaultMainContainer>
      {clickedScheduledMeasurment && (
        <AssessmentInputDialog
          title={clickedScheduledMeasurment.assessmentName}
          assessmentType={clickedScheduledMeasurment.assessmentType}
          initialValue={clickedScheduledMeasurment.value}
          onCancel={handleMeasurmentInputCancel}
          onSave={handleMeasurmentInputSave}
        />
      )}

      <ScrollView style={styles.list}>
        {[...groups.values()].map(
          (group) =>
            (getUnscheduledDosages(group.dbId) ||
              getScheduledDosages(group.dbId) ||
              getUnscheduledMeasurments(group.dbId) ||
              getScheduledMeasurments(group.dbId)) && (
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
                {renderUnscheduled(group)}
              </LinearGradient>
            ),
        )}
        {(getUnscheduledDosages() ||
          getScheduledDosages() ||
          getUnscheduledMeasurments() ||
          getScheduledMeasurments()) && (
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
            {renderUnscheduled()}
          </LinearGradient>
        )}
        {isScheduledEmpty && isUnscheduledEmpty && renderEmptyState()}
      </ScrollView>
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
    borderWidth: 0.8,
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
    fontSize: 17,
    fontWeight: "400",
    marginBottom: 8,
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
