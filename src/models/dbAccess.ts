import { SQLiteDatabase } from "expo-sqlite";
import { Schedule, Frequency, IntervalUnit, Dose } from "./Schedule";
import {
  ActiveIngredient,
  BaseUnit,
  IngredientAmountUnit,
  Medicine,
  strKeyOfBaseUnit,
} from "./Medicine";
import { ScheduledDosageRecord, UnscheduledDosageRecord } from "./DosageRecord";

function extarctDate(datetime: Date): string {
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
}

function parseActiveIngredients(json: string) {
  const aiData = JSON.parse(json);
  return aiData.map(
    (ai: { name: string; amount: number; unit: string }) =>
      new ActiveIngredient(ai.name, ai.amount, ai.unit as IngredientAmountUnit),
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

  return rows.map((row) => {
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
      (dd: { amount: number; index: number; offset: number }) =>
        new Dose(dd.amount, dd.index, dd.offset),
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
  });
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
  const activeIngredientsStr = JSON.stringify(medicine.activeIngredients);
  const db_insert1 = await db.runAsync(
    "INSERT INTO medicines (name, base_unit, active_ingredients) VALUES (?, ?, ?)",
    medicine.name,
    strKeyOfBaseUnit(medicine.baseUnit),
    activeIngredientsStr,
  );

  const dosesJson = JSON.stringify(schedule.doses);
  const freqJson = JSON.stringify(schedule.freq);
  const startDateStr = schedule.startDate.toISOString();
  const endDateStr = schedule.endDate ? schedule.endDate.toISOString() : null;

  await db.runAsync(
    "INSERT INTO schedules (medicine, start_date, end_date, doses, freq) VALUES (?, ?, ?, ?, ?)",
    db_insert1.lastInsertRowId,
    startDateStr,
    endDateStr,
    dosesJson,
    freqJson,
  );
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

export async function dbGetScheduledDosageRecords(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<ScheduledDosageRecord[]> {
  let queryStr = "SELECT * FROM scheduled_dosage_records ";
  if (startDate && endDate) {
    const startDateStr = extarctDate(startDate);
    const endDateStr = extarctDate(endDate);
    queryStr =
      queryStr +
      `
    WHERE date >= date('${startDateStr}')
    AND date <= date('${endDateStr}')`;
  } else if (startDate) {
    const startDateStr = extarctDate(startDate);
    queryStr =
      queryStr +
      `
    WHERE date >= date('${startDateStr}')`;
  } else if (endDate) {
    const endDateStr = extarctDate(endDate);
    queryStr =
      queryStr +
      `
    WHERE date <= date('${endDateStr}')`;
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
  record: { date: Date; medicineId: number; doseAmount: number },
): Promise<number> {
  console.log(record);
  const result = await db.runAsync(
    "INSERT INTO unscheduled_dosage_records (record_date, date, medicine, dose_amount) VALUES (?, ?, ?, ?)",
    new Date().toISOString(),
    extarctDate(record.date),
    record.medicineId,
    record.doseAmount,
  );
  console.log(result.lastInsertRowId);
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
  let whereClause = "";
  if (startDate && endDate) {
    const startDateStr = extarctDate(startDate);
    const endDateStr = extarctDate(endDate);
    whereClause = `
    WHERE date >= date('${startDateStr}')
    AND date <= date('${endDateStr}')`;
  } else if (startDate) {
    const startDateStr = extarctDate(startDate);
    whereClause = `
    WHERE date >= date('${startDateStr}')`;
  } else if (endDate) {
    const endDateStr = extarctDate(endDate);
    whereClause = `
    WHERE date <= date('${endDateStr}')`;
  }
  queryStr = `SELECT * FROM unscheduled_dosage_records
      ${whereClause}
      ORDER BY record_date ASC
  `;
  console.log(queryStr);

  const rows = await db.getAllAsync<UncheduledDosageRecordRow>(queryStr);
  console.log(rows);
  return rows.map(
    (row) =>
      new UnscheduledDosageRecord(
        row.id,
        new Date(row.record_date),
        new Date(row.date),
        row.medicine,
        row.dose_amount,
      ),
  );
}
