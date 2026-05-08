const fs = require("fs");
const path = require("path");

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function readCsvTable(csvPath) {
  if (!csvPath || typeof csvPath !== "string") {
    return [];
  }

  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    return [];
  }

  const raw = fs.readFileSync(resolvedPath, "utf8");
  if (!raw.trim()) return [];

  const lines = raw
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length <= 1) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => String(header || "").trim());
  if (headers.length === 0) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    for (let i = 0; i < headers.length; i += 1) {
      row[headers[i]] = cells[i] === undefined ? "" : cells[i];
    }
    return row;
  });
}

module.exports = {
  readCsvTable,
  parseCsvLine,
};
