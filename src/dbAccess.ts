import { SQLiteDatabase } from "expo-sqlite";
import { Schedule, Frequency, IntervalUnit } from "./models/Schedule";
import { BaseUnit, Medicine } from "./models/Medicine";

interface ScheduleRow {
  id: number;
  medicine: number;
  medicine_name: string;
  medicine_base_unit: keyof typeof BaseUnit;
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

export async function dbGetMedicines(db: SQLiteDatabase): Promise<Medicine[]> {
  const rows = await db.getAllAsync<MedicineRow>(`
      SELECT id, name, base_unit, active_ingredients
      FROM medicines
    `);

  return rows.map((row) => {
    const active_ingredients = JSON.parse(row.active_ingredients);
    return new Medicine(
      row.name,
      BaseUnit[row.base_unit],
      active_ingredients,
      row.id,
    );
  });
}

export async function dbGetSchedules(db: SQLiteDatabase): Promise<Schedule[]> {
  const rows = await db.getAllAsync<ScheduleRow>(`
      SELECT s.id, s.medicine, m.name as medicine_name, m.base_unit as medicine_base_unit, s.start_date, s.end_date, s.doses, s.freq
      FROM schedules s
      JOIN medicines m ON s.medicine = m.id
      ORDER BY s.start_date DESC
    `);

  return rows.map((row) => {
    const medicineData = new Medicine(
      row.medicine_name,
      BaseUnit[row.medicine_base_unit],
      [],
      row.medicine,
    );
    const doses: number[] = JSON.parse(row.doses);
    const freqData = JSON.parse(row.freq);
    const frequency = new Frequency(
      freqData.intervalUnit as IntervalUnit,
      freqData.intervalLength,
      freqData.numberOfDoses,
      freqData.dosesOffsests,
    );

    return new Schedule(
      medicineData,
      new Date(row.start_date),
      row.end_date ? new Date(row.end_date) : (null as any),
      doses,
      frequency,
      row.id,
    );
  });
}
