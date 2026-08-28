import type { SQLiteDatabase } from "expo-sqlite";

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 2;

  const pragma_user_version = await db.getFirstAsync<{
    user_version: number;
  }>("PRAGMA user_version");

  if (!pragma_user_version) {
    throw Error("Invalid database file.");
  }

  let currentDbVersion = pragma_user_version.user_version;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }
  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      CREATE TABLE medicines (id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      base_unit TEXT NOT NULL,
      active_ingredients TEXT NOT NULL );

      CREATE TABLE dosages (id INTEGER PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      index_ INTEGER NOT NULL,
      offset INTEGER,
      group_ INTEGER,
      medicine_schedule INTEGER,
      FOREIGN KEY(group_) REFERENCES groups(id),
      FOREIGN KEY(medicine_schedule) REFERENCES medicine_schedules(id));

      CREATE TABLE medicine_schedules (
      id INTEGER PRIMARY KEY NOT NULL,
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

      INSERT INTO groups (name, color) VALUES ("Morning", "#ffff64ff");
      INSERT INTO groups (name, color) VALUES ("Afternoon", "#30c82dff");
      INSERT INTO groups (name, color) VALUES ("Evening", "#2f39c9ff");

      CREATE TABLE assessments (id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      value_domain TEXT );

      CREATE TABLE measurments (id INTEGER PRIMARY KEY NOT NULL,
      index_ INTEGER NOT NULL,
      offset INTEGER,
      group_ INTEGER,
      assessment_schedule INTEGER,
      FOREIGN KEY(group_) REFERENCES groups(id),
      FOREIGN KEY(assessment_schedule) REFERENCES assessment_schedules(id));

      CREATE TABLE assessment_schedules (
      id INTEGER PRIMARY KEY NOT NULL,
      assessment INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT,
      freq TEXT NOT NULL,
      FOREIGN KEY(assessment) REFERENCES assessments(id) ON DELETE CASCADE);
    
      CREATE TABLE scheduled_measurment_records (
      id INTEGER PRIMARY KEY NOT NULL,
      record_datetime TEXT NOT NULL,
      date TEXT NOT NULL,
      assessment_schedule INTEGER,
      measurment_index INTEGER,
      value TEXT NOT NULL,
      FOREIGN KEY(assessment_schedule) REFERENCES assessment_schedules(id));

      CREATE TABLE unscheduled_measurment_records (
      id INTEGER PRIMARY KEY NOT NULL,
      record_datetime TEXT NOT NULL,
      date TEXT NOT NULL,
      assessment INTEGER NOT NULL,
      value TEXT NOT NULL,
      group_ INTEGER,
      FOREIGN KEY(group_) REFERENCES groups(id),
      FOREIGN KEY(assessment) REFERENCES assessments(id));
    `);
    currentDbVersion = 1;
  }
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export const DATABASE_NAME: string = "main.db";
