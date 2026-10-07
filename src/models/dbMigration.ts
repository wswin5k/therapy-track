import type { SQLiteDatabase } from "expo-sqlite";

export const APP_DATABASE_VERSION = 1;

export async function getDbVersion(db: SQLiteDatabase) {
  const pragma_user_version = await db.getFirstAsync<{
    user_version: number;
  }>("PRAGMA user_version");

  if (!pragma_user_version) {
    throw Error("Invalid database file.");
  }

  return pragma_user_version.user_version;
}

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  let currentDbVersion = await getDbVersion(db);

  if (currentDbVersion >= APP_DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      CREATE TABLE medicines (
      id INTEGER PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL,
      name TEXT NOT NULL,
      base_unit TEXT NOT NULL,
      active_ingredients TEXT NOT NULL);

      CREATE TABLE dosages (id INTEGER PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      index_ INTEGER NOT NULL,
      offset INTEGER NOT NULL,
      group_ INTEGER,
      medicine_schedule INTEGER,
      FOREIGN KEY(group_) REFERENCES groups(id),
      FOREIGN KEY(medicine_schedule) REFERENCES medicine_schedules(id));

      CREATE TABLE medicine_schedules (
      id INTEGER PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL,
      medicine INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT,
      freq TEXT NOT NULL,
      FOREIGN KEY(medicine) REFERENCES medicines(id) ON DELETE CASCADE);

      CREATE TABLE scheduled_dosage_records (
      id INTEGER PRIMARY KEY NOT NULL,
      record_datetime TEXT NOT NULL,
      date TEXT NOT NULL,
      medicine_schedule INTEGER,
      dosage_index INTEGER,
      FOREIGN KEY(medicine_schedule) REFERENCES medicine_schedules(id));

      CREATE TABLE groups (
      id INTEGER PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      is_reminder_on BOOLEAN NOT NULL DEFAULT FALSE,
      reminder_time TEXT DEFAULT NULL);

      CREATE TABLE unscheduled_dosage_records (
      id INTEGER PRIMARY KEY NOT NULL,
      record_datetime TEXT NOT NULL,
      date TEXT NOT NULL,
      medicine INTEGER NOT NULL,
      dosage_amount REAL NOT NULL,
      group_ INTEGER,
      FOREIGN KEY(group_) REFERENCES groups(id),
      FOREIGN KEY(medicine) REFERENCES medicines(id));

      INSERT INTO groups (name, created_at, color) VALUES ("Morning", "2026-01-01T00:00:00.000Z", "#ffff64ff");
      INSERT INTO groups (name, created_at, color) VALUES ("Afternoon", "2026-01-01T00:00:00.000Z", "#30c82dff");
      INSERT INTO groups (name, cteated_at, color) VALUES ("Evening", "2026-01-01T00:00:00.000Z", "#2f39c9ff");

      CREATE TABLE assessments (
      id INTEGER PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      value_domain TEXT);

      CREATE TABLE measurements (id INTEGER PRIMARY KEY NOT NULL,
      index_ INTEGER NOT NULL,
      offset INTEGER NOT NULL,
      group_ INTEGER,
      assessment_schedule INTEGER,
      FOREIGN KEY(group_) REFERENCES groups(id),
      FOREIGN KEY(assessment_schedule) REFERENCES assessment_schedules(id));

      CREATE TABLE assessment_schedules (
      id INTEGER PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL,
      assessment INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT,
      freq TEXT NOT NULL,
      FOREIGN KEY(assessment) REFERENCES assessments(id) ON DELETE CASCADE);
    
      CREATE TABLE scheduled_measurement_records (
      id INTEGER PRIMARY KEY NOT NULL,
      record_datetime TEXT NOT NULL,
      date TEXT NOT NULL,
      assessment_schedule INTEGER,
      measurement_index INTEGER,
      value TEXT NOT NULL,
      FOREIGN KEY(assessment_schedule) REFERENCES assessment_schedules(id));

      CREATE TABLE unscheduled_measurement_records (
      id INTEGER PRIMARY KEY NOT NULL,
      record_datetime TEXT NOT NULL,
      date TEXT NOT NULL,
      assessment INTEGER NOT NULL,
      value TEXT NOT NULL,
      group_ INTEGER,
      FOREIGN KEY(group_) REFERENCES groups(id),
      FOREIGN KEY(assessment) REFERENCES assessments(id));

      CREATE TABLE settings (
      id INTEGER PRIMARY KEY NOT NULL,
      theme TEXT NOT NULL);

      INSERT INTO settings (id, theme) VALUES (1, "Auto");

      CREATE TABLE history_table_settings (
      id INTEGER PRIMARY KEY NOT NULL,
      expand_all_rows BOOLEAN NOT NULL,
      show_days_without_entries BOOLEAN NOT NULL,
      merge_ingredients_with_different_forms BOOLEAN NOT NULL,
      column_widths TEXT NOT NULL
      );

      INSERT INTO history_table_settings 
      (id, 
      expand_all_rows, 
      show_days_without_entries, 
      merge_ingredients_with_different_forms,
      column_widths) 
      VALUES (1, 1, 0, 1, "{}");
      `);
    currentDbVersion = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${APP_DATABASE_VERSION}`);
}

export const DATABASE_NAME: string = "main";
export const DATABASE_NAME_WITH_EXT: string = `${DATABASE_NAME}.db`;
