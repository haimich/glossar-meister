export type CsvRow = { de: string; ro: string; notes: string };

function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

/**
 * Erwartet Spalten: Deutsch, Rumänisch, Notizen (optional).
 * Trennzeichen wird automatisch erkannt (Komma, Semikolon, Tab).
 */
export function parseCsv(text: string): CsvRow[] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const first = lines[0] ?? "";
  const delimiter =
    [";", "\t", ","]
      .map((d) => ({ d, count: first.split(d).length }))
      .sort((a, b) => b.count - a.count)[0]?.d ?? ",";

  const rows = lines.map((l) => splitLine(l, delimiter));
  const head = (rows[0] ?? []).map((h) => h.toLowerCase());
  const looksLikeHeader =
    head.some((h) => h.startsWith("deutsch") || h === "de") &&
    head.some((h) => h.startsWith("rum") || h === "ro");

  const body = looksLikeHeader ? rows.slice(1) : rows;

  return body
    .map((cells) => ({
      de: cells[0] ?? "",
      ro: cells[1] ?? "",
      notes: cells[2] ?? "",
    }))
    .filter((r) => r.de.length > 0 && r.ro.length > 0);
}
