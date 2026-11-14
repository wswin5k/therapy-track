import { serializeDateOnly } from "../../../dateOnlyUtils";

function escapeCSVField(field: string): string {
  if (
    field.includes(",") ||
    field.includes('"') ||
    field.includes("\n") ||
    field.includes("\r")
  ) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function generateCSV(
  headers: string[],
  rowHeaders: Date[],
  records: string[][],
): string {
  const csvRows: string[] = [];

  csvRows.push(["Date", ...headers].map(escapeCSVField).join(","));

  for (const [idx, record] of records.entries()) {
    csvRows.push(
      [serializeDateOnly(rowHeaders[idx]), ...record]
        .map(escapeCSVField)
        .join(","),
    );
  }

  return csvRows.join("\n");
}
