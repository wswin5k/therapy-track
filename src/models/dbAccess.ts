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
  strKeyOfBaseUnit,
} from "./MedicineSchedule";
import {
  AssessmentValue,
  ScheduledDosageRecord,
  ScheduledMeasurmentRecord,
  UnscheduledDosageRecord,
  UnscheduledMeasurmentRecord,
} from "./Records";
import {
  Assessment,
  AssessmentSchedule,
  AssessmentType,
  Measurment,
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

interface MedicineScheduleWithMedicineRow {
  id: number;
  medicine: number;
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
  offset: number | null;
  group_: number | null;
}

interface GroupRow {
  id: number;
  name: string;
  color: string;
  is_reminder_on: number;
  reminder_time: string | null;
}

interface AssessmentRow {
  id: number;
  name: string;
  type: AssessmentType;
  value_domain: string | null;
}

interface UncheduledMeasurmentRecordRow {
  id: number;
  record_datetime: string;
  date: string;
  assessment: number;
  value: string;
  group_: number | null;
  assessment_type: AssessmentType;
}

interface AssessmentScheduleWithAssessmentRow {
  id: number;
  assessment: number;
  assessment_name: string;
  assessment_type: AssessmentType;
  assessment_value_domain: string | null;
  start_date: string;
  end_date: string | null;
  measurments: MeasurmentRow[];
  freq: string;
}

interface MeasurmentRow {
  id: number;
  index_: number;
  offset: number | null;
  group_: number | null;
}

interface ScheduledMeasurmentRecordRow {
  id: number;
  record_datetime: string;
  date: string;
  assessment_schedule: number;
  measurment_index: number;
  value: string;
  assessment_type: AssessmentType;
}

function serializeRecordDatetime(value: Date): string {
  return value.toISOString();
}

function deserializeRecordDatetime(value: string): Date {
  return new Date(value);
}

function parseActiveIngredients(json: string) {
  const aiData = JSON.parse(json);
  return aiData.map(
    (ai: { name: string; amount: number; unit: string }) =>
      new ActiveIngredient(ai.name, ai.amount, ai.unit as IngredientAmountUnit),
  );
}

function parseValueDomain(json: string | null, assessmentType: AssessmentType) {
  if (!json) {
    return null;
  }
  const vdData = JSON.parse(json);
  if (vdData === null) {
    return null;
  }
  switch (assessmentType) {
    case AssessmentType.Numeric:
      return new NumericValueDomain(vdData.min, vdData.max);
    case AssessmentType.Text:
      return new TextValueDomain(vdData.max_characters);
    case AssessmentType.SingleSelect:
    case AssessmentType.MultiSelect:
      return new SelectValueDomain(vdData.values);
    default:
      return null;
  }
}

function strigifyAssessmentValue(value: AssessmentValue): string {
  if (typeof value === "string") {
    return value;
  } else {
    return JSON.stringify(value);
  }
}

function parseAssessmentValue(
  value: string,
  assessmentType: AssessmentType,
): AssessmentValue {
  switch (assessmentType) {
    case AssessmentType.Numeric:
      return Number.parseFloat(value);
    case AssessmentType.Boolean:
      return value === "true";
    case AssessmentType.SingleSelect:
    case AssessmentType.MultiSelect:
      return JSON.parse(value);
    default:
      return value;
  }
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
    strKeyOfBaseUnit(medicine.baseUnit),
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
    const active_ingredients = parseActiveIngredients(row.active_ingredients);
    return new Medicine(
      row.name,
      BaseUnit[row.base_unit],
      active_ingredients,
      row.id,
    );
  });
}

export async function dbDeleteMedicine(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM medicines WHERE id = ?", id);
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
    "INSERT INTO medicines (name, base_unit, active_ingredients) VALUES (?, ?, ?)",
    medicine.name,
    strKeyOfBaseUnit(medicine.baseUnit),
    activeIngredientsStr,
  );
  return db_insert.lastInsertRowId;
}

function parseMedicineScheduleWithMedicineRow(
  row: MedicineScheduleWithMedicineRow,
): MedicineSchedule {
  const active_ingredients = parseActiveIngredients(
    row.medicine_active_ingredients,
  );
  const medicineData = new Medicine(
    row.medicine_name,
    BaseUnit[row.medicine_base_unit],
    active_ingredients,
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
    row.id,
  );
}

function parseAssessmentScheduleWithAssessmentRow(
  row: AssessmentScheduleWithAssessmentRow,
): AssessmentSchedule {
  const assessmentValueDomain = row.assessment_value_domain
    ? parseValueDomain(row.assessment_value_domain, row.assessment_type)
    : null;
  const assessment = new Assessment(
    row.assessment_name,
    row.assessment_type,
    assessmentValueDomain,
    row.assessment,
  );
  const measurments = row.measurments.map(
    (dd: MeasurmentRow) =>
      new Measurment(dd.index_, dd.offset, dd.group_, dd.id),
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
    measurments,
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
        s.medicine, 
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
        s.medicine, 
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
      offset: number | null;
      groupId: number | null;
    }[];
    freq: Frequency;
  },
) {
  const freqJson = JSON.stringify(medicineSchedule.freq);
  const startDateStr = serializeDateOnly(medicineSchedule.startDate);
  const endDateStr = serializeDateOnlyNullable(medicineSchedule.endDate);

  const result = await db.runAsync(
    "INSERT INTO medicine_schedules (medicine, start_date, end_date, freq) VALUES (?, ?, ?, ?)",
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

  console.log(startDateStr, endDateStr);

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
      offset: number | null;
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
    serializeRecordDatetime(new Date()),
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
        deserializeRecordDatetime(row.record_datetime),
        deserializeDateOnly(row.date),
        row.medicine_schedule,
        row.dosage_index,
      ),
  );
}

export async function dbGetScheduledMeasurmentRecords(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<ScheduledMeasurmentRecord[]> {
  let queryStr = `SELECT r.*, a.type as assessment_type
  FROM scheduled_measurment_records as r
  JOIN assessment_schedules as s ON r.assessment_schedule = s.id
  JOIN assessments as a ON s.assessment = a.id
  `;

  queryStr += getDateFilterClause(startDate, endDate);

  const rows = await db.getAllAsync<ScheduledMeasurmentRecordRow>(queryStr);
  return rows.map(
    (row) =>
      new ScheduledMeasurmentRecord(
        row.id,
        deserializeRecordDatetime(row.record_datetime),
        deserializeDateOnly(row.date),
        row.assessment_schedule,
        row.measurment_index,
        parseAssessmentValue(row.value, row.assessment_type),
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
    serializeRecordDatetime(new Date()),
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
        deserializeRecordDatetime(row.record_datetime),
        deserializeDateOnly(row.date),
        row.medicine,
        row.dosage_amount,
        row.group_,
      ),
  );
}

export async function dbDeleteScheduledMeasurmentRecordsForAssessmentSchedule(
  db: SQLiteDatabase,
  assessmentScheduleId: number,
) {
  await db.runAsync(
    "DELETE FROM scheduled_measurment_records WHERE assessment_schedule = ?",
    assessmentScheduleId,
  );
}

export async function dbDeleteAssessmentSchedule(
  db: SQLiteDatabase,
  id: number,
) {
  await db.runAsync(
    "DELETE FROM measurments WHERE assessment_schedule = ?",
    id,
  );
  await db.runAsync("DELETE FROM assessment_schedules WHERE id = ?", id);
}

export async function dbGetGroups(db: SQLiteDatabase): Promise<Group[]> {
  const rows = await db.getAllAsync<GroupRow>(`
      SELECT id, name, color, is_reminder_on, reminder_time
      FROM groups
    `);

  return rows.map((row) => {
    return new Group(
      row.name,
      row.color,
      row.is_reminder_on !== 0,
      row.reminder_time,
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
    offset: number | null;
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
    (name, color, is_reminder_on, reminder_time) VALUES (?, ?, ?, ?)`,
    group.name,
    group.color,
    group.isReminderOn ? 1 : 0,
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
    group.isReminderOn ? 1 : 0,
    group.reminderTime,
    group.dbId,
  );
}

export async function dbDeleteGroup(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM groups WHERE id = ?", id);
}

export async function dbGroupHasDosagesOrMeasurments(
  db: SQLiteDatabase,
  groupId: number,
): Promise<boolean> {
  const resultDosages = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM dosages WHERE group_ = ?",
    groupId,
  );
  const resultMeasurments = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM measurments WHERE group_ = ?",
    groupId,
  );
  return (resultDosages?.count ?? 0) > 0 || (resultMeasurments?.count ?? 0) > 0;
}

export async function dbGroupHasUnscheduledRecords(
  db: SQLiteDatabase,
  groupId: number,
): Promise<boolean> {
  const resultDosages = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM unscheduled_dosage_records WHERE group_ = ?",
    groupId,
  );
  const resultMeasurments = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM unscheduled_measurment_records WHERE group_ = ?",
    groupId,
  );
  return (resultDosages?.count ?? 0) > 0 || (resultMeasurments?.count ?? 0) > 0;
}

export async function dbInsertAssessment(
  db: SQLiteDatabase,
  assessment: {
    name: string;
    type: AssessmentType;
    valueDomain: ValueDomain;
  },
): Promise<number> {
  const valueDomainStr = JSON.stringify(assessment.valueDomain);
  const db_insert = await db.runAsync(
    "INSERT INTO assessments (name, type, value_domain) VALUES (?, ?, ?)",
    assessment.name,
    assessment.type,
    valueDomainStr,
  );
  return db_insert.lastInsertRowId;
}

export async function dbDeleteAssessment(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM assessments WHERE id = ?", id);
}

export async function dbInsertUnscheduledMeasurmentRecord(
  db: SQLiteDatabase,
  record: {
    date: Date;
    assessmentId: number;
    value: AssessmentValue;
    group: number | null;
  },
): Promise<number> {
  const valueStr = strigifyAssessmentValue(record.value);
  const result = await db.runAsync(
    `INSERT INTO unscheduled_measurment_records 
    (record_datetime, date, assessment, value, group_) 
    VALUES (?, ?, ?, ?, ?)`,
    serializeRecordDatetime(new Date()),
    serializeDateOnly(record.date),
    record.assessmentId,
    valueStr,
    record.group,
  );
  return result.lastInsertRowId;
}

export async function dbGetUnscheduledMeasurmentRecords(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<UnscheduledMeasurmentRecord[]> {
  let queryStr = `SELECT r.*, a.type as assessment_type
  FROM unscheduled_measurment_records as r
  JOIN assessments as a ON r.assessment = a.id`;

  queryStr += getDateFilterClause(startDate, endDate);

  const rows = await db.getAllAsync<UncheduledMeasurmentRecordRow>(queryStr);
  return rows.map((row) => {
    const value = parseAssessmentValue(
      row.value,
      AssessmentType[row.assessment_type],
    );
    return new UnscheduledMeasurmentRecord(
      row.id,
      deserializeRecordDatetime(row.record_datetime),
      deserializeDateOnly(row.date),
      row.assessment,
      value,
      row.group_,
    );
  });
}

export async function dbInsertScheduledMeasurmentRecord(
  db: SQLiteDatabase,
  record: {
    date: Date;
    assessmentScheduleId: number;
    measurmentIndex: number;
    value: AssessmentValue;
  },
): Promise<number> {
  const valueStr = strigifyAssessmentValue(record.value);

  const result = await db.runAsync(
    `INSERT INTO scheduled_measurment_records 
    (record_datetime, date, assessment_schedule, measurment_index, value) 
    VALUES (?, ?, ?, ?, ?)`,
    serializeRecordDatetime(new Date()),
    serializeDateOnly(record.date),
    record.assessmentScheduleId,
    record.measurmentIndex,
    valueStr,
  );
  return result.lastInsertRowId;
}

export async function dbDeleteScheduledMeasurmentRecord(
  db: SQLiteDatabase,
  id: number,
) {
  await db.runAsync(
    "DELETE FROM scheduled_measurment_records WHERE id = ?",
    id,
  );
}

export async function dbUpdateAssessment(
  db: SQLiteDatabase,
  assessment: {
    name: string;
    type: AssessmentType;
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
      SELECT id, name, type, value_domain
      FROM assessments
    `);
  return rows.map((row) => {
    const assessmentType = AssessmentType[row.type];
    const valueDomain = row.value_domain
      ? parseValueDomain(row.value_domain, assessmentType)
      : null;
    return new Assessment(row.name, assessmentType, valueDomain, row.id);
  });
}

export async function dbDeleteUnscheduledMeasurmentRecord(
  db: SQLiteDatabase,
  recordId: number,
) {
  await db.runAsync(
    "DELETE FROM unscheduled_measurment_records WHERE id = ?",
    recordId,
  );
}

async function dbInsertMeasurments(
  db: SQLiteDatabase,
  assessmentScheduleId: number,
  measurments: {
    index: number;
    offset: number | null;
    groupId: number | null;
  }[],
): Promise<number[]> {
  const ids = [];
  for (const m of measurments) {
    const result = await db.runAsync(
      `INSERT INTO measurments 
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
  assessment_schedule: {
    startDate: Date;
    endDate: Date | null;
    measurments: {
      index: number;
      offset: number | null;
      groupId: number | null;
    }[];
    freq: Frequency;
  },
) {
  const freqJson = JSON.stringify(assessment_schedule.freq);
  const startDateStr = serializeDateOnly(assessment_schedule.startDate);
  const endDateStr = serializeDateOnlyNullable(assessment_schedule.endDate);

  const result = await db.runAsync(
    `INSERT INTO assessment_schedules 
    (assessment, start_date, end_date, freq) 
    VALUES (?, ?, ?, ?)`,
    assessmentId,
    startDateStr,
    endDateStr,
    freqJson,
  );

  const assessmentScheduleId = result.lastInsertRowId;
  await dbInsertMeasurments(
    db,
    assessmentScheduleId,
    assessment_schedule.measurments,
  );
}

export async function dbInsertAssessmentScheduleWithAssessment(
  db: SQLiteDatabase,
  assessment: {
    name: string;
    type: AssessmentType;
    valueDomain: ValueDomain;
  },
  assessment_schedule: {
    startDate: Date;
    endDate: Date | null;
    measurments: {
      index: number;
      offset: number | null;
      groupId: number | null;
    }[];
    freq: Frequency;
  },
) {
  const assessmentId = await dbInsertAssessment(db, assessment);
  await dbInsertAssessmentSchedule(db, assessmentId, assessment_schedule);
}

async function dbGetMeasurments(
  db: SQLiteDatabase,
  assessmentScheduleId: number,
): Promise<MeasurmentRow[]> {
  return await db.getAllAsync<MeasurmentRow>(
    `SELECT * FROM measurments WHERE assessment_schedule = ?`,
    assessmentScheduleId,
  );
}

export async function dbGetAssessmentSchedules(
  db: SQLiteDatabase,
): Promise<AssessmentSchedule[]> {
  const rows = await db.getAllAsync<AssessmentScheduleWithAssessmentRow>(`
      SELECT
        s.id,
        s.assessment,
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
    row.measurments = await dbGetMeasurments(db, row.id);
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
        s.assessment,
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

  const measurmentsRows = await dbGetMeasurments(db, assessmentScheduleId);

  if (row === null) {
    throw Error("No schedule with given id.");
  }
  row.measurments = measurmentsRows;
  return parseAssessmentScheduleWithAssessmentRow(row);
}
