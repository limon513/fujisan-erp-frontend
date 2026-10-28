/** Parses CSV text (quoted fields, "" escapes, commas inside quotes, CRLF) into rows of strings. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((f) => f.trim() !== "")) rows.push(row.map((f) => f.trim()));
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row.map((f) => f.trim()));
  return rows;
}

/** "1,23,456.50", "(500.00)", "500 Dr", "−75" → number (NaN when not a number). */
export function parseAmount(value) {
  if (value == null) return NaN;
  let text = String(value)
    .trim()
    .replace(/[৳,\s]|BDT|Tk\.?/gi, "")
    .replace(/−/g, "-");
  let sign = 1;
  if (/^\(.*\)$/.test(text)) {
    sign = -1;
    text = text.slice(1, -1);
  }
  if (/dr$/i.test(text)) {
    sign = -1;
    text = text.slice(0, -2);
  } else if (/cr$/i.test(text)) text = text.slice(0, -2);
  if (text === "" || text === "-") return NaN;
  const n = Number(text);
  return Number.isFinite(n) ? sign * n : NaN;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n) => String(n).padStart(2, "0");

/** A statement date in the chosen format → "YYYY-MM-DD" (or null). */
export function parseDate(value, format) {
  const text = String(value ?? "").trim();
  let d;
  let m;
  let y;
  if (format === "YMD") [y, m, d] = text.split(/[-/.]/);
  else if (format === "MDY") [m, d, y] = text.split(/[-/.]/);
  else if (format === "DMONY") {
    const parts = text.split(/[-/ .]+/);
    [d, y] = [parts[0], parts[2]];
    m = MONTHS.indexOf(parts[1]?.slice(0, 3).toLowerCase()) + 1;
  } else [d, m, y] = text.split(/[-/.]/);
  const year = Number(y?.length === 2 ? `20${y}` : y);
  const month = Number(m);
  const day = Number(d);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}
