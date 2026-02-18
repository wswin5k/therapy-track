import { SQLiteDatabase } from "expo-sqlite";
import { Schedule, Frequency, IntervalUnit, Dose, Group } from "./Schedule";
import {
  ActiveIngredient,
  BaseUnit,
  IngredientAmountUnit,
  Medicine,
  strKeyOfBaseUnit,
} from "./Medicine";
import { ScheduledDosageRecord, UnscheduledDosageRecord } from "./DosageRecord";

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
  doses: string;
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
  group_: number;
}

interface GroupRow {
  id: number;
  name: string;
  color: string;
  is_reminder_on: number;
  reminder_time: string | null;
}

function parseActiveIngredients(json: string) {
  const aiData = JSON.parse(json);
  return aiData.map(
    (ai: { name: string; amount: number; unit: string }) =>
      new ActiveIngredient(ai.name, ai.amount, ai.unit as IngredientAmountUnit),
  );
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
  const dosesData = JSON.parse(row.doses);
  const doses = dosesData.map(
    (dd: {
      amount: number;
      index: number;
      offset: number;
      group: {
        dbId: number;
        name: string;
        color: string;
        isReminderOn: boolean;
        reminderTime: string | null;
      } | null;
    }) => {
      const group = dd.group
        ? new Group(
            dd.group.name,
            dd.group.color,
            dd.group.isReminderOn,
            dd.group.reminderTime,
            dd.group.dbId,
          )
        : null;
      return new Dose(dd.amount, dd.index, dd.offset, group);
    },
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
    row.end_date ? new Date(row.end_date) : (null as any),
    frequency,
    doses,
    row.id,
  );
}

export async function dbGetScheduleWithMedicine(
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
        s.doses,
        s.freq
      FROM schedules s
      JOIN medicines m ON s.medicine = m.id
      WHERE s.id = ${scheduleId}
      ORDER BY s.start_date DESC
    `);

  if (row === null) {
    throw Error("No schedule with given id.");
  }
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
        s.doses,
        s.freq
      FROM schedules s
      JOIN medicines m ON s.medicine = m.id
      ORDER BY s.start_date DESC
    `);

  return rows.map(parseScheduleWithMedicineRow);
}

export async function dbInsertSchedule(
  db: SQLiteDatabase,
  medicineId: number,
  schedule: {
    startDate: Date;
    endDate: Date | null;
    doses: Dose[];
    freq: Frequency;
  },
) {
  const dosesJson = JSON.stringify(schedule.doses);
  const freqJson = JSON.stringify(schedule.freq);
  const startDateStr = schedule.startDate.toISOString();
  const endDateStr = schedule.endDate ? schedule.endDate.toISOString() : null;

  await db.runAsync(
    "INSERT INTO schedules (medicine, start_date, end_date, doses, freq) VALUES (?, ?, ?, ?, ?)",
    medicineId,
    startDateStr,
    endDateStr,
    dosesJson,
    freqJson,
  );
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
    doses: Dose[];
    freq: Frequency;
  },
) {
  const medicineId = await dbInsertMedicine(db, medicine);
  await dbInsertSchedule(db, medicineId, schedule);
}

export async function dbDeleteSchedule(db: SQLiteDatabase, id: number) {
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
  if (startDate && endDate) {
    const startDateStr = extractDate(startDate);
    const endDateStr = extractDate(endDate);
    queryStr =
      queryStr +
      `
    WHERE date(date) >= '${startDateStr}'
    AND date(date) <= '${endDateStr}'`;
  } else if (startDate) {
    const startDateStr = extractDate(startDate);
    queryStr =
      queryStr +
      `
    WHERE date(date) >= '${startDateStr}'`;
  } else if (endDate) {
    const endDateStr = extractDate(endDate);
    queryStr =
      queryStr +
      `
    WHERE date(date) <= '${endDateStr}'`;
  }

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
  intakeRecordId: number,
) {
  await db.runAsync(
    "DELETE FROM unscheduled_dosage_records WHERE id = ?",
    intakeRecordId,
  );
}

export async function dbGetUnscheduledDosageRecords(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<UnscheduledDosageRecord[]> {
  let queryStr = "SELECT * FROM unscheduled_dosage_records ";
  if (startDate && endDate) {
    const startDateStr = extractDate(startDate);
    const endDateStr = extractDate(endDate);
    queryStr =
      queryStr +
      `
    WHERE date(date) >= '${startDateStr}'
    AND date(date) <= '${endDateStr}'`;
  } else if (startDate) {
    const startDateStr = extractDate(startDate);
    queryStr =
      queryStr +
      `
    WHERE date(date) >= '${startDateStr}'`;
  } else if (endDate) {
    const endDateStr = extractDate(endDate);
    queryStr =
      queryStr +
      `
    WHERE date(date) <= '${endDateStr}'`;
  }

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
