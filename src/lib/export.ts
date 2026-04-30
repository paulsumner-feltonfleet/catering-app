import * as XLSX from "xlsx";
import { CATEGORY_ORDER, type Week } from "../types";
import { formatDate, isoToDate } from "./utils";

type Row = (string | number)[];

const GBP_FORMAT = "[$£-809]#,##0.00";

export function exportWeekToXlsx(week: Week, fileName?: string): void {
  const wb = XLSX.utils.book_new();
  const dateStr = formatDate(isoToDate(week.id));

  const catTotals: Record<string, number> = {};
  let grandTotal = 0;
  for (const e of Object.values(week.entries)) {
    const t = e.quantity * e.unitPrice;
    catTotals[e.category] = (catTotals[e.category] ?? 0) + t;
    grandTotal += t;
  }

  // Summary sheet
  const summaryRows: Row[] = [
    ["Catering — Weekly Order"],
    [`Week ending: ${dateStr}`],
    [],
    ["Category", "Total"],
    ...CATEGORY_ORDER.filter((c) => (catTotals[c] ?? 0) > 0).map(
      (c) => [c, catTotals[c]!] as Row,
    ),
    [],
    ["GRAND TOTAL", grandTotal],
  ];
  const summary = XLSX.utils.aoa_to_sheet(summaryRows);
  summary["!cols"] = [{ wch: 22 }, { wch: 14 }];
  applyCurrencyToColumn(summary, 1, summaryRows);
  XLSX.utils.book_append_sheet(wb, summary, "Summary");

  // One sheet per category that has at least one entry
  for (const category of CATEGORY_ORDER) {
    const entries = Object.entries(week.entries)
      .filter(([_, e]) => e.category === category)
      .sort((a, b) => a[1].sortOrder - b[1].sortOrder);
    if (entries.length === 0) continue;

    const rows: Row[] = [
      [category],
      [`Week ending: ${dateStr}`],
      [],
      ["ITEM", "UNIT", "PRICE", "QUANTITY", "TOTAL"],
    ];

    let currentSub: string | undefined;
    for (const [_, e] of entries) {
      if (e.subcategory !== currentSub) {
        currentSub = e.subcategory;
        if (currentSub) rows.push([currentSub]);
      }
      rows.push([
        e.name,
        e.unit,
        e.unitPrice,
        e.quantity,
        e.quantity * e.unitPrice,
      ]);
    }
    rows.push([]);
    rows.push(["TOTAL", "", "", "", catTotals[category] ?? 0]);

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 40 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
    ];
    applyCurrencyToColumn(sheet, 2, rows); // PRICE
    applyCurrencyToColumn(sheet, 4, rows); // TOTAL

    const safeName = category.replace(/[\\/?*[\]]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, sheet, safeName);
  }

  XLSX.writeFile(wb, fileName ?? `catering-${week.id}.xlsx`);
}

function applyCurrencyToColumn(
  ws: XLSX.WorkSheet,
  colIdx: number,
  rows: Row[],
): void {
  for (let r = 0; r < rows.length; r++) {
    const cellAddr = XLSX.utils.encode_cell({ r, c: colIdx });
    const cell = ws[cellAddr] as XLSX.CellObject | undefined;
    if (cell && typeof cell.v === "number") {
      cell.t = "n";
      cell.z = GBP_FORMAT;
    }
  }
}
