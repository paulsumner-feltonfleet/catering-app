import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDate(d: Date | number): string {
  const date = typeof d === "number" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(d: Date | number): string {
  const date = typeof d === "number" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** ISO date string (YYYY-MM-DD) for the Sunday of the week containing `date` (week ends Sunday). */
export function weekEndingISO(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun, 1 Mon, ... 6 Sat
  const diff = (7 - day) % 7;
  d.setDate(d.getDate() + diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  if (e?.code === "permission-denied") {
    return "The database is blocking access. Either your account isn't on the allowlist, or the security rules haven't been deployed yet (run `firebase deploy --only firestore:rules`).";
  }
  if (e?.code === "unavailable" || e?.code === "failed-precondition") {
    return "Can't reach the database. Check your internet connection and that the Firebase project is active.";
  }
  if (e?.code === "unauthenticated") {
    return "You're not signed in. Try signing out and back in.";
  }
  return e?.message ?? String(err);
}

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): (...args: Args) => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
