import type { SQLiteDatabase } from "expo-sqlite";

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 1;

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
    db.withTransactionAsync(async () => {
      await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      CREATE TABLE medicines (id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      base_unit TEXT NOT NULL,
      active_ingredients TEXT NOT NULL );

      CREATE TABLE schedules (
      id INTEGER PRIMARY KEY NOT NULL,
      medicine INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT,
      doses TEXT NOT NULL,
      freq TEXT NOT NULL,
      FOREIGN KEY(medicine) REFERENCES medicines(id));

      CREATE TABLE dosage_records (
      id INTEGER PRIMARY KEY NOT NULL,
      schedule INTEGER,
      dose_index INTEGER,
      date TEXT,
      FOREIGN KEY(schedule) REFERENCES schedules(id));
    `);
    });
    currentDbVersion = 1;
  }
  // if (currentDbVersion === 1) {
  //   Add more migrations
  // }
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
