import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  deleteField,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import type { Item, Week, WeekEntry } from "../types";

const ITEMS_KEY = "catering.demo.items.v1";
const WEEK_KEY = (id: string) => `catering.demo.week.${id}.v1`;
const WEEK_INDEX_KEY = "catering.demo.weeks.index.v1";

// ----------------------------------------------------------------------------
// Items
// ----------------------------------------------------------------------------

export async function loadItems(): Promise<Item[]> {
  if (isFirebaseConfigured && db) {
    const snap = await getDocs(
      query(collection(db, "items"), orderBy("sortOrder", "asc")),
    );
    return snap.docs.map((d) => d.data() as Item);
  }
  // demo mode
  const cached = localStorage.getItem(ITEMS_KEY);
  if (cached) return JSON.parse(cached) as Item[];
  const res = await fetch("/seed/items.json");
  const items = (await res.json()) as Item[];
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  return items;
}

export function subscribeItems(
  cb: (items: Item[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  if (isFirebaseConfigured && db) {
    return onSnapshot(
      query(collection(db, "items"), orderBy("sortOrder", "asc")),
      (snap) => cb(snap.docs.map((d) => d.data() as Item)),
      (err) => onError?.(err),
    );
  }
  // demo mode: one-time load + storage event listener
  let cancelled = false;
  loadItems().then(
    (items) => !cancelled && cb(items),
    (err) => !cancelled && onError?.(err),
  );
  const handler = (e: StorageEvent) => {
    if (e.key === ITEMS_KEY) {
      loadItems().then(
        (items) => !cancelled && cb(items),
        (err) => !cancelled && onError?.(err),
      );
    }
  };
  window.addEventListener("storage", handler);
  return () => {
    cancelled = true;
    window.removeEventListener("storage", handler);
  };
}

export async function saveItem(item: Item): Promise<void> {
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, "items", item.id), {
      ...item,
      updatedAt: Date.now(),
    });
    return;
  }
  const items = await loadItems();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx] = { ...item, updatedAt: Date.now() };
  else items.push({ ...item, updatedAt: Date.now() });
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  // notify same-tab listeners
  window.dispatchEvent(new StorageEvent("storage", { key: ITEMS_KEY }));
}

export async function deleteItem(id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    await setDoc(
      doc(db, "items", id),
      { archived: true, updatedAt: Date.now() },
      { merge: true },
    );
    return;
  }
  const items = await loadItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], archived: true, updatedAt: Date.now() };
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    window.dispatchEvent(new StorageEvent("storage", { key: ITEMS_KEY }));
  }
}

// ----------------------------------------------------------------------------
// Weeks
// ----------------------------------------------------------------------------

export async function loadWeek(id: string): Promise<Week | null> {
  if (isFirebaseConfigured && db) {
    const snap = await getDoc(doc(db, "weeks", id));
    if (!snap.exists()) return null;
    return snap.data() as Week;
  }
  const raw = localStorage.getItem(WEEK_KEY(id));
  return raw ? (JSON.parse(raw) as Week) : null;
}

export function subscribeWeek(
  id: string,
  cb: (week: Week | null) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  if (isFirebaseConfigured && db) {
    return onSnapshot(
      doc(db, "weeks", id),
      (snap) => cb(snap.exists() ? (snap.data() as Week) : null),
      (err) => onError?.(err),
    );
  }
  let cancelled = false;
  loadWeek(id).then(
    (w) => !cancelled && cb(w),
    (err) => !cancelled && onError?.(err),
  );
  const handler = (e: StorageEvent) => {
    if (e.key === WEEK_KEY(id)) {
      loadWeek(id).then(
        (w) => !cancelled && cb(w),
        (err) => !cancelled && onError?.(err),
      );
    }
  };
  window.addEventListener("storage", handler);
  return () => {
    cancelled = true;
    window.removeEventListener("storage", handler);
  };
}

export async function loadAllWeeks(): Promise<Week[]> {
  if (isFirebaseConfigured && db) {
    const snap = await getDocs(
      query(collection(db, "weeks"), orderBy("weekEnding", "desc")),
    );
    return snap.docs.map((d) => d.data() as Week);
  }
  const idx = JSON.parse(localStorage.getItem(WEEK_INDEX_KEY) ?? "[]") as string[];
  const weeks: Week[] = [];
  for (const id of idx) {
    const w = await loadWeek(id);
    if (w) weeks.push(w);
  }
  weeks.sort((a, b) => b.weekEnding - a.weekEnding);
  return weeks;
}

export async function saveWeek(week: Week): Promise<void> {
  const updated: Week = { ...week, updatedAt: Date.now() };
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, "weeks", week.id), {
      ...updated,
      updatedAt: Date.now(),
    });
    return;
  }
  localStorage.setItem(WEEK_KEY(week.id), JSON.stringify(updated));
  const idx = JSON.parse(localStorage.getItem(WEEK_INDEX_KEY) ?? "[]") as string[];
  if (!idx.includes(week.id)) {
    idx.push(week.id);
    localStorage.setItem(WEEK_INDEX_KEY, JSON.stringify(idx));
  }
  window.dispatchEvent(new StorageEvent("storage", { key: WEEK_KEY(week.id) }));
}

export async function setWeekEntryQuantity(
  weekId: string,
  itemId: string,
  quantity: number,
): Promise<void> {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, "weeks", weekId), {
      [`entries.${itemId}.quantity`]: quantity,
      updatedAt: Date.now(),
    });
    return;
  }
  const week = await loadWeek(weekId);
  if (!week) return;
  const entry = week.entries[itemId];
  if (!entry) return;
  week.entries[itemId] = { ...entry, quantity };
  await saveWeek(week);
}

export async function addEntryToWeek(
  weekId: string,
  itemId: string,
  entry: WeekEntry,
): Promise<void> {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, "weeks", weekId), {
      [`entries.${itemId}`]: entry,
      updatedAt: Date.now(),
    });
    return;
  }
  const week = await loadWeek(weekId);
  if (!week) return;
  week.entries[itemId] = entry;
  await saveWeek(week);
}

export async function removeEntryFromWeek(
  weekId: string,
  itemId: string,
): Promise<void> {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, "weeks", weekId), {
      [`entries.${itemId}`]: deleteField(),
      updatedAt: Date.now(),
    });
    return;
  }
  const week = await loadWeek(weekId);
  if (!week) return;
  delete week.entries[itemId];
  await saveWeek(week);
}
