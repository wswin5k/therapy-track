import { SQLiteDatabase } from "expo-sqlite";
import {
  MedicineSchedule as MedicineSchedule,
  Dosage,
} from "./MedicineSchedule";
import { Group } from "./Frequency";
import { Frequency, IntervalUnit } from "./Frequency";
import {
  ActiveIngredient,
  BaseUnit,
  IngredientAmountUnit,
  Medicine,
} from "./MedicineSchedule";
import {
  AssessmentValue,
  ScheduledDosageRecord,
  ScheduledMeasurementRecord,
  UnscheduledDosageRecord,
  UnscheduledMeasurementRecord,
} from "./Records";
import {
  Assessment,
  AssessmentSchedule,
  ValueType,
  Measurement,
  NumericValueDomain,
  SelectValueDomain,
  TextValueDomain,
  ValueDomain,
} from "./AssessmentSchedule";
import {
  deserializeDateOnly,
  deserializeDateOnlyNullable,
  serializeDateOnly,
  serializeDateOnlyNullable,
} from "../dateOnlyUtils";
import {
  ColumnConfig,
  ColumnType,
  HistoryTableSettings,
  Settings,
  ThemeSelection,
} from "./Settings";

interface MedicineScheduleWithMedicineRow {
  id: number;
  created_at: string;
  medicine: number;
  medicine_created_at: string;
  medicine_name: string;
  medicine_base_unit: keyof typeof BaseUnit;
  medicine_active_ingredients: string;
  start_date: string;
  end_date: string | null;
  dosages: DosageRow[];
  freq: string;
}

interface MedicineRow {
  id: number;
  created_at: string;
  name: string;
  base_unit: keyof typeof BaseUnit;
  active_ingredients: string;
}

interface ScheduledDosageRecordRow {
  id: number;
  record_datetime: string;
  date: string;
  medicine_schedule: number;
  dosage_index: number;
}

interface UncheduledDosageRecordRow {
  id: number;
  record_datetime: string;
  date: string;
  medicine: number;
  dosage_amount: number;
  group_: number | null;
}

interface DosageRow {
  id: number;
  amount: number;
  index_: number;
  offset: number;
  group_: number | null;
}

interface GroupRow {
  id: number;
  created_at: string;
  name: string;
  color: string;
  is_reminder_on: number;
  reminder_time: string | null;
}

interface AssessmentRow {
  id: number;
  created_at: string;
  name: string;
  type: ValueType;
  value_domain: string | null;
}

interface UncheduledMeasurementRecordRow {
  id: number;
  record_datetime: string;
  date: string;
  assessment: number;
  value: string;
  group_: number | null;
  assessment_type: ValueType;
}

interface AssessmentScheduleWithAssessmentRow {
  id: number;
  created_at: string;
  assessment: number;
  assessment_created_at: string;
  assessment_name: string;
  assessment_type: ValueType;
  assessment_value_domain: string | null;
  start_date: string;
  end_date: string | null;
  measurements: MeasurementRow[];
  freq: string;
}

interface MeasurementRow {
  id: number;
  index_: number;
  offset: number;
  group_: number | null;
}

interface ScheduledMeasurementRecordRow {
  id: number;
  record_datetime: string;
  date: string;
  assessment_schedule: number;
  measurement_index: number;
  value: string;
  assessment_type: ValueType;
}

interface SettingsRow {
  id: number;
  theme: string;
}

interface HistoryTableSettingsRow {
  id: number;
  expand_all_rows: number;
  show_days_without_entries: number;
  merge_ingredients_with_different_forms: number;
  column_configs: string;
}

function serializeDatetime(value: Date): string {
  return value.toISOString();
}

function deserializeDatetime(value: string): Date {
  return new Date(value);
}

function deserializeActiveIngredients(json: string) {
  const aiData = JSON.parse(json);
  return aiData.map((ai: { name: string; amount: number; unit: string }) => {
    if (
      !Object.values(IngredientAmountUnit).includes(
        ai.unit as IngredientAmountUnit,
      )
    ) {
      throw Error(`${ai.unit} is not a valid IngredientAmountUnit enum value.`);
    }
    return new ActiveIngredient(
      ai.name,
      ai.amount,
      ai.unit as IngredientAmountUnit,
    );
  });
}

function deserializeValueDomain(
  json: string | null,
  assessmentType: ValueType,
) {
  if (!json) {
    return null;
  }
  const vdData = JSON.parse(json);
  if (vdData === null) {
    return null;
  }
  switch (assessmentType) {
    case ValueType.Numeric:
      return new NumericValueDomain(vdData.min, vdData.max);
    case ValueType.Text:
      return new TextValueDomain(vdData.max_characters);
    case ValueType.SingleSelect:
    case ValueType.MultiSelect:
      return new SelectValueDomain(vdData.values);
    default:
      return null;
  }
}

function serializeAssessmentValue(value: AssessmentValue): string {
  if (typeof value === "string") {
    return value;
  } else {
    return JSON.stringify(value);
  }
}

function deserializeAssessmentValue(
  value: string,
  assessmentType: ValueType,
): AssessmentValue {
  switch (assessmentType) {
    case ValueType.Numeric:
      return Number.parseFloat(value);
    case ValueType.Boolean:
      return value === "true";
    case ValueType.SingleSelect:
    case ValueType.MultiSelect:
      return JSON.parse(value);
    default:
      return value;
  }
}

function deserializeBoolean(value: number): boolean {
  return value !== 0;
}

function serializeBoolean(value: boolean): number {
  return value ? 1 : 0;
}

function serializeColumnConfigs(value: Map<string, ColumnConfig>): string {
  const result = JSON.stringify(Object.values(value));
  return result;
}

function deserializeColumnConfigs(value: string): Map<string, ColumnConfig> {
  const obj = JSON.parse(value);

  const result = new Map();

  obj.forEach(
    (cc: {
      isShown: boolean;
      width: number;
      ordinal: number;
      _type: number;
      _source_created_at: string;
      _header: string;
    }) => {
      if (!Object.values(ColumnType).includes(cc._type as ColumnType)) {
        throw Error(
          `${cc._type} is not a valid IngredientAmountUnit enum value.`,
        );
      }
      result.set(
        cc._header,
        new ColumnConfig(
          cc.isShown,
          cc.width,
          cc.ordinal,
          cc._type,
          new Date(cc._source_created_at),
          cc._header,
        ),
      );
    },
  );
  return result;
}

function getDateFilterClause(startDate?: Date, endDate?: Date): string {
  if (startDate && endDate) {
    const startDateStr = serializeDateOnly(startDate);
    const endDateStr = serializeDateOnly(endDate);
    return `
    WHERE date(date) >= '${startDateStr}'
    AND date(date) <= '${endDateStr}'`;
  } else if (startDate) {
    const startDateStr = serializeDateOnly(startDate);
    return `
    WHERE date(date) >= '${startDateStr}'`;
  } else if (endDate) {
    const endDateStr = serializeDateOnly(endDate);
    return `
    WHERE date(date) <= '${endDateStr}'`;
  } else {
    return "";
  }
}

export async function dbUpdateMedicine(
  db: SQLiteDatabase,
  medicine: {
    name: string;
    baseUnit: BaseUnit;
    activeIngredients: ActiveIngredient[];
    dbId: number;
  },
) {
  const activeIngredientsStr = JSON.stringify(medicine.activeIngredients);

  await db.runAsync(
    `UPDATE medicines
    SET name = ?, base_unit = ?, active_ingredients = ?
    WHERE id = ?`,
    medicine.name,
    medicine.baseUnit,
    activeIngredientsStr,
    medicine.dbId,
  );
}

export async function dbGetMedicines(db: SQLiteDatabase): Promise<Medicine[]> {
  const rows = await db.getAllAsync<MedicineRow>(`
      SELECT id, name, base_unit, active_ingredients
      FROM medicines
    `);

  return rows.map((row) => {
    const active_ingredients = deserializeActiveIngredients(
      row.active_ingredients,
    );
    return new Medicine(
      row.name,
      BaseUnit[row.base_unit],
      active_ingredients,
      deserializeDatetime(row.created_at),
      row.id,
    );
  });
}

export async function dbDeleteMedicine(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM medicines WHERE id = ?", id);
  // todo remove labels from history table settings
}

export async function dbInsertMedicine(
  db: SQLiteDatabase,
  medicine: {
    name: string;
    baseUnit: BaseUnit;
    activeIngredients: ActiveIngredient[];
  },
): Promise<number> {
  const activeIngredientsStr = JSON.stringify(medicine.activeIngredients);
  const db_insert = await db.runAsync(
    `INSERT INTO medicines
    (created_at, name, base_unit, active_ingredients)
    VALUES (?, ?, ?, ?)`,
    serializeDatetime(new Date()),
    medicine.name,
    medicine.baseUnit,
    activeIngredientsStr,
  );
  return db_insert.lastInsertRowId;
}

function parseMedicineScheduleWithMedicineRow(
  row: MedicineScheduleWithMedicineRow,
): MedicineSchedule {
  const active_ingredients = deserializeActiveIngredients(
    row.medicine_active_ingredients,
  );
  const medicineData = new Medicine(
    row.medicine_name,
    BaseUnit[row.medicine_base_unit],
    active_ingredients,
    deserializeDatetime(row.medicine_created_at),
    row.medicine,
  );
  const dosages = row.dosages.map(
    (dd: DosageRow) =>
      new Dosage(dd.amount, dd.index_, dd.offset, dd.group_, dd.id),
  );
  const freqData = JSON.parse(row.freq);
  const frequency = new Frequency(
    freqData.intervalUnit as IntervalUnit,
    freqData.intervalLength,
    freqData.numberOfDosages,
  );

  return new MedicineSchedule(
    medicineData,
    deserializeDateOnly(row.start_date),
    deserializeDateOnlyNullable(row.end_date),
    frequency,
    dosages,
    deserializeDatetime(row.created_at),
    row.id,
  );
}

function parseAssessmentScheduleWithAssessmentRow(
  row: AssessmentScheduleWithAssessmentRow,
): AssessmentSchedule {
  const assessmentValueDomain = row.assessment_value_domain
    ? deserializeValueDomain(row.assessment_value_domain, row.assessment_type)
    : null;
  const assessment = new Assessment(
    row.assessment_name,
    row.assessment_type,
    assessmentValueDomain,
    deserializeDatetime(row.assessment_created_at),
    row.assessment,
  );
  const measurements = row.measurements.map(
    (dd: MeasurementRow) =>
      new Measurement(dd.index_, dd.offset, dd.group_, dd.id),
  );
  const freqData = JSON.parse(row.freq);
  const frequency = new Frequency(
    freqData.intervalUnit as IntervalUnit,
    freqData.intervalLength,
    freqData.numberOfDosages,
  );

  return new AssessmentSchedule(
    assessment,
    deserializeDateOnly(row.start_date),
    deserializeDateOnlyNullable(row.end_date),
    frequency,
    measurements,
    deserializeDatetime(row.created_at),
    row.id,
  );
}

export async function dbGetMedicineSchedule(
  db: SQLiteDatabase,
  medicineScheduleId: number,
): Promise<MedicineSchedule> {
  const row = await db.getFirstAsync<MedicineScheduleWithMedicineRow>(`
      SELECT
        s.id,
        s.created_at,
        s.medicine, 
        m.created_at as medicine_created_at,
        m.name as medicine_name,
        m.base_unit as medicine_base_unit,
        m.active_ingredients as medicine_active_ingredients,
        s.start_date,
        s.end_date,
        s.freq
      FROM medicine_schedules s
      JOIN medicines m ON s.medicine = m.id
      WHERE s.id = ${medicineScheduleId}
    `);

  const dosagesRows = await dbGetDosages(db, medicineScheduleId);

  if (row === null) {
    throw Error("No schedule with given id.");
  }
  row.dosages = dosagesRows;
  return parseMedicineScheduleWithMedicineRow(row);
}

export async function dbGetMedicineSchedules(
  db: SQLiteDatabase,
): Promise<MedicineSchedule[]> {
  const rows = await db.getAllAsync<MedicineScheduleWithMedicineRow>(`
      SELECT
        s.id,
        s.created_at,
        s.medicine, 
        m.created_at as medicine_created_at,
        m.name as medicine_name,
        m.base_unit as medicine_base_unit,
        m.active_ingredients as medicine_active_ingredients,
        s.start_date,
        s.end_date,
        s.freq
      FROM medicine_schedules s
      JOIN medicines m ON s.medicine = m.id
      ORDER BY s.start_date DESC
    `);

  for (const row of rows) {
    row.dosages = await dbGetDosages(db, row.id);
  }

  return rows.map(parseMedicineScheduleWithMedicineRow);
}

export async function dbInsertMedicineSchedule(
  db: SQLiteDatabase,
  medicineId: number,
  medicineSchedule: {
    startDate: Date;
    endDate: Date | null;
    dosages: {
      amount: number;
      index: number;
      offset: number;
      groupId: number | null;
    }[];
    freq: Frequency;
  },
) {
  const freqJson = JSON.stringify(medicineSchedule.freq);
  const startDateStr = serializeDateOnly(medicineSchedule.startDate);
  const endDateStr = serializeDateOnlyNullable(medicineSchedule.endDate);

  const result = await db.runAsync(
    `INSERT INTO medicine_schedules 
    (created_at, medicine, start_date, end_date, freq) 
    VALUES (?, ?, ?, ?, ?)`,
    serializeDatetime(new Date()),
    medicineId,
    startDateStr,
    endDateStr,
    freqJson,
  );
  const medicineScheduleId = result.lastInsertRowId;
  await dbInsertDosages(db, medicineScheduleId, medicineSchedule.dosages);
}

export async function dbUpdateMedicineSchedule(
  db: SQLiteDatabase,
  medicineSchedule: {
    dbId: number;
    startDate: Date;
    endDate: Date | null;
  },
) {
  const startDateStr = serializeDateOnly(medicineSchedule.startDate);
  const endDateStr = serializeDateOnlyNullable(medicineSchedule.endDate);

  await db.runAsync(
    `UPDATE medicine_schedules
    SET start_date = ?, end_date = ?
    WHERE id = ?`,
    startDateStr,
    endDateStr,
    medicineSchedule.dbId,
  );
}

export async function dbUpdateAssessmentSchedule(
  db: SQLiteDatabase,
  assessmentSchedule: {
    dbId: number;
    startDate: Date;
    endDate: Date | null;
  },
) {
  const startDateStr = serializeDateOnly(assessmentSchedule.startDate);
  const endDateStr = serializeDateOnlyNullable(assessmentSchedule.endDate);

  await db.runAsync(
    `UPDATE assessment_schedules
    SET start_date = ?, end_date = ?
    WHERE id = ?`,
    startDateStr,
    endDateStr,
    assessmentSchedule.dbId,
  );
}

export async function dbInsertMedicineScheduleWithMedicine(
  db: SQLiteDatabase,
  medicine: {
    name: string;
    baseUnit: BaseUnit;
    activeIngredients: ActiveIngredient[];
  },
  medicineSchedule: {
    startDate: Date;
    endDate: Date | null;
    dosages: {
      amount: number;
      index: number;
      offset: number;
      groupId: number | null;
    }[];
    freq: Frequency;
  },
) {
  const medicineId = await dbInsertMedicine(db, medicine);
  await dbInsertMedicineSchedule(db, medicineId, medicineSchedule);
}

export async function dbDeleteMedicineSchedule(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM dosages WHERE medicine_schedule = ?", id);
  await db.runAsync("DELETE FROM medicine_schedules WHERE id = ?", id);
}

export async function dbInsertScheduledDosageRecord(
  db: SQLiteDatabase,
  record: { medicineScheduleId: number; date: Date; dosageIndex: number },
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO scheduled_dosage_records 
    (record_datetime, date, medicine_schedule, dosage_index) 
    VALUES (?, ?, ?, ?)`,
    serializeDatetime(new Date()),
    serializeDateOnly(record.date),
    record.medicineScheduleId,
    record.dosageIndex,
  );
  return result.lastInsertRowId;
}

export async function dbDeleteScheduledDosageRecord(
  db: SQLiteDatabase,
  id: number,
) {
  await db.runAsync("DELETE FROM scheduled_dosage_records WHERE id = ?", id);
}

export async function dbDeleteScheduledDosageRecordsForSchedule(
  db: SQLiteDatabase,
  medicineScheduleId: number,
) {
  await db.runAsync(
    "DELETE FROM scheduled_dosage_records WHERE medicine_schedule = ?",
    medicineScheduleId,
  );
}

export async function dbGetScheduledDosageRecords(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<ScheduledDosageRecord[]> {
  let queryStr = "SELECT * FROM scheduled_dosage_records ";

  queryStr += getDateFilterClause(startDate, endDate);

  const rows = await db.getAllAsync<ScheduledDosageRecordRow>(queryStr);
  return rows.map(
    (row) =>
      new ScheduledDosageRecord(
        row.id,
        deserializeDatetime(row.record_datetime),
        deserializeDateOnly(row.date),
        row.medicine_schedule,
        row.dosage_index,
      ),
  );
}

export async function dbGetScheduledMeasurementRecords(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<ScheduledMeasurementRecord[]> {
  let queryStr = `SELECT r.*, a.type as assessment_type
  FROM scheduled_measurement_records as r
  JOIN assessment_schedules as s ON r.assessment_schedule = s.id
  JOIN assessments as a ON s.assessment = a.id
  `;

  queryStr += getDateFilterClause(startDate, endDate);

  const rows = await db.getAllAsync<ScheduledMeasurementRecordRow>(queryStr);
  return rows.map(
    (row) =>
      new ScheduledMeasurementRecord(
        row.id,
        deserializeDatetime(row.record_datetime),
        deserializeDateOnly(row.date),
        row.assessment_schedule,
        row.measurement_index,
        deserializeAssessmentValue(row.value, row.assessment_type),
      ),
  );
}

export async function dbInsertUnscheduledDosageRecord(
  db: SQLiteDatabase,
  record: {
    date: Date;
    medicineId: number;
    dosageAmount: number;
    group: number | null;
  },
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO unscheduled_dosage_records 
    (record_datetime, date, medicine, dosage_amount, group_) 
    VALUES (?, ?, ?, ?, ?)`,
    serializeDatetime(new Date()),
    serializeDateOnly(record.date),
    record.medicineId,
    record.dosageAmount,
    record.group,
  );
  return result.lastInsertRowId;
}

export async function dbDeleteUnscheduledDosageRecord(
  db: SQLiteDatabase,
  recordId: number,
) {
  await db.runAsync(
    "DELETE FROM unscheduled_dosage_records WHERE id = ?",
    recordId,
  );
}

export async function dbGetUnscheduledDosageRecords(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<UnscheduledDosageRecord[]> {
  let queryStr = "SELECT * FROM unscheduled_dosage_records ";

  queryStr += getDateFilterClause(startDate, endDate);

  const rows = await db.getAllAsync<UncheduledDosageRecordRow>(queryStr);
  return rows.map(
    (row) =>
      new UnscheduledDosageRecord(
        row.id,
        deserializeDatetime(row.record_datetime),
        deserializeDateOnly(row.date),
        row.medicine,
        row.dosage_amount,
        row.group_,
      ),
  );
}

export async function dbDeleteScheduledMeasurementRecordsForAssessmentSchedule(
  db: SQLiteDatabase,
  assessmentScheduleId: number,
) {
  await db.runAsync(
    "DELETE FROM scheduled_measurement_records WHERE assessment_schedule = ?",
    assessmentScheduleId,
  );
}

export async function dbDeleteAssessmentSchedule(
  db: SQLiteDatabase,
  id: number,
) {
  await db.runAsync(
    "DELETE FROM measurements WHERE assessment_schedule = ?",
    id,
  );
  await db.runAsync("DELETE FROM assessment_schedules WHERE id = ?", id);
}

export async function dbGetGroups(db: SQLiteDatabase): Promise<Group[]> {
  const rows = await db.getAllAsync<GroupRow>(`
      SELECT id, created_at, name, color, is_reminder_on, reminder_time
      FROM groups
    `);

  return rows.map((row) => {
    return new Group(
      row.name,
      row.color,
      row.is_reminder_on !== 0,
      row.reminder_time,
      deserializeDatetime(row.created_at),
      row.id,
    );
  });
}

async function dbInsertDosages(
  db: SQLiteDatabase,
  medicineScheduleId: number,
  dosages: {
    amount: number;
    index: number;
    offset: number;
    groupId: number | null;
  }[],
): Promise<number[]> {
  const ids = [];
  for (const dosage of dosages) {
    const result = await db.runAsync(
      `INSERT INTO dosages 
      (amount, index_, offset, group_, medicine_schedule) 
      VALUES (?, ?, ?, ?, ?)`,
      dosage.amount,
      dosage.index,
      dosage.offset,
      dosage.groupId,
      medicineScheduleId,
    );
    ids.push(result.lastInsertRowId);
  }
  return ids;
}

async function dbGetDosages(
  db: SQLiteDatabase,
  medicineScheduleId: number,
): Promise<DosageRow[]> {
  return await db.getAllAsync<DosageRow>(
    `SELECT * FROM dosages WHERE medicine_schedule = ?`,
    medicineScheduleId,
  );
}

export async function dbInsertGroup(
  db: SQLiteDatabase,
  group: {
    name: string;
    color: string;
    isReminderOn: boolean;
    reminderTime: string | null;
  },
): Promise<number> {
  const db_insert = await db.runAsync(
    `INSERT INTO groups 
    (created_at, name, color, is_reminder_on, reminder_time) 
    VALUES (?, ?, ?, ?, ?)`,
    serializeDatetime(new Date()),
    group.name,
    group.color,
    serializeBoolean(group.isReminderOn),
    group.reminderTime,
  );
  return db_insert.lastInsertRowId;
}

export async function dbUpdateGroup(
  db: SQLiteDatabase,
  group: {
    name: string;
    color: string;
    isReminderOn: boolean;
    reminderTime: string | null;
    dbId: number;
  },
) {
  await db.runAsync(
    `UPDATE groups
    SET name = ?, color = ?, is_reminder_on = ?, reminder_time = ?
    WHERE id = ?`,
    group.name,
    group.color,
    serializeBoolean(group.isReminderOn),
    group.reminderTime,
    group.dbId,
  );
}

export async function dbDeleteGroup(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM groups WHERE id = ?", id);
}

export async function dbGroupHasDosagesOrMeasurements(
  db: SQLiteDatabase,
  groupId: number,
): Promise<boolean> {
  const resultDosages = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM dosages WHERE group_ = ?",
    groupId,
  );
  const resultMeasurements = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM measurements WHERE group_ = ?",
    groupId,
  );
  return (
    (resultDosages?.count ?? 0) > 0 || (resultMeasurements?.count ?? 0) > 0
  );
}

export async function dbGroupHasUnscheduledRecords(
  db: SQLiteDatabase,
  groupId: number,
): Promise<boolean> {
  const resultDosages = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM unscheduled_dosage_records WHERE group_ = ?",
    groupId,
  );
  const resultMeasurements = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM unscheduled_measurement_records WHERE group_ = ?",
    groupId,
  );
  return (
    (resultDosages?.count ?? 0) > 0 || (resultMeasurements?.count ?? 0) > 0
  );
}

export async function dbInsertAssessment(
  db: SQLiteDatabase,
  assessment: {
    name: string;
    type: ValueType;
    valueDomain: ValueDomain;
  },
): Promise<number> {
  const valueDomainStr = JSON.stringify(assessment.valueDomain);
  const db_insert = await db.runAsync(
    `INSERT INTO assessments 
    (created_at, name, type, value_domain) 
    VALUES (?, ?, ?, ?)`,
    serializeDatetime(new Date()),
    assessment.name,
    assessment.type,
    valueDomainStr,
  );
  return db_insert.lastInsertRowId;
}

export async function dbDeleteAssessment(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM assessments WHERE id = ?", id);
  // todo remove labels from history table settings
}

export async function dbInsertUnscheduledMeasurementRecord(
  db: SQLiteDatabase,
  record: {
    date: Date;
    assessmentId: number;
    value: AssessmentValue;
    group: number | null;
  },
): Promise<number> {
  // array values should be sorted according to value domain order
  const valueStr = serializeAssessmentValue(record.value);
  const result = await db.runAsync(
    `INSERT INTO unscheduled_measurement_records 
    (record_datetime, date, assessment, value, group_) 
    VALUES (?, ?, ?, ?, ?)`,
    serializeDatetime(new Date()),
    serializeDateOnly(record.date),
    record.assessmentId,
    valueStr,
    record.group,
  );
  return result.lastInsertRowId;
}

export async function dbGetUnscheduledMeasurementRecords(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<UnscheduledMeasurementRecord[]> {
  let queryStr = `SELECT r.*, a.type as assessment_type
  FROM unscheduled_measurement_records as r
  JOIN assessments as a ON r.assessment = a.id`;

  queryStr += getDateFilterClause(startDate, endDate);

  const rows = await db.getAllAsync<UncheduledMeasurementRecordRow>(queryStr);
  return rows.map((row) => {
    const value = deserializeAssessmentValue(
      row.value,
      ValueType[row.assessment_type],
    );
    return new UnscheduledMeasurementRecord(
      row.id,
      deserializeDatetime(row.record_datetime),
      deserializeDateOnly(row.date),
      row.assessment,
      value,
      row.group_,
    );
  });
}

export async function dbInsertScheduledMeasurementRecord(
  db: SQLiteDatabase,
  record: {
    date: Date;
    assessmentScheduleId: number;
    measurementIndex: number;
    value: AssessmentValue;
  },
): Promise<number> {
  // array values should be sorted according to value domain order
  const valueStr = serializeAssessmentValue(record.value);

  const result = await db.runAsync(
    `INSERT INTO scheduled_measurement_records 
    (record_datetime, date, assessment_schedule, measurement_index, value) 
    VALUES (?, ?, ?, ?, ?)`,
    serializeDatetime(new Date()),
    serializeDateOnly(record.date),
    record.assessmentScheduleId,
    record.measurementIndex,
    valueStr,
  );
  return result.lastInsertRowId;
}

export async function dbDeleteScheduledMeasurementRecord(
  db: SQLiteDatabase,
  id: number,
) {
  await db.runAsync(
    "DELETE FROM scheduled_measurement_records WHERE id = ?",
    id,
  );
}

export async function dbUpdateAssessment(
  db: SQLiteDatabase,
  assessment: {
    name: string;
    type: ValueType;
    valueDomain: ValueDomain;
    dbId: number;
  },
) {
  const valueDomainStr = JSON.stringify(assessment.valueDomain);

  const db_insert = await db.runAsync(
    `UPDATE assessments
    SET name = ?, type = ?, value_domain = ?
    WHERE id = ?`,
    assessment.name,
    assessment.type,
    valueDomainStr,
    assessment.dbId,
  );
  return db_insert.lastInsertRowId;
}

export async function dbGetAssessments(
  db: SQLiteDatabase,
): Promise<Assessment[]> {
  const rows = await db.getAllAsync<AssessmentRow>(`
      SELECT id, created_at, name, type, value_domain
      FROM assessments
    `);
  return rows.map((row) => {
    const assessmentType = ValueType[row.type];
    const valueDomain = row.value_domain
      ? deserializeValueDomain(row.value_domain, assessmentType)
      : null;
    return new Assessment(
      row.name,
      assessmentType,
      valueDomain,
      deserializeDatetime(row.created_at),
      row.id,
    );
  });
}

export async function dbDeleteUnscheduledMeasurementRecord(
  db: SQLiteDatabase,
  recordId: number,
) {
  await db.runAsync(
    "DELETE FROM unscheduled_measurement_records WHERE id = ?",
    recordId,
  );
}

async function dbInsertMeasurements(
  db: SQLiteDatabase,
  assessmentScheduleId: number,
  measurements: {
    index: number;
    offset: number;
    groupId: number | null;
  }[],
): Promise<number[]> {
  const ids = [];
  for (const m of measurements) {
    const result = await db.runAsync(
      `INSERT INTO measurements 
      (index_, offset, group_, assessment_schedule) 
      VALUES (?, ?, ?, ?)`,
      m.index,
      m.offset,
      m.groupId,
      assessmentScheduleId,
    );
    ids.push(result.lastInsertRowId);
  }
  return ids;
}

export async function dbInsertAssessmentSchedule(
  db: SQLiteDatabase,
  assessmentId: number,
  assessmentSchedule: {
    startDate: Date;
    endDate: Date | null;
    measurements: {
      index: number;
      offset: number;
      groupId: number | null;
    }[];
    freq: Frequency;
  },
) {
  const freqJson = JSON.stringify(assessmentSchedule.freq);
  const startDateStr = serializeDateOnly(assessmentSchedule.startDate);
  const endDateStr = serializeDateOnlyNullable(assessmentSchedule.endDate);

  const result = await db.runAsync(
    `INSERT INTO assessment_schedules 
    (created_at, assessment, start_date, end_date, freq) 
    VALUES (?, ?, ?, ?, ?)`,
    serializeDatetime(new Date()),
    assessmentId,
    startDateStr,
    endDateStr,
    freqJson,
  );

  const assessmentScheduleId = result.lastInsertRowId;
  await dbInsertMeasurements(
    db,
    assessmentScheduleId,
    assessmentSchedule.measurements,
  );
}

export async function dbInsertAssessmentScheduleWithAssessment(
  db: SQLiteDatabase,
  assessment: {
    name: string;
    type: ValueType;
    valueDomain: ValueDomain;
  },
  assessmentSchedule: {
    startDate: Date;
    endDate: Date | null;
    measurements: {
      index: number;
      offset: number;
      groupId: number | null;
    }[];
    freq: Frequency;
  },
) {
  const assessmentId = await dbInsertAssessment(db, assessment);
  await dbInsertAssessmentSchedule(db, assessmentId, assessmentSchedule);
}

async function dbGetMeasurements(
  db: SQLiteDatabase,
  assessmentScheduleId: number,
): Promise<MeasurementRow[]> {
  return await db.getAllAsync<MeasurementRow>(
    `SELECT * FROM measurements WHERE assessment_schedule = ?`,
    assessmentScheduleId,
  );
}

export async function dbGetAssessmentSchedules(
  db: SQLiteDatabase,
): Promise<AssessmentSchedule[]> {
  const rows = await db.getAllAsync<AssessmentScheduleWithAssessmentRow>(`
      SELECT
        s.id,
        s.created_at,
        s.assessment,
        a.created_at as assessment_created_at,
        a.name as assessment_name,
        a.type as assessment_type,
        a.value_domain as assessment_value_domain,
        s.start_date,
        s.end_date,
        s.freq
      FROM assessment_schedules s
      JOIN assessments a ON s.assessment = a.id
      ORDER BY s.start_date DESC
    `);
  for (const row of rows) {
    row.measurements = await dbGetMeasurements(db, row.id);
  }
  return rows.map(parseAssessmentScheduleWithAssessmentRow);
}

export async function dbGetAssessmentSchedule(
  db: SQLiteDatabase,
  assessmentScheduleId: number,
): Promise<AssessmentSchedule> {
  const row = await db.getFirstAsync<AssessmentScheduleWithAssessmentRow>(`
      SELECT
        s.id,
        s.created_at,
        s.assessment,
        a.created_at as assessment_created_at,
        a.name as assessment_name,
        a.type as assessment_type,
        a.value_domain as assessment_value_domain,
        s.start_date,
        s.end_date,
        s.freq
      FROM assessment_schedules s
      JOIN assessments a ON s.assessment = a.id
      WHERE s.id = ${assessmentScheduleId}
    `);

  const measurementsRows = await dbGetMeasurements(db, assessmentScheduleId);

  if (row === null) {
    throw Error("No schedule with given id.");
  }
  row.measurements = measurementsRows;
  return parseAssessmentScheduleWithAssessmentRow(row);
}

export async function dbGetSettings(db: SQLiteDatabase): Promise<Settings> {
  const row = await db.getFirstAsync<SettingsRow>(`
      SELECT id, theme
      FROM settings
      WHERE id = 1
    `);
  if (row === null) {
    throw Error("No settings in the database.");
  }
  if (!Object.values(ThemeSelection).includes(row.theme as ThemeSelection)) {
    throw Error(`${row.theme} is not a valid ThemeSelection enum value.`);
  }
  return new Settings(row.theme as ThemeSelection);
}

export async function dbUpdateSettings(
  db: SQLiteDatabase,
  settings: {
    theme: ThemeSelection;
  },
) {
  await db.runAsync(
    `UPDATE settings
    SET theme = ?
    WHERE id = 1`,
    settings.theme,
  );
}

export async function dbGetHistoryTableSettings(
  db: SQLiteDatabase,
): Promise<HistoryTableSettings> {
  const row = await db.getFirstAsync<HistoryTableSettingsRow>(`
      SELECT *
      FROM history_table_settings
      WHERE id = 1
    `);
  if (row === null) {
    throw Error("No history_table_settings in the database.");
  }
  return new HistoryTableSettings(
    deserializeBoolean(row.expand_all_rows),
    deserializeBoolean(row.show_days_without_entries),
    deserializeBoolean(row.merge_ingredients_with_different_forms),
    deserializeColumnConfigs(row.column_configs),
  );
}

export async function dbUpdateHistoryTableSettings(
  db: SQLiteDatabase,
  settings: HistoryTableSettings,
) {
  await db.runAsync(
    `UPDATE history_table_settings
    SET expand_all_rows = ?,
    show_days_without_entries = ?, 
    merge_ingredients_with_different_forms = ?,
    column_configs = ?
    WHERE id = 1`,
    serializeBoolean(settings.expandAllRows),
    serializeBoolean(settings.showDaysWithoutEntries),
    serializeBoolean(settings.mergeIngredientsWithDifferentForms),
    serializeColumnConfigs(settings.columnConfigs),
  );
}
