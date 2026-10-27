import { SQLiteDatabase } from "expo-sqlite";
import {
  dbGetAssessments,
  dbGetAssessmentSchedules,
  dbGetGauges,
  dbGetGroups,
  dbGetMedicines,
  dbGetMedicineSchedules,
  dbGetScheduledDosageRecords,
  dbGetScheduledMeasurementRecords,
  dbGetUnscheduledDosageRecords,
  dbGetUnscheduledMeasurementRecords,
  dbUpsertGaugeRecord,
} from "./dbAccess";
import {
  baseUnitShorFormPlural,
  ingredientAmountUnitEnumToDisplayForm,
} from "../navigation/enumMappings";
import {
  EmptyTreatment,
  Metric,
  OperationAny,
  OperationBoolean,
  OperationNumber,
  SourceType,
} from "./Gauge";
import {
  Assessment,
  AssessmentSchedule,
  ValueType,
} from "./AssessmentSchedule";
import {
  deserializeDateOnly,
  getShiftedDateOnly,
  getTodayDateOnly,
  serializeDateOnly,
} from "../dateOnlyUtils";
import { Group } from "./Frequency";
import {
  AssessmentValue,
  ScheduledDosageRecord,
  ScheduledMeasurementRecord,
  UnscheduledDosageRecord,
  UnscheduledMeasurementRecord,
} from "./Records";
import {
  IngredientAmountUnit,
  isWeightUnit,
  maxWeightUnit,
  Medicine,
  MedicineSchedule,
  weightUnitToGramsMultiplier,
} from "./MedicineSchedule";
import { ColumnType } from "./Settings";
import { getOrThrow } from "../navigation/utils";

export async function dbColumnsGetAll(db: SQLiteDatabase): Promise<Metric[]> {
  const medicines = await dbGetMedicines(db);
  const columns = new Map();
  medicines.forEach((m) => {
    const baseUnitLabel = baseUnitShorFormPlural(m.baseUnit);
    columns.set(
      m.getLabel(),
      new Metric(m.getLabel(), SourceType.Medicine, [m.dbId]),
    );
    m.activeIngredients.forEach((ai) => {
      const label = ai.getLabelWithoutUnit(baseUnitLabel);
      const column = columns.get(label);
      if (column) {
        column.sourceIds.push(label);
      } else {
        columns.set(
          label,
          new Metric(label, SourceType.ActiveIngredientWithForm, [m.dbId]),
        );
      }

      const labelShort = ai.getShortLabelWithoutUnit();
      const columnShort = columns.get(labelShort);
      if (columnShort) {
        columnShort.sourceIds.push(m.dbId);
      } else {
        columns.set(
          label,
          new Metric(label, SourceType.ActiveIngredientWithoutForm, [m.dbId]),
        );
      }
    });
  });

  const assessments = dbGetAssessments(db);
  (await assessments).forEach((a) => {
    const label = a.getLabel();
    if (a.type === ValueType.Numeric) {
      columns.set(
        label,
        new Metric(label, SourceType.AssessmentNumeric, [a.dbId]),
      );
    } else if (a.type === ValueType.Boolean) {
      columns.set(
        label,
        new Metric(label, SourceType.AssessmentBoolean, [a.dbId]),
      );
    }
  });

  return Array.from(columns.values());
}

class TableData {
  constructor(
    public fullLabels: string[],
    public fullLabelToDisplayLabel: Map<string, string>,
    public fullHeadersToSettingsHeader: Map<string, string>,
    public fullHeaderToValueType: Map<string, ValueType>,
    public dayToFullHeaderToValue: Map<string, Map<string, AssessmentValue>>,
    public newColumnConfigs: Map<string, NewColumnConfig>,
  ) {}
}

export async function getAllAssessmentRecords(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<Map<string, Map<string, AssessmentValue>>> {
  const scheuledMeasurementRecrods = await dbGetScheduledMeasurementRecords(
    db,
    startDate,
    endDate,
  );
  const unscheduledMeasurementRecords =
    await dbGetUnscheduledMeasurementRecords(db, startDate, endDate);

  const assessmentSchedules = await dbGetAssessmentSchedules(db);
  const idToAssessmentSchedule = new Map<number, AssessmentSchedule>();
  assessmentSchedules.forEach((a) => {
    idToAssessmentSchedule.set(a.dbId, a);
  });

  const groups = await dbGetGroups(db);
  const idToGroup = new Map<number, Group>();
  groups.forEach((g) => {
    idToGroup.set(g.dbId, g);
  });

  const assessments = await dbGetAssessments(db);
  const idToAssessment = new Map<number, Assessment>();
  assessments.forEach((a) => {
    idToAssessment.set(a.dbId, a);
  });

  const dayToLabelToValues = new Map<string, Map<string, AssessmentValue>>();

  const digestMeasurementRecord = (
    record: ScheduledMeasurementRecord | UnscheduledMeasurementRecord,
    assessment: Assessment,
    groupId: number | null,
  ) => {
    const group = groupId ? (idToGroup.get(groupId) ?? null) : null;
    const label = assessment.getLabel(group?.name);
    const dateStr = serializeDateOnly(record.date);
    const dailyRow =
      dayToLabelToValues.get(dateStr) || new Map<string, AssessmentValue>();
    dailyRow.set(label, record.value);
    dayToLabelToValues.set(dateStr, dailyRow);
  };

  for (const record of unscheduledMeasurementRecords) {
    const assessment = idToAssessment.get(record.assessmentId);
    if (!assessment) {
      throw Error("Record not connected to assessment.");
    }
    digestMeasurementRecord(record, assessment, record.groupId);
  }

  for (const record of scheuledMeasurementRecrods) {
    const assessmentSchedule = idToAssessmentSchedule.get(
      record.assessmentScheduleId,
    );
    if (!assessmentSchedule) {
      throw Error("Record not connected to assessment schedule.");
    }
    const assessment = assessmentSchedule.assessment;
    const measurement =
      assessmentSchedule.measurements[record.measurementIndex];

    digestMeasurementRecord(record, assessment, measurement.groupId);
  }

  return dayToLabelToValues;
}

function insertActiveIngredientWeightUnits(
  dayToHeaderToValues: Map<string, Map<string, number>>,
  fullHeaderToShortHeader: Map<string, string>,
  shortHeaderCounts: Map<string, number>,
  fullHeaderToWeightUnits: Map<string, Set<IngredientAmountUnit>>,
  fullHeaderToSettingsHeader: Map<string, string>,
) {
  for (const [fullHeader, weightUnits] of fullHeaderToWeightUnits) {
    const weightUnit = maxWeightUnit([...weightUnits]);
    const weightUnitMultiplier = weightUnitToGramsMultiplier(weightUnit);
    const weightUnitDisplay = ingredientAmountUnitEnumToDisplayForm(weightUnit);

    const newFullHeader = `${fullHeader} [${weightUnitDisplay}]`;
    const shortHeader = getOrThrow(fullHeaderToShortHeader, fullHeader);
    const newShortHeader = `${shortHeader} [${weightUnitDisplay}]`;

    fullHeaderToShortHeader.set(newFullHeader, newShortHeader);
    fullHeaderToShortHeader.delete(fullHeader);

    fullHeaderToSettingsHeader.set(newFullHeader, fullHeader);

    if (shortHeaderCounts.has(shortHeader)) {
      shortHeaderCounts.set(
        newShortHeader,
        getOrThrow(shortHeaderCounts, shortHeader),
      );
      shortHeaderCounts.delete(shortHeader);
    }

    for (const headerToValues of dayToHeaderToValues.values()) {
      const value = headerToValues.get(fullHeader);
      if (!value) {
        continue;
      }
      headerToValues.set(fullHeader, value / weightUnitMultiplier);
      // headerToValues.delete(fullHeader);
    }
  }
}

function updateHeaderCounter(
  fullHeaderToShortHeader: Map<string, string>,
  shortHeaderCounts: Map<string, number>,
  fullHeader: string,
  shortHeader: string,
) {
  if (!fullHeaderToShortHeader.has(fullHeader)) {
    fullHeaderToShortHeader.set(fullHeader, shortHeader);
    shortHeaderCounts.set(
      shortHeader,
      (shortHeaderCounts.get(shortHeader) || 0) + 1,
    );
  }
}

function calculateHeaders(
  fullHeaderToShortHeader: Map<string, string>,
  shortHeaderCounts: Map<string, number>,
): Map<string, string> {
  const headers = new Map();
  for (const [fullHeader, shortHeader] of fullHeaderToShortHeader) {
    if (shortHeaderCounts.get(shortHeader) === 1) {
      headers.set(fullHeader, shortHeader);
    } else {
      headers.set(fullHeader, fullHeader);
    }
  }
  return headers;
}

export async function getAllMedicineRecords(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<TableData> {
  const scheduledDosageRecords = await dbGetScheduledDosageRecords(
    db,
    startDate,
    endDate,
  );
  const unscheduledDosageRecords = await dbGetUnscheduledDosageRecords(
    db,
    startDate,
    endDate,
  );

  const schedules = await dbGetMedicineSchedules(db);
  const idToSchedule = new Map<number, MedicineSchedule>();
  schedules.forEach((s) => {
    idToSchedule.set(s.dbId, s);
  });

  const medicines = await dbGetMedicines(db);
  const idToMedicine = new Map<number, Medicine>();
  medicines.forEach((m) => {
    idToMedicine.set(m.dbId, m);
  });

  const dayToLabelToValues = new Map<string, Map<string, number>>();

  /* to handle shortening of header labels*/
  const fullHeaderToShortHeader = new Map<string, string>();
  const shortHeaderCounts = new Map<string, number>();

  const fullActiveIngredientHeaderToWeightUnits = new Map<
    string,
    Set<IngredientAmountUnit>
  >();
  const newColumnConfigs = new Map();

  const digestDosageRecord = (
    record: ScheduledDosageRecord | UnscheduledDosageRecord,
    medicineAmount: number,
    medicine: Medicine,
  ) => {
    const dateStr = serializeDateOnly(record.date);
    const dailyRow =
      dayToLabelToValues.get(dateStr) || new Map<string, number>();

    const baseUnitLabel = baseUnitShorFormPlural(medicine.baseUnit);

    for (const ai of medicine.activeIngredients) {
      let fullHeader = ai.getLabel(baseUnitLabel);
      let shortHeader = ai.getShortLabel();

      let weightUnitMultiplier = 1;
      if (isWeightUnit(ai.unit)) {
        fullHeader = ai.getLabelWithoutUnit(baseUnitLabel);
        shortHeader = ai.getShortLabelWithoutUnit();
        weightUnitMultiplier = weightUnitToGramsMultiplier(ai.unit);
        fullActiveIngredientHeaderToWeightUnits.set(
          fullHeader,
          (
            fullActiveIngredientHeaderToWeightUnits.get(fullHeader) || new Set()
          ).add(ai.unit),
        );
      }

      const ccFullHeader = newColumnConfigs.get(fullHeader);
      if (
        !ccFullHeader ||
        ccFullHeader._source_created_at > medicine.createdAt
      ) {
        newColumnConfigs.set(
          fullHeader,
          new NewColumnConfig(ColumnType.ActiveIngredient, medicine.createdAt),
        );
      }
      const ccShortHeader = newColumnConfigs.get(shortHeader);
      if (
        !ccShortHeader ||
        ccShortHeader._source_created_at > medicine.createdAt
      ) {
        newColumnConfigs.set(
          shortHeader,
          new NewColumnConfig(ColumnType.ActiveIngredient, medicine.createdAt),
        );
      }
      updateHeaderCounter(
        fullHeaderToShortHeader,
        shortHeaderCounts,
        fullHeader,
        shortHeader,
      );
      let amountTotal = dailyRow.get(fullHeader) || 0;
      amountTotal += ai.amount * medicineAmount * weightUnitMultiplier;
      dailyRow.set(fullHeader, amountTotal);
    }

    const header = medicine.getLabel();

    newColumnConfigs.set(
      header,
      new NewColumnConfig(ColumnType.Medicine, medicine.createdAt),
    );

    updateHeaderCounter(
      fullHeaderToShortHeader,
      shortHeaderCounts,
      header,
      header,
    );

    let amountTotal = dailyRow.get(header) || 0;
    amountTotal += medicineAmount;
    dailyRow.set(header, amountTotal);

    dayToLabelToValues.set(dateStr, dailyRow);
  };

  for (const record of unscheduledDosageRecords) {
    const medicine = idToMedicine.get(record.medicineId);
    if (!medicine) {
      throw Error("Record not connected to medicine.");
    }
    digestDosageRecord(record, record.amount, medicine);
  }

  for (const record of scheduledDosageRecords) {
    const schedule = idToSchedule.get(record.medicineScheduleId);
    if (!schedule) {
      throw Error("Record not connected to medicine schedule.");
    }
    digestDosageRecord(
      record,
      schedule.dosages[record.dosageIndex].amount,
      schedule.medicine,
    );
  }

  const fullHeadersToSettingsHeader = new Map();

  insertActiveIngredientWeightUnits(
    dayToLabelToValues,
    fullHeaderToShortHeader,
    shortHeaderCounts,
    fullActiveIngredientHeaderToWeightUnits,
    fullHeadersToSettingsHeader,
  );

  const fullLabelToDisplayLabel = calculateHeaders(
    fullHeaderToShortHeader,
    shortHeaderCounts,
  );

  const fullLabels = Array.from(fullHeaderToShortHeader.keys()).sort();

  const fullHeaderToValueType = new Map();
  fullLabels.forEach((header) =>
    fullHeaderToValueType.set(header, ValueType.Numeric),
  );

  return new TableData(
    fullLabels,
    fullLabelToDisplayLabel,
    fullHeadersToSettingsHeader,
    fullHeaderToValueType,
    dayToLabelToValues,
    newColumnConfigs,
  );
}

export function updateGaugeRecordsFromRecord() {
  // finds gauges coressponding to a given record
  // updates all gauge records coressponding to it
}

function applyNumberOperation(
  values: number[],
  operation: OperationNumber,
  emptyTreatment: EmptyTreatment,
): number | null {
  if (values.length === 0) {
    return emptyTreatment === EmptyTreatment.Omit ? null : 0;
  }
  switch (operation) {
    case OperationNumber.Average:
      return values.reduce((sum, n) => sum + n, 0) / values.length;

    case OperationNumber.Total:
      return values.reduce((sum, n) => sum + n, 0);

    case OperationNumber.Minimum:
      return Math.min(...values);

    case OperationNumber.Maximum:
      return Math.max(...values);

    case OperationNumber.PercentNotZero:
      return (values.filter((n) => n !== 0).length / values.length) * 100;
  }
}

function applyBooleanOperation(
  values: boolean[],
  operation: OperationBoolean,
  emptyTreatment: EmptyTreatment,
): number | null {
  if (values.length === 0) {
    return emptyTreatment === EmptyTreatment.Omit ? null : 0;
  }
  switch (operation) {
    case OperationBoolean.PercentTrue:
      return (values.filter((v) => v === true).length / values.length) * 100;

    case OperationBoolean.PercentFalse:
      return (values.filter((v) => v === false).length / values.length) * 100;
  }
}

export function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "number")
  );
}

export function isBooleanArray(value: unknown): value is boolean[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "boolean")
  );
}

export async function computeAllGaugesRecords(db: SQLiteDatabase) {
  const gauges = await dbGetGauges(db);
  const assessmentData = await getAllAssessmentRecords(db);
  const medicineData = await getAllMedicineRecords(db);

  const labelToDayToValues: Map<
    string,
    Map<string, AssessmentValue>
  > = new Map();

  // transpose the table
  assessmentData.forEach((dayRow, day) => {
    dayRow.forEach((value, label) => {
      if (value !== null) {
        const dayToValue = labelToDayToValues.get(label) ?? new Map();
        dayToValue.set(day, value);
        labelToDayToValues.set(label, dayToValue);
      }
    });
  });
  medicineData.dayToFullHeaderToValue.forEach((dayRow, day) => {
    dayRow.forEach((value, label) => {
      if (value !== null) {
        const dayToValue = labelToDayToValues.get(label) ?? new Map();
        dayToValue.set(day, value);
        labelToDayToValues.set(label, dayToValue);
      }
    });
  });

  for (const gauge of gauges) {
    const dayToValue = labelToDayToValues.get(gauge.sourceColumn.label);
    if (dayToValue === undefined || dayToValue.size === 0) {
      continue;
    }
    const daysPatchy = Array.from(dayToValue.keys());
    //todo search for other places where dates are wronglt sorted
    daysPatchy.sort();
    const days = [];
    const startDay = deserializeDateOnly(daysPatchy[0]);
    const endDate = getTodayDateOnly();

    for (
      let date = startDay;
      date <= endDate;
      date = getShiftedDateOnly(date, 1)
    ) {
      days.push(date);
    }

    for (const [idx, day] of days.entries()) {
      const valuesToAggregate = [];
      const windowStartIdx = Math.max(idx + 1 - gauge.lengthInDays, 0);
      for (const windowDay of days.slice(windowStartIdx, idx + 1)) {
        const windowDayStr = serializeDateOnly(windowDay);
        const value = dayToValue.get(windowDayStr);
        if (value !== undefined) {
          valuesToAggregate.push(value);
        } else {
          if (gauge.emptyTreatment === EmptyTreatment.ZeroFill) {
            valuesToAggregate.push(
              gauge.sourceColumn.sourceType === SourceType.AssessmentBoolean
                ? false
                : 0,
            );
          }
        }
      }
      let valueAggregated = null;
      if (gauge.sourceColumn.sourceType === SourceType.AssessmentBoolean) {
        if (
          isBooleanArray(valuesToAggregate) &&
          (Object.values(OperationBoolean) as OperationAny[]).includes(
            gauge.operation,
          )
        ) {
          valueAggregated = applyBooleanOperation(
            valuesToAggregate,
            gauge.operation as OperationBoolean,
            gauge.emptyTreatment,
          );
        } else {
          throw Error("Expected boolean values and operation.");
        }
      } else {
        if (
          isNumberArray(valuesToAggregate) &&
          (Object.values(OperationNumber) as OperationAny[]).includes(
            gauge.operation,
          )
        ) {
          valueAggregated = applyNumberOperation(
            valuesToAggregate,
            gauge.operation as OperationNumber,
            gauge.emptyTreatment,
          );
        } else {
          throw Error("Expected number values and operation.");
        }
      }

      // TODO: gather all
      await dbUpsertGaugeRecord(db, {
        date: day,
        gaugeId: gauge.dbId,
        value: valueAggregated,
      });
    }
  }
}
export class NewColumnConfig {
  constructor(
    public type: ColumnType,
    public source_created_at: Date,
  ) {}
}
