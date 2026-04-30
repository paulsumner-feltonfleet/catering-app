import type { Item, Week, WeekEntry } from "../types";
import { isoToDate } from "./utils";

/** Build a fresh Week from the master items list. Quantities default to 0. */
export function buildNewWeek(
  weekId: string,
  items: Item[],
  createdBy: string,
): Week {
  const entries: Record<string, WeekEntry> = {};
  for (const item of items) {
    if (item.archived) continue;
    entries[item.id] = {
      quantity: 0,
      name: item.name,
      unit: item.unit,
      unitPrice: item.unitPrice,
      category: item.category,
      subcategory: item.subcategory,
      sortOrder: item.sortOrder,
    };
  }
  const now = Date.now();
  return {
    id: weekId,
    weekEnding: isoToDate(weekId).getTime(),
    entries,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

/** Build a Week with quantities cloned from another (past) week. */
export function cloneWeek(
  newId: string,
  source: Week,
  items: Item[],
  createdBy: string,
): Week {
  const fresh = buildNewWeek(newId, items, createdBy);
  for (const [itemId, srcEntry] of Object.entries(source.entries)) {
    const target = fresh.entries[itemId];
    if (target) target.quantity = srcEntry.quantity;
  }
  return fresh;
}

/** Convert a master Item to a WeekEntry shape. */
export function itemToEntry(item: Item, quantity = 0): WeekEntry {
  return {
    quantity,
    name: item.name,
    unit: item.unit,
    unitPrice: item.unitPrice,
    category: item.category,
    subcategory: item.subcategory,
    sortOrder: item.sortOrder,
  };
}

/** Total cost across all entries in a week. */
export function weekTotal(week: Week | null | undefined): number {
  if (!week) return 0;
  let sum = 0;
  for (const e of Object.values(week.entries)) {
    sum += e.quantity * e.unitPrice;
  }
  return sum;
}

/** Per-category totals for a week. */
export function categoryTotals(
  week: Week | null | undefined,
): Record<string, number> {
  const totals: Record<string, number> = {};
  if (!week) return totals;
  for (const e of Object.values(week.entries)) {
    totals[e.category] = (totals[e.category] ?? 0) + e.quantity * e.unitPrice;
  }
  return totals;
}

/** Group entries by category and subcategory, sorted by sortOrder. */
export type GroupedEntries = {
  category: string;
  subcategories: {
    name: string | undefined;
    entries: { itemId: string; entry: WeekEntry }[];
  }[];
}[];

export function groupEntries(week: Week | null | undefined): GroupedEntries {
  if (!week) return [];
  const byCategory = new Map<string, Map<string | undefined, { itemId: string; entry: WeekEntry }[]>>();
  for (const [itemId, entry] of Object.entries(week.entries)) {
    let cat = byCategory.get(entry.category);
    if (!cat) {
      cat = new Map();
      byCategory.set(entry.category, cat);
    }
    const subKey = entry.subcategory;
    let sub = cat.get(subKey);
    if (!sub) {
      sub = [];
      cat.set(subKey, sub);
    }
    sub.push({ itemId, entry });
  }
  const result: GroupedEntries = [];
  for (const [category, subs] of byCategory) {
    const subArr: GroupedEntries[number]["subcategories"] = [];
    for (const [name, entries] of subs) {
      entries.sort((a, b) => a.entry.sortOrder - b.entry.sortOrder);
      subArr.push({ name, entries });
    }
    subArr.sort((a, b) => {
      const sa = a.entries[0]?.entry.sortOrder ?? 0;
      const sb = b.entries[0]?.entry.sortOrder ?? 0;
      return sa - sb;
    });
    result.push({ category, subcategories: subArr });
  }
  return result;
}
