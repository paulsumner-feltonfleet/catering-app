/**
 * One-off script: read the existing weekly spreadsheet (22.4.26.xlsx)
 * and produce a JSON seed file of stock items grouped by category +
 * subcategory. Output: scripts/seed/items.json
 *
 * Run: npm run import-spreadsheet
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX: typeof import("xlsx") = require("xlsx");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const XLSX_PATH = resolve(ROOT, "22.4.26.xlsx");
const OUT_PATH = resolve(ROOT, "scripts/seed/items.json");

// Sheet name → display category name
const SHEET_TO_CATEGORY: Record<string, string> = {
  Dry_Stores: "Dry Stores",
  Pastry: "Pastry",
  FOH: "FOH",
  Fish: "Fish",
  Bakery: "Bakery",
  Meat: "Meat",
  Frozen: "Frozen",
  Dairy: "Dairy",
  "Fruit_&_Veg": "Fruit & Veg",
  Retail: "Retail",
  Cleaning: "Cleaning",
  Disposables: "Disposables",
};

// Header / title strings to skip outright
const SKIP_NAMES = new Set(
  [
    "ITEM",
    "Item",
    "item",
    "holroyd howe",
    "Holroyd Howe",
    "HOLROYD HOWE",
    ...Object.values(SHEET_TO_CATEGORY).flatMap((c) => [
      c.toUpperCase(),
      c.toLowerCase(),
      c,
    ]),
    ...Object.keys(SHEET_TO_CATEGORY).flatMap((s) => [
      s,
      s.toUpperCase(),
      s.replace(/_/g, " "),
      s.replace(/_/g, " ").toUpperCase(),
    ]),
  ].map((s) => s.trim()),
);

type SeedItem = {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  category: string;
  subcategory?: string;
  code?: string;
  sortOrder: number;
  archived: boolean;
};

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function readCell(
  ws: import("xlsx").WorkSheet,
  r: number,
  c: number,
): { v: unknown; t?: string } | undefined {
  return ws[XLSX.utils.encode_cell({ r, c })] as
    | { v: unknown; t?: string }
    | undefined;
}

function asString(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function importSheet(
  ws: import("xlsx").WorkSheet,
  sheetName: string,
  category: string,
  startSortOrder: number,
): SeedItem[] {
  const items: SeedItem[] = [];
  const range = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : null;
  if (!range) return items;

  // Cleaning & Disposables use a 4-col layout:
  //   A: Item | B: Code | C: Pack Size | D: Price | E: Quantity | F: Stock Value
  // Fruit & Veg uses a similar 4-col layout (price in D, unit in C, alt unit in B)
  // All other food sheets use the standard 3-col layout:
  //   A: Item | B: Unit | C: Price | D: Quantity | E: Total
  const altLayout =
    sheetName === "Cleaning" ||
    sheetName === "Disposables" ||
    sheetName === "Fruit_&_Veg";
  const hasCode = sheetName === "Cleaning" || sheetName === "Disposables";
  const colCode = hasCode ? 1 : -1;
  const colUnit = altLayout ? 2 : 1;
  const colPrice = altLayout ? 3 : 2;

  let currentSubcategory: string | undefined;
  let sortOrder = startSortOrder;
  const seenIds = new Set<string>();

  for (let r = range.s.r; r <= range.e.r; r++) {
    const nameRaw = asString(readCell(ws, r, 0)?.v);
    if (!nameRaw) continue;
    if (SKIP_NAMES.has(nameRaw)) continue;

    const unitRaw = asString(readCell(ws, r, colUnit)?.v);
    const priceCell = readCell(ws, r, colPrice);
    const price = asNumber(priceCell?.v);
    const codeRaw = colCode >= 0 ? asString(readCell(ws, r, colCode)?.v) : "";

    if (price == null) {
      // Subcategory header — treat as an in-sheet grouping label
      currentSubcategory = nameRaw;
      continue;
    }

    // Round to 2dp to clean up division formulas like =49.02/8
    const unitPrice = Math.round(price * 100) / 100;

    let baseId = `${slug(category)}-${slug(nameRaw)}`;
    let id = baseId;
    let suffix = 2;
    while (seenIds.has(id)) {
      id = `${baseId}-${suffix++}`;
    }
    seenIds.add(id);

    items.push({
      id,
      name: nameRaw,
      unit: unitRaw || "each",
      unitPrice,
      category,
      subcategory: currentSubcategory,
      code: codeRaw || undefined,
      sortOrder: ++sortOrder,
      archived: false,
    });
  }

  return items;
}

function main() {
  console.log(`Reading ${XLSX_PATH}`);
  const wb = XLSX.readFile(XLSX_PATH);
  const all: SeedItem[] = [];
  let sortOrder = 0;

  for (const [sheetName, category] of Object.entries(SHEET_TO_CATEGORY)) {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      console.warn(`  ! sheet missing: ${sheetName}`);
      continue;
    }
    const before = all.length;
    const items = importSheet(ws, sheetName, category, sortOrder);
    sortOrder += items.length;
    all.push(...items);
    console.log(`  ${category.padEnd(14)} ${all.length - before} items`);
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(all, null, 2));
  console.log(`\nWrote ${all.length} items → ${OUT_PATH}`);
}

main();
