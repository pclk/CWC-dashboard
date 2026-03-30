import { cadetSchema } from "@/lib/validators/cadet";

export type ParsedCadetCsvRow = {
  rank: string;
  displayName: string;
  serviceNumber?: string;
  active: boolean;
  sortOrder: number;
  notes?: string;
  lineNumber: number;
};

const HEADER_ALIASES: Record<string, "rank" | "displayName" | "serviceNumber" | "active" | "sortOrder" | "notes"> = {
  rank: "rank",
  displayname: "displayName",
  name: "displayName",
  servicenumber: "serviceNumber",
  serviceno: "serviceNumber",
  svcnumber: "serviceNumber",
  svcno: "serviceNumber",
  active: "active",
  status: "active",
  sortorder: "sortOrder",
  order: "sortOrder",
  notes: "notes",
  note: "notes",
  remarks: "notes",
  remark: "notes",
};

export function parseCadetCsv(csvText: string): ParsedCadetCsvRow[] {
  const rows = parseCsvRows(csvText);

  if (rows.length === 0) {
    throw new Error("The CSV file is empty.");
  }

  const headerIndexes = getHeaderIndexes(rows[0] ?? []);

  if (headerIndexes.displayName === undefined) {
    throw new Error('The CSV file must include a "displayName" or "name" column.');
  }

  const parsedRows: ParsedCadetCsvRow[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const lineNumber = rowIndex + 1;

    if (row.every((cell) => cell.trim() === "")) {
      continue;
    }

    const rawRank = getCell(row, headerIndexes.rank);
    const rawDisplayName = getCell(row, headerIndexes.displayName);
    const rawServiceNumber = getCell(row, headerIndexes.serviceNumber);
    const rawActive = getCell(row, headerIndexes.active);
    const rawSortOrder = getCell(row, headerIndexes.sortOrder);
    const rawNotes = getCell(row, headerIndexes.notes);

    const parsed = cadetSchema.safeParse({
      rank: rawRank || "ME4T",
      displayName: rawDisplayName,
      serviceNumber: rawServiceNumber,
      active: parseActiveValue(rawActive, lineNumber),
      sortOrder: parseSortOrderValue(rawSortOrder, lineNumber),
      notes: rawNotes,
    });

    if (!parsed.success) {
      throw new Error(`Line ${lineNumber}: ${parsed.error.issues[0]?.message ?? "Invalid cadet row."}`);
    }

    parsedRows.push({
      ...parsed.data,
      lineNumber,
    });
  }

  return parsedRows;
}

function getHeaderIndexes(headers: string[]) {
  const indexes: Partial<Record<"rank" | "displayName" | "serviceNumber" | "active" | "sortOrder" | "notes", number>> = {};

  headers.forEach((header, index) => {
    const canonicalKey = HEADER_ALIASES[normalizeHeader(header)];

    if (!canonicalKey) {
      return;
    }

    if (indexes[canonicalKey] !== undefined) {
      throw new Error(`Duplicate "${canonicalKey}" column found in the CSV header.`);
    }

    indexes[canonicalKey] = index;
  });

  return indexes;
}

function getCell(row: string[], index: number | undefined) {
  if (index === undefined) {
    return "";
  }

  return (row[index] ?? "").trim();
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseActiveValue(value: string, lineNumber: number) {
  if (value === "") {
    return true;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "y", "active"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "inactive"].includes(normalized)) {
    return false;
  }

  throw new Error(`Line ${lineNumber}: active/status must be one of true, false, active, or inactive.`);
}

function parseSortOrderValue(value: string, lineNumber: number) {
  if (value === "") {
    return 0;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new Error(`Line ${lineNumber}: sortOrder must be a whole number.`);
  }

  return parsed;
}

function parseCsvRows(csvText: string) {
  const normalized = csvText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    const nextCharacter = normalized[index + 1];

    if (inQuotes) {
      if (character === '"') {
        if (nextCharacter === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += character;
      }

      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (character === "\n") {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  if (inQuotes) {
    throw new Error("The CSV file has an unterminated quoted value.");
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}
