import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import React from "react";
import {
  dbDeleteScheduledDosageRecord,
  dbGetScheduledDosageRecords,
  dbGetMedicines,
  dbGetMedicineSchedules,
  dbGetUnscheduledDosageRecords,
  dbInsertScheduledDosageRecord,
  dbGetGroups,
  dbDeleteUnscheduledDosageRecord,
  dbGetUnscheduledMeasurementRecords,
  dbGetAssessments,
  dbDeleteUnscheduledMeasurementRecord,
  dbGetAssessmentSchedules,
  dbGetScheduledMeasurementRecords,
  dbInsertScheduledMeasurementRecord,
  dbDeleteScheduledMeasurementRecord,
} from "../../models/dbAccess";
import { useSQLiteContext } from "expo-sqlite";
import { useTranslation } from "react-i18next";
import {
  BaseUnit,
  Medicine,
  MedicineSchedule,
} from "../../models/MedicineSchedule";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Group, IntervalUnit } from "../../models/Frequency";
import {
  cancelGroupNotification,
  scheduleGroupNotification,
} from "../../services/notificationService";
import { baseUnitToSingularShortForm } from "../enumMappings";
import {
  AssessmentValue,
  sortArrayMeasurementValue,
} from "../../models/Records";
import {
  Assessment,
  ValueType,
  ValueDomain,
  AssessmentSchedule,
} from "../../models/AssessmentSchedule";
import { AssessmentInputDialog } from "../../components/AssessmentInputDialog";
import {
  dayDifference,
  getShiftedDateOnly,
  getWeekday,
  isEqualDateOnly,
  normalizeToDateOnly,
} from "../../dateOnlyUtils";
import { getTodayDateOnly } from "../../dateOnlyUtils";
import * as Notifications from "expo-notifications";
import { FlickerView } from "../../components/FlickerView";

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

class UnscheduledMeasurementInfo {
  constructor(
    public assessmentName: string,
    public value: AssessmentValue,
    public valueDomain: ValueDomain,
    public measurementRecordId: number,
  ) {}
}

class ScheduledMeasurementInfo {
  constructor(
    public assessmentName: string,
    public assessmentType: ValueType,
    public value: AssessmentValue | null,
    public valueDomain: ValueDomain,
    public index: number,
    public assessmentScheduleId: number,
    public measurementRecordId: number | null,
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
  isDisabled,
}: {
  dosage: UnscheduledDosageInfo;
  bottomBorder: boolean;
  loadUnscheduledRecords: () => void;
  isDisabled: boolean;
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
        <Text
          style={[
            styles.optionsButtonText,
            { color: theme.colors.textOnPrimary },
          ]}
        >
          {t("Delete")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleOptionsToggle}
      >
        <Text
          style={[
            styles.optionsButtonText,
            { color: theme.colors.textOnPrimary },
          ]}
        >
          {t("Cancel")}
        </Text>
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
            filter: optionsOpened ? "blur(4px), opacity(50%)" : "",
            borderBottomWidth: bottomBorder ? 2 : 0,
          },
        ]}
        onLongPress={(e) => {
          if (isDisabled) {
            e.stopPropagation();
          } else {
            handleOptionsToggle();
          }
        }}
      >
        <View style={[styles.scheduleContent, { flex: 5 }]}>
          <Text
            style={[
              styles.unscheduledContentText,
              {
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
        </View>
      </TouchableOpacity>
    </View>
  );
}

function UnscheduledMeasurement({
  measurement,
  bottomBorder,
  loadUnscheduledRecords,
  isDisabled,
}: {
  measurement: UnscheduledMeasurementInfo;
  bottomBorder: boolean;
  loadUnscheduledRecords: () => void;
  isDisabled: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const db = useSQLiteContext();

  const [optionsOpened, setOptionsOpened] = React.useState<boolean>(false);

  const handleOptionsToggle = () => {
    setOptionsOpened(!optionsOpened);
  };

  const handleDelete = async () => {
    await dbDeleteUnscheduledMeasurementRecord(
      db,
      measurement.measurementRecordId,
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
        <Text
          style={[
            styles.optionsButtonText,
            { color: theme.colors.textOnPrimary },
          ]}
        >
          {t("Delete")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.optionsButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={handleOptionsToggle}
      >
        <Text
          style={[
            styles.optionsButtonText,
            { color: theme.colors.textOnPrimary },
          ]}
        >
          {t("Cancel")}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View>
      {optionsOpened && renderOptions()}
      <TouchableOpacity
        key={measurement.measurementRecordId}
        style={[
          styles.scheduleItem,
          {
            borderColor: theme.colors.border,
            filter: optionsOpened ? "blur(4px), opacity(50%)" : "",
            borderBottomWidth: bottomBorder ? 2 : 0,
          },
        ]}
        onLongPress={(e) => {
          if (isDisabled) {
            e.stopPropagation();
          } else {
            handleOptionsToggle();
          }
        }}
      >
        <View style={[styles.scheduleContent, { flex: 5 }]}>
          <Text
            style={[
              styles.unscheduledContentText,
              {
                color: theme.colors.text,
              },
            ]}
            numberOfLines={1}
          >
            {measurement.assessmentName}
            {"  –  "}
            {t("assessment")}
          </Text>
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
  isDisabled,
}: {
  dosage: DosageInfo;
  isDone: boolean;
  bottomBorder: boolean;
  handleClick: (dosage: DosageInfo) => void;
  isDisabled: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.scheduleItem,
        {
          borderColor: theme.colors.border,
          borderBottomWidth: bottomBorder ? 2 : 0,
        },
      ]}
      onPress={(e) => {
        if (isDisabled) {
          e.stopPropagation();
        } else {
          handleClick(dosage);
        }
      }}
    >
      <View style={[styles.scheduleContent, { flex: 5 }]}>
        <Text
          style={[
            styles.contentText,
            {
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

function ScheduledMeasurement({
  measurement,
  isDone,
  bottomBorder,
  handleClick,
  isDisabled,
}: {
  measurement: ScheduledMeasurementInfo;
  isDone: boolean;
  bottomBorder: boolean;
  handleClick: (measurement: ScheduledMeasurementInfo) => void;
  isDisabled: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.scheduleItem,
        {
          borderColor: theme.colors.border,
          borderBottomWidth: bottomBorder ? 2 : 0,
        },
      ]}
      onPress={(e) => {
        if (isDisabled) {
          e.stopPropagation();
        } else {
          handleClick(measurement);
        }
      }}
    >
      <View style={[styles.scheduleContent, { flex: 5 }]}>
        <Text
          style={[
            styles.contentText,
            {
              color: theme.colors.text,
            },
          ]}
          numberOfLines={1}
        >
          {measurement.assessmentName}
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

  const isFuture = React.useMemo(() => {
    return date > getTodayDateOnly();
  }, [date]);

  const [groups, setGroups] = React.useState<Map<number | null, Group>>(
    new Map(),
  );
  const [scheduledDosages, setScheduledDosages] = React.useState<
    Map<number | null, DosageInfo[]>
  >(new Map());
  const [unscheduledDosages, setUnscheduledDosages] = React.useState<
    Map<number | null, UnscheduledDosageInfo[]>
  >(new Map());
  const [unscheduledMeasurements, setUnscheduledMeasurements] = React.useState<
    Map<number | null, UnscheduledMeasurementInfo[]>
  >(new Map());
  const [scheduledMeasurements, setScheduledMeasurements] = React.useState<
    Map<number | null, ScheduledMeasurementInfo[]>
  >(new Map());

  const [clickedScheduledMeasurement, setClickedScheduledMeasurement] =
    React.useState<ScheduledMeasurementInfo | null>(null);

  const [isScheduledEmpty, setIsScheduledEmpty] = React.useState<boolean>(true);
  const [isUnscheduledEmpty, setIsUnscheduledEmpty] =
    React.useState<boolean>(true);
  const [areGroupsEmpty, setAreGroupsEmpty] = React.useState<boolean>(true);

  const scrollViewRef = React.useRef<ScrollView>(null);
  const groupIdToPositionRef = React.useRef<Map<number, number>>(new Map());
  const [flickerGroupId, setFlickerGroupId] = React.useState<number | null>(
    null,
  );

  const loadGroups = React.useCallback(async () => {
    const groups = await dbGetGroups(db);
    const idToGroup = new Map();
    groups.forEach((g) => {
      idToGroup.set(g.dbId, g);
    });
    setGroups(idToGroup);
  }, [db]);

  const dailyScheduleFilter = React.useCallback(
    (s: AssessmentSchedule | MedicineSchedule): boolean => {
      if (s.freq.intervalUnit === IntervalUnit.day) {
        const dayDiff = dayDifference(date, s.startDate);
        if (dayDiff % s.freq.intervalLength !== 0) {
          return true;
        }
      }
      return false;
    },
    [date],
  );

  const weeklyScheduleFilter = React.useCallback(
    (s: AssessmentSchedule | MedicineSchedule, offset: number) => {
      if (s.freq.intervalUnit === IntervalUnit.week) {
        const startDayWeekday = getWeekday(s.startDate);
        const startDayWeekStart = getShiftedDateOnly(
          s.startDate,
          -startDayWeekday,
        );
        const dayDiff = dayDifference(date, startDayWeekStart);
        if ((dayDiff - offset) % (7 * s.freq.intervalLength) !== 0) {
          return true;
        }
      }
      return false;
    },
    [date],
  );

  const loadScheduledDosages = React.useCallback(async () => {
    const result = await dbGetMedicineSchedules(db);
    const schedulesOverlapping = result.filter((s) => {
      const timeMatch =
        s.startDate <= date && (!s.endDate || (s.endDate && date <= s.endDate));
      return timeMatch;
    });

    let newIsEmpty = true;
    let newAreGroupsEmpty = true;

    const dosageRecords = await dbGetScheduledDosageRecords(db, date, date);

    let newScheduledDosages = new Map<number | null, DosageInfo[]>();
    for (const s of schedulesOverlapping) {
      if (dailyScheduleFilter(s)) {
        continue;
      }

      for (const dosage of s.dosages) {
        if (weeklyScheduleFilter(s, dosage.offset)) {
          continue;
        }
        const groupId = dosage.groupId;
        const groupDosages = newScheduledDosages.get(groupId) || [];
        const dosageRecord = dosageRecords.find(
          (dr) =>
            dr.medicineScheduleId === s.dbId && dr.dosageIndex === dosage.index,
        );
        const dosageRecordId = dosageRecord ? dosageRecord.dbId : null;
        groupDosages.push(
          new DosageInfo(
            s.medicine.name,
            s.medicine.baseUnit,
            dosage.amount,
            dosage.index,
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
  }, [date, db, dailyScheduleFilter, weeklyScheduleFilter]);

  const loadScheduledMeasurements = React.useCallback(async () => {
    const result = await dbGetAssessmentSchedules(db);
    const schedulesOverlapping = result.filter((s) => {
      const timeMatch =
        s.startDate <= date && (!s.endDate || (s.endDate && date <= s.endDate));
      return timeMatch;
    });

    let newIsEmpty = true;
    let newAreGroupsEmpty = true;

    const measurementRecords = await dbGetScheduledMeasurementRecords(
      db,
      date,
      date,
    );

    let newScheduledMeasurements = new Map<
      number | null,
      ScheduledMeasurementInfo[]
    >();
    for (const s of schedulesOverlapping) {
      if (dailyScheduleFilter(s)) {
        continue;
      }
      for (const measurement of s.measurements) {
        if (weeklyScheduleFilter(s, measurement.offset)) {
          continue;
        }

        const groupId = measurement.groupId;
        const groupMeasurements = newScheduledMeasurements.get(groupId) || [];
        const measurementRecord = measurementRecords.find(
          (mr) =>
            mr.assessmentScheduleId === s.dbId &&
            mr.measurementIndex === measurement.index,
        );
        const measurementRecordId = measurementRecord
          ? measurementRecord.dbId
          : null;
        groupMeasurements.push(
          new ScheduledMeasurementInfo(
            s.assessment.name,
            s.assessment.type,
            measurementRecord ? measurementRecord.value : null,
            s.assessment.valueDomain,
            measurement.index,
            s.dbId,
            measurementRecordId,
            groupId,
          ),
        );
        newIsEmpty = false;
        if (groupId !== null) {
          newAreGroupsEmpty = false;
        }
        newScheduledMeasurements.set(groupId, groupMeasurements);
      }
    }
    setScheduledMeasurements(newScheduledMeasurements);
    if (!newIsEmpty) setIsScheduledEmpty(newIsEmpty);
    if (!newAreGroupsEmpty) setAreGroupsEmpty(newAreGroupsEmpty);
  }, [date, db, dailyScheduleFilter, weeklyScheduleFilter]);

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

  const loadUnscheduledMeasurementRecords = React.useCallback(async () => {
    const unscheduledMeasurementRecords =
      await dbGetUnscheduledMeasurementRecords(db, date, date);

    const assessmentsMap = new Map<number, Assessment>();
    const assessments = await dbGetAssessments(db);
    assessments.forEach((a) => {
      assessmentsMap.set(a.dbId, a);
    });

    let newIsEmpty = true;
    let newAreGroupsEmpty = true;
    const newUnscheduledMeasurementInfos = new Map();
    unscheduledMeasurementRecords.map((mr) => {
      const groupDosages = newUnscheduledMeasurementInfos.get(mr.groupId) || [];
      const a = assessmentsMap.get(mr.assessmentId);
      if (a) {
        groupDosages.push(
          new UnscheduledMeasurementInfo(
            a?.name,
            mr.value,
            a.valueDomain,
            mr.dbId,
          ),
        );
        newIsEmpty = false;
        if (mr.groupId !== null) {
          newAreGroupsEmpty = false;
        }
      }
      newUnscheduledMeasurementInfos.set(mr.groupId, groupDosages);
    });

    if (!newIsEmpty) setIsUnscheduledEmpty(newIsEmpty);
    if (!newAreGroupsEmpty) setAreGroupsEmpty(newAreGroupsEmpty);

    setUnscheduledMeasurements(newUnscheduledMeasurementInfos);
  }, [date, db]);

  useFocusEffect(
    React.useCallback(() => {
      loadGroups();
      loadScheduledDosages();
      loadUnscheduledDosageRecords();
      loadScheduledMeasurements();
      loadUnscheduledMeasurementRecords();
    }, [
      loadGroups,
      loadScheduledDosages,
      loadUnscheduledDosageRecords,
      loadScheduledMeasurements,
      loadUnscheduledMeasurementRecords,
    ]),
  );

  const response = Notifications.useLastNotificationResponse();

  React.useEffect(() => {
    if (
      response &&
      response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const notificationDate = normalizeToDateOnly(
        new Date(response.notification.date),
      );
      if (isEqualDateOnly(notificationDate, date)) {
        return;
      }
      const data = response.notification.request.content.data;
      if (data && "groupId" in data && typeof data.groupId === "number") {
        const groupId = data.groupId;
        const timer = setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current?.scrollTo({
              y: groupIdToPositionRef.current.get(groupId),
              animated: true,
            });
            setFlickerGroupId(groupId);
          }
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [response, date]);

  const handleDosageClick = async (dosage: DosageInfo) => {
    if (dosage.dosageRecordId) {
      await dbDeleteScheduledDosageRecord(db, dosage.dosageRecordId);
    } else {
      await dbInsertScheduledDosageRecord(db, {
        medicineScheduleId: dosage.scheduleId,
        date,
        dosageIndex: dosage.index,
      });
    }
    await loadScheduledDosages();

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

  const handleMeasurementClick = (measurement: ScheduledMeasurementInfo) => {
    setClickedScheduledMeasurement(measurement);
  };

  const handleMeasurementInputCancel = () => {
    setClickedScheduledMeasurement(null);
  };

  const handleMeasurementInputSave = async (value: AssessmentValue) => {
    if (clickedScheduledMeasurement) {
      if (clickedScheduledMeasurement.measurementRecordId) {
        await dbDeleteScheduledMeasurementRecord(
          db,
          clickedScheduledMeasurement.measurementRecordId,
        );
      }
      sortArrayMeasurementValue(value, clickedScheduledMeasurement.valueDomain);
      await dbInsertScheduledMeasurementRecord(db, {
        date,
        assessmentScheduleId: clickedScheduledMeasurement.assessmentScheduleId,
        measurementIndex: clickedScheduledMeasurement.index,
        value,
      });
    }

    setClickedScheduledMeasurement(null);
    await loadScheduledMeasurements();
  };

  const handleMeasurementInputClear = async () => {
    if (clickedScheduledMeasurement) {
      if (clickedScheduledMeasurement.measurementRecordId) {
        await dbDeleteScheduledMeasurementRecord(
          db,
          clickedScheduledMeasurement.measurementRecordId,
        );
      }
    }

    setClickedScheduledMeasurement(null);
    await loadScheduledMeasurements();
  };

  const getScheduledDosages = (groupId?: number) =>
    scheduledDosages.get(groupId ?? null);
  const getScheduledMeasurements = (groupId?: number) =>
    scheduledMeasurements.get(groupId ?? null);

  const renderScheduled = (group?: Group) => {
    const dosages = getScheduledDosages(group?.dbId);
    const measurements = getScheduledMeasurements(group?.dbId);
    const lastIdx = measurements
      ? measurements.length - 1
      : dosages?.length
        ? dosages.length - 1
        : 0;
    return (
      <>
        {(dosages || measurements) && (
          <Text
            style={[styles.modeLabel, { color: theme.colors.textSecondary }]}
          >
            Scheduled
          </Text>
        )}
        {dosages &&
          dosages.map((di, idx) => (
            <View key={pair(di.scheduleId, di.index)}>
              <ScheduledDosage
                dosage={di}
                isDone={di.dosageRecordId !== null}
                bottomBorder={!(!measurements && idx === lastIdx)}
                handleClick={handleDosageClick}
                isDisabled={isFuture}
              />
            </View>
          ))}
        {measurements &&
          measurements.map((mi, idx) => (
            <View key={pair(mi.assessmentScheduleId, mi.index)}>
              <ScheduledMeasurement
                measurement={mi}
                isDone={mi.value !== null}
                bottomBorder={!(idx === lastIdx)}
                handleClick={handleMeasurementClick}
                isDisabled={isFuture}
              />
            </View>
          ))}
      </>
    );
  };

  const getUnscheduledDosages = (groupId?: number) =>
    unscheduledDosages.get(groupId ?? null);

  const getUnscheduledMeasurements = (groupId?: number) =>
    unscheduledMeasurements.get(groupId ?? null);

  const renderUnscheduled = (group?: Group) => {
    const dosages = getUnscheduledDosages(group?.dbId);
    const measurements = getUnscheduledMeasurements(group?.dbId);
    const lastIdx = measurements
      ? measurements.length - 1
      : dosages?.length
        ? dosages.length - 1
        : 0;
    return (
      <>
        {(dosages || measurements) && (
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
                bottomBorder={!(!measurements && idx === lastIdx)}
                loadUnscheduledRecords={loadUnscheduledDosageRecords}
                isDisabled={isFuture}
              />
            </View>
          ))}
        {measurements &&
          measurements.map((di, idx) => (
            <View key={di.measurementRecordId}>
              <UnscheduledMeasurement
                measurement={di}
                bottomBorder={!(idx === lastIdx)}
                loadUnscheduledRecords={loadUnscheduledMeasurementRecords}
                isDisabled={isFuture}
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
    <>
      {clickedScheduledMeasurement && (
        <AssessmentInputDialog
          title={clickedScheduledMeasurement.assessmentName}
          assessmentType={clickedScheduledMeasurement.assessmentType}
          valueDomain={clickedScheduledMeasurement.valueDomain}
          initialValue={clickedScheduledMeasurement.value}
          onCancel={handleMeasurementInputCancel}
          onSave={handleMeasurementInputSave}
          onClear={handleMeasurementInputClear}
        />
      )}

      <ScrollView style={styles.list} ref={scrollViewRef}>
        {[...groups.values()].map(
          (group) =>
            (getUnscheduledDosages(group.dbId) ||
              getScheduledDosages(group.dbId) ||
              getUnscheduledMeasurements(group.dbId) ||
              getScheduledMeasurements(group.dbId)) && (
              <FlickerView
                flicker={group.dbId === flickerGroupId}
                key={group.dbId}
                style={[
                  styles.groupContainer,
                  isFuture ? styles.disabledElement : {},
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
                onLayout={(e) =>
                  groupIdToPositionRef.current.set(
                    group.dbId,
                    e.nativeEvent.layout.y,
                  )
                }
              >
                <Text
                  style={[styles.headerLabel, { color: theme.colors.text }]}
                >
                  {group.name}
                </Text>
                {renderScheduled(group)}
                {renderUnscheduled(group)}
              </FlickerView>
            ),
        )}
        {(getUnscheduledDosages() ||
          getScheduledDosages() ||
          getUnscheduledMeasurements() ||
          getScheduledMeasurements()) && (
          <FlickerView
            key={-1}
            style={[
              styles.groupContainer,
              isFuture ? styles.disabledElement : {},
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            {areGroupsEmpty || (
              <Text style={[styles.headerLabel, { color: theme.colors.text }]}>
                Ungrouped
              </Text>
            )}
            {renderScheduled()}
            {renderUnscheduled()}
          </FlickerView>
        )}
        {isScheduledEmpty && isUnscheduledEmpty && renderEmptyState()}
        <View style={styles.bottomMarginContainer}></View>
      </ScrollView>
    </>
  );
}

const COMMON_CONTENT_TEXT: StyleProp<TextStyle> = {
  fontSize: 16,
  fontWeight: 400,
};

const styles = StyleSheet.create({
  list: {
    padding: 18,
  },
  disabledElement: {
    filter: "opacity(50%)",
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
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: 18,
    borderWidth: 0.8,
  },
  bottomMarginContainer: {
    height: 92,
    width: "100%",
  },
  contentText: {
    ...COMMON_CONTENT_TEXT,
    marginBottom: 4,
    maxWidth: "85%",
  },
  unscheduledContentText: {
    ...COMMON_CONTENT_TEXT,
    marginBottom: 4,
    maxWidth: "100%",
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
    ...StyleSheet.absoluteFill,
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
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
});
