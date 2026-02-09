import { SQLiteDatabase } from "expo-sqlite";
import { Schedule, Frequency, IntervalUnit, Dose } from "./Schedule";
import {
  ActiveIngredient,
  BaseUnit,
  IngredientAmountUnit,
  Medicine,
  strKeyOfBaseUnit,
} from "./Medicine";
import { DosageRecord } from "./DosageRecord";

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

interface DosageRecordRow {
  id: number;
  schedule: number;
  date: string;
  dose_index: number;
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

export async function dbInsertDosageRecord(
  db: SQLiteDatabase,
  intakeRecord: { scheduleId: number; date: Date; doseIndex: number },
): Promise<number> {
  const result = await db.runAsync(
    "INSERT INTO dosage_records (schedule, date, dose_index) VALUES (?, ?, ?)",
    intakeRecord.scheduleId,
    intakeRecord.date.toISOString(),
    intakeRecord.doseIndex,
  );
  return result.lastInsertRowId;
}

export async function dbDeleteDosageRecord(
  db: SQLiteDatabase,
  intakeRecordId: number,
) {
  await db.runAsync("DELETE FROM dosage_records WHERE id = ?", intakeRecordId);
}

export async function dbGetDosageRecord(
  db: SQLiteDatabase,
  startDate?: Date,
  endDate?: Date,
): Promise<DosageRecord[]> {
  let queryStr = "SELECT * FROM dosage_records ";
  if (startDate && endDate) {
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    queryStr = `SELECT * FROM dosage_records
    WHERE date >= date('${startDateStr}')
    AND date <= date('${endDateStr}')`;
  } else if (startDate) {
    const startDateStr = startDate.toISOString();
    queryStr = `SELECT * FROM dosage_records
    WHERE date >= date('${startDateStr}')`;
  } else if (endDate) {
    const endDateStr = endDate.toISOString();
    queryStr = `SELECT * FROM dosage_records
    WHERE date <= date('${endDateStr}')`;
  }
  const rows = await db.getAllAsync<DosageRecordRow>(queryStr);
  return rows.map(
    (row) =>
      new DosageRecord(
        new Date(row.date),
        row.dose_index,
        row.id,
        row.schedule,
      ),
  );
}
