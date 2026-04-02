import { SQLiteDatabase } from "expo-sqlite";
import { Schedule, Dose } from "./MedicineSchedule";
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
  UnscheduledDosageRecord,
  UnscheduledMeasurmentRecord,
} from "./Records";
import {
  Assessment,
  AssessmentType,
  NumericValueDomain,
  TextValueDomain,
  ValueDomain,
} from "./AssessmentSchedule";

function extractDate(datetime: Date): string {
  return datetime.toISOString().split("T")[0];
}

interface ScheduleWithMedicineRow {
  id: number;
  medicine: number;
  medicine_name: string;
  medicine_base_unit: keyof typeof BaseUnit;
  medicine_active_ingredients: string;
  start_date: string;
  end_date: string | null;
  doses: DoseRow[];
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
  record_date: string;
  date: string;
  schedule: number;
  dose_index: number;
}

interface UncheduledDosageRecordRow {
  id: number;
  record_date: string;
  date: string;
  medicine: number;
  dose_amount: number;
  group_: number | null;
}

interface DoseRow {
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
  record_date: string;
  date: string;
  assessment: number;
  value: string;
  group_: number | null;
  assessment_type: AssessmentType;
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
  switch (assessmentType) {
    case AssessmentType.Numeric:
      return new NumericValueDomain(vdData.min, vdData.max);
    case AssessmentType.Text:
      return new TextValueDomain(vdData.max_characters);
    default:
      return null;
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
    default:
      return value;
  }
}

function getDateFilterClause(startDate?: Date, endDate?: Date): string {
  if (startDate && endDate) {
    const startDateStr = extractDate(startDate);
    const endDateStr = extractDate(endDate);
    return `
    WHERE date(date) >= '${startDateStr}'
    AND date(date) <= '${endDateStr}'`;
  } else if (startDate) {
    const startDateStr = extractDate(startDate);
    return `
    WHERE date(date) >= '${startDateStr}'`;
  } else if (endDate) {
    const endDateStr = extractDate(endDate);
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

function parseScheduleWithMedicineRow(row: ScheduleWithMedicineRow): Schedule {
  const active_ingredients = parseActiveIngredients(
    row.medicine_active_ingredients,
  );
  const medicineData = new Medicine(
    row.medicine_name,
    BaseUnit[row.medicine_base_unit],
    active_ingredients,
    row.medicine,
  );
  const doses = row.doses.map(
    (dd: DoseRow) =>
      new Dose(dd.amount, dd.index_, dd.offset, dd.group_, dd.id),
  );
  const freqData = JSON.parse(row.freq);
  const frequency = new Frequency(
    freqData.intervalUnit as IntervalUnit,
    freqData.intervalLength,
    freqData.numberOfDoses,
  );

  return new Schedule(
    medicineData,
    new Date(row.start_date),
    row.end_date ? new Date(row.end_date) : null,
    frequency,
    doses,
    row.id,
  );
}

export async function dbGetSchedule(
  db: SQLiteDatabase,
  scheduleId: number,
): Promise<Schedule> {
  const row = await db.getFirstAsync<ScheduleWithMedicineRow>(`
      SELECT
        s.id,
        s.medicine, 
        m.name as medicine_name,
        m.base_unit as medicine_base_unit,
        m.active_ingredients as medicine_active_ingredients,
        s.start_date,
        s.end_date,
        s.freq
      FROM schedules s
      JOIN medicines m ON s.medicine = m.id
      WHERE s.id = ${scheduleId}
      ORDER BY s.start_date DESC
    `);

  const dosesRows = await dbGetDoses(db, scheduleId);

  if (row === null) {
    throw Error("No schedule with given id.");
  }
  row.doses = dosesRows;
  return parseScheduleWithMedicineRow(row);
}

export async function dbGetSchedulesWithMedicines(
  db: SQLiteDatabase,
): Promise<Schedule[]> {
  const rows = await db.getAllAsync<ScheduleWithMedicineRow>(`
      SELECT
        s.id,
        s.medicine, 
        m.name as medicine_name,
        m.base_unit as medicine_base_unit,
        m.active_ingredients as medicine_active_ingredients,
        s.start_date,
        s.end_date,
        s.freq
      FROM schedules s
      JOIN medicines m ON s.medicine = m.id
      ORDER BY s.start_date DESC
    `);

  for (const row of rows) {
    row.doses = await dbGetDoses(db, row.id);
  }

  return rows.map(parseScheduleWithMedicineRow);
}

export async function dbInsertSchedule(
  db: SQLiteDatabase,
  medicineId: number,
  schedule: {
    startDate: Date;
    endDate: Date | null;
    doses: {
      amount: number;
      index: number;
      offset: number | null;
      groupId: number | null;
    }[];
    freq: Frequency;
  },
) {
  const freqJson = JSON.stringify(schedule.freq);
  const startDateStr = schedule.startDate.toISOString();
  const endDateStr = schedule.endDate ? schedule.endDate.toISOString() : null;

  const result = await db.runAsync(
    "INSERT INTO schedules (medicine, start_date, end_date, freq) VALUES (?, ?, ?, ?)",
    medicineId,
    startDateStr,
    endDateStr,
    freqJson,
  );
  const scheduleId = result.lastInsertRowId;
  await dbInsertDoses(db, scheduleId, schedule.doses);
}

export async function dbUpdateSchedule(
  db: SQLiteDatabase,
  schedule: {
    dbId: number;
    startDate: Date;
    endDate: Date | null;
  },
) {
  const startDateStr = schedule.startDate.toISOString();
  const endDateStr = schedule.endDate ? schedule.endDate.toISOString() : null;

  await db.runAsync(
    `UPDATE schedules
    SET start_date = ?, end_date = ?
    WHERE id = ?`,
    startDateStr,
    endDateStr,
    schedule.dbId,
  );
}

export async function dbInsertScheduleWithMedicine(
  db: SQLiteDatabase,
  medicine: {
    name: string;
    baseUnit: BaseUnit;
    activeIngredients: ActiveIngredient[];
  },
  schedule: {
    startDate: Date;
    endDate: Date | null;
    doses: {
      amount: number;
      index: number;
      offset: number | null;
      groupId: number | null;
    }[];
    freq: Frequency;
  },
) {
  const medicineId = await dbInsertMedicine(db, medicine);
  await dbInsertSchedule(db, medicineId, schedule);
}

export async function dbDeleteSchedule(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM doses WHERE schedule = ?", id);
  await db.runAsync("DELETE FROM schedules WHERE id = ?", id);
}

export async function dbInsertScheduledDosageRecord(
  db: SQLiteDatabase,
  record: { scheduleId: number; date: Date; doseIndex: number },
): Promise<number> {
  const result = await db.runAsync(
    "INSERT INTO scheduled_dosage_records (record_date, date, schedule, dose_index) VALUES (?, ?, ?, ?)",
    new Date().toISOString(),
    record.date.toISOString(),
    record.scheduleId,
    record.doseIndex,
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
  scheduleId: number,
) {
  await db.runAsync(
    "DELETE FROM scheduled_dosage_records WHERE schedule = ?",
    scheduleId,
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
        new Date(row.record_date),
        new Date(row.date),
        row.schedule,
        row.dose_index,
      ),
  );
}

export async function dbInsertUnscheduledDosageRecord(
  db: SQLiteDatabase,
  record: {
    date: Date;
    medicineId: number;
    doseAmount: number;
    group: number | null;
  },
): Promise<number> {
  const result = await db.runAsync(
    "INSERT INTO unscheduled_dosage_records (record_date, date, medicine, dose_amount, group_) VALUES (?, ?, ?, ?, ?)",
    new Date().toISOString(),
    extractDate(record.date),
    record.medicineId,
    record.doseAmount,
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
        new Date(row.record_date),
        new Date(row.date),
        row.medicine,
        row.dose_amount,
        row.group_,
      ),
  );
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

async function dbInsertDoses(
  db: SQLiteDatabase,
  scheduleId: number,
  doses: {
    amount: number;
    index: number;
    offset: number | null;
    groupId: number | null;
  }[],
): Promise<number[]> {
  const ids = [];
  for (const dose of doses) {
    const result = await db.runAsync(
      "INSERT INTO doses (amount, index_, offset, group_, schedule) VALUES (?, ?, ?, ?, ?)",
      dose.amount,
      dose.index,
      dose.offset,
      dose.groupId,
      scheduleId,
    );
    ids.push(result.lastInsertRowId);
  }
  return ids;
}

async function dbGetDoses(
  db: SQLiteDatabase,
  scheduleId: number,
): Promise<DoseRow[]> {
  return await db.getAllAsync<DoseRow>(
    `
    SELECT * FROM doses WHERE schedule = ?`,
    scheduleId,
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

export async function dbGroupHasDoses(
  db: SQLiteDatabase,
  groupId: number,
): Promise<boolean> {
  const resultDoses = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM doses WHERE group_ = ?",
    groupId,
  );
  const resultMeasurments = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM measurments WHERE group_ = ?",
    groupId,
  );
  return (resultDoses?.count ?? resultMeasurments?.count ?? 0) > 0;
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
  return (resultDosages?.count ?? resultMeasurments?.count ?? 0) > 0;
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

export async function dbInsertUnscheduledMeasurmentRecord(
  db: SQLiteDatabase,
  record: {
    date: Date;
    assessmentId: number;
    value: AssessmentValue;
    group: number | null;
  },
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO unscheduled_measurment_records 
    (record_date, date, assessment, value, group_) VALUES (?, ?, ?, ?, ?)`,
    new Date().toISOString(),
    extractDate(record.date),
    record.assessmentId,
    record.value.toString(),
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
      new Date(row.record_date),
      new Date(row.date),
      row.assessment,
      value,
      row.group_,
    );
  });
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
      ? null
      : parseValueDomain(row.value_domain, assessmentType);
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

export async function dbInsertAssessmentSchedule(
  db: SQLiteDatabase,
  assessmentId: number,
  schedule: {
    startDate: Date;
    endDate: Date | null;
    freq: Frequency;
  },
) {
  const freqJson = JSON.stringify(schedule.freq);
  const startDateStr = schedule.startDate.toISOString();
  const endDateStr = schedule.endDate ? schedule.endDate.toISOString() : null;

  await db.runAsync(
    "INSERT INTO assessment_schedules (assessment, start_date, end_date, freq) VALUES (?, ?, ?, ?)",
    assessmentId,
    startDateStr,
    endDateStr,
    freqJson,
  );
}

export async function dbInsertAssessmentScheduleWithMedicine(
  db: SQLiteDatabase,
  assessment: {
    name: string;
    type: AssessmentType;
    valueDomain: ValueDomain;
  },
  schedule: {
    startDate: Date;
    endDate: Date | null;
    freq: Frequency;
  },
) {
  const assessmentId = await dbInsertAssessment(db, assessment);
  await dbInsertAssessmentSchedule(db, assessmentId, schedule);
}
