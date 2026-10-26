import { SQLiteDatabase } from "expo-sqlite";
import {
  dbGetAssessments,
  dbGetMedicines,
  dbGetScheduledMeasurementRecords,
  dbGetUnscheduledMeasurementRecords,
} from "./dbAccess";
import { baseUnitShorFormPlural } from "../navigation/enumMappings";
import { Gauge, OperationNumber } from "./Gauge";
import { ValueType } from "./AssessmentSchedule";
import { getShiftedDateOnly } from "../dateOnlyUtils";

export enum SourceType {
  AssessmentNumeric = "AssessmentNumeric",
  AssessmentBoolean = "AssessmentBoolean",
  Medicine = "Medicine",
  ActiveIngredientWithForm = "ActiveIngredientWithForm",
  ActiveIngredientWithoutForm = "ActiveIngredientWithoutForm",
}

export class Column {
  constructor(
    public label: string,
    public sourceType: SourceType,
    public sourceIds: number[],
  ) {}
}

export async function dbColumnsGetAll(db: SQLiteDatabase): Promise<Column[]> {
  const medicines = await dbGetMedicines(db);
  const columns = new Map();
  medicines.forEach((m) => {
    const baseUnitLabel = baseUnitShorFormPlural(m.baseUnit);
    columns.set(
      m.getLabel(),
      new Column(m.getLabel(), SourceType.Medicine, [m.dbId]),
    );
    m.activeIngredients.forEach((ai) => {
      const label = ai.getLabelWithoutUnit(baseUnitLabel);
      const column = columns.get(label);
      if (column) {
        column.sourceIds.push(label);
      } else {
        columns.set(
          label,
          new Column(label, SourceType.ActiveIngredientWithForm, [m.dbId]),
        );
      }

      const labelShort = ai.getShortLabelWithoutUnit();
      const columnShort = columns.get(labelShort);
      if (columnShort) {
        columnShort.sourceIds.push(m.dbId);
      } else {
        columns.set(
          label,
          new Column(label, SourceType.ActiveIngredientWithoutForm, [m.dbId]),
        );
      }
    });
  });

  const assessments = dbGetAssessments(db);
  (await assessments).forEach((a) => {
    const label = a.getLabel("[-]");
    if (a.type === ValueType.Numeric) {
      columns.set(
        label,
        new Column(label, SourceType.AssessmentNumeric, [a.dbId]),
      );
    } else if (a.type === ValueType.Boolean) {
      columns.set(
        label,
        new Column(label, SourceType.AssessmentBoolean, [a.dbId]),
      );
    }
  });

  return Array.from(columns.values());
}

export async function updateGaugeRecord(
  db: SQLiteDatabase,
  gauge: Gauge,
  date: Date,
): Promise<number> {
  // get coressponding source records froom a given time period
  // apply operations
  // update or insert the result to the database as gauge record

  console.log(gauge);

  let result = 0;
  if (gauge.sourceColumn.sourceType === SourceType.AssessmentNumeric) {
    const unscheduledRecords = await dbGetUnscheduledMeasurementRecords(
      db,
      getShiftedDateOnly(date, -gauge.lengthInDays + 1),
      date,
    );
    for (const r of unscheduledRecords) {
      if (gauge.operation === OperationNumber.Total) {
        if (typeof r.value === "number") {
          result += r.value;
        }
      }
    }
    const scheduledRecords = await dbGetScheduledMeasurementRecords(
      db,
      getShiftedDateOnly(date, -gauge.lengthInDays + 1),
      date,
    );
    for (const r of scheduledRecords) {
      if (!gauge.sourceColumn.sourceIds.includes(gauge.dbId)) {
        continue;
      }
      if (gauge.operation === OperationNumber.Total) {
        if (typeof r.value === "number") {
          result += r.value;
          console.log(r.value);
        }
      }
    }
  }
  return result;
}
