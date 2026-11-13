import { SQLiteDatabase } from "expo-sqlite";
import {
  deserializeDateOnly,
  getTodayDateOnly,
  getShiftedDateOnly,
  serializeDateOnly,
} from "../dateOnlyUtils";
import { dbGetGauges, dbUpsertGaugeRecord } from "./dbAccess";
import {
  getAllAssessmentRecords,
  getAllMedicineRecords,
} from "./dbRecordsService";
import {
  OperationNumber,
  EmptyTreatment,
  OperationBoolean,
  SourceType,
  OperationAny,
} from "./Gauge";
import { AssessmentValue } from "./Records";

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
  assessmentData.dayToLabelToValue.forEach((dayRow, day) => {
    dayRow.forEach((value, label) => {
      if (value !== null) {
        const dayToValue = labelToDayToValues.get(label) ?? new Map();
        dayToValue.set(day, value);
        labelToDayToValues.set(label, dayToValue);
      }
    });
  });
  medicineData.dayToLabelToValue.forEach((dayRow, day) => {
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
