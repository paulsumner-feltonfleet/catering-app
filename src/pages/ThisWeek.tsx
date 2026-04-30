import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  Download,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { CATEGORY_ORDER, type Item, type Week, type WeekEntry } from "../types";
import {
  addEntryToWeek,
  loadAllWeeks,
  loadItems,
  loadWeek,
  removeEntryFromWeek,
  saveWeek,
  setWeekEntryQuantity,
} from "../lib/db";
import { buildNewWeek, cloneWeek, itemToEntry } from "../lib/week";
import { formatGBP, parseQuantity } from "../lib/money";
import {
  cn,
  formatDate,
  formatError,
  weekEndingISO,
  isoToDate,
} from "../lib/utils";
import { useAuth } from "../auth/AuthProvider";
import { Modal } from "../components/Modal";
import { ErrorCard } from "../components/ErrorCard";

export function ThisWeek() {
  const { user } = useAuth();
  const [weekId, setWeekId] = useState(() => weekEndingISO());
  const [week, setWeek] = useState<Week | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORY_ORDER[0]);
  const [search, setSearch] = useState("");
  const [savingCount, setSavingCount] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload week + items whenever the active week id changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([loadItems(), loadWeek(weekId)])
      .then(([its, w]) => {
        if (cancelled) return;
        setItems(its);
        setWeek(w);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(formatError(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weekId]);

  const grandTotal = useMemo(() => {
    if (!week) return 0;
    return Object.values(week.entries).reduce(
      (s, e) => s + e.quantity * e.unitPrice,
      0,
    );
  }, [week]);

  const categoryTotals = useMemo(() => {
    const m: Record<string, number> = {};
    if (!week) return m;
    for (const e of Object.values(week.entries)) {
      m[e.category] = (m[e.category] ?? 0) + e.quantity * e.unitPrice;
    }
    return m;
  }, [week]);

  const handleQuantityChange = useCallback(
    (itemId: string, q: number) => {
      setWeek((prev) => {
        if (!prev) return prev;
        const existing = prev.entries[itemId];
        if (!existing) return prev;
        return {
          ...prev,
          entries: {
            ...prev.entries,
            [itemId]: { ...existing, quantity: q },
          },
        };
      });
    },
    [],
  );

  const persistQuantity = useCallback(
    async (itemId: string, q: number) => {
      setSavingCount((n) => n + 1);
      try {
        await setWeekEntryQuantity(weekId, itemId, q);
      } finally {
        setSavingCount((n) => n - 1);
      }
    },
    [weekId],
  );

  const onCreateFresh = async () => {
    if (!user) return;
    const newWeek = buildNewWeek(weekId, items, user.email);
    try {
      await saveWeek(newWeek);
      setWeek(newWeek);
    } catch (err) {
      setError(formatError(err));
    }
  };

  const onCloneLast = async () => {
    if (!user) return;
    try {
      const all = await loadAllWeeks();
      const past = all.filter((w) => w.id !== weekId);
      if (past.length === 0) return onCreateFresh();
      const source = past[0];
      const newWeek = cloneWeek(weekId, source, items, user.email);
      await saveWeek(newWeek);
      setWeek(newWeek);
    } catch (err) {
      setError(formatError(err));
    }
  };

  const onAddNewItem = async (item: Item) => {
    if (!week) return;
    const entry: WeekEntry = itemToEntry(item, 0);
    try {
      await addEntryToWeek(weekId, item.id, entry);
      setWeek({ ...week, entries: { ...week.entries, [item.id]: entry } });
    } catch (err) {
      setError(formatError(err));
    }
  };

  const onRemoveFromWeek = async (itemId: string) => {
    if (!week) return;
    try {
      await removeEntryFromWeek(weekId, itemId);
      const next = { ...week.entries };
      delete next[itemId];
      setWeek({ ...week, entries: next });
    } catch (err) {
      setError(formatError(err));
    }
  };

  const onExportExcel = async () => {
    if (!week) return;
    try {
      const { exportWeekToXlsx } = await import("../lib/export");
      exportWeekToXlsx(week);
    } catch (err) {
      setError(formatError(err));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="card p-12 text-center text-brand-500">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <ErrorCard message={error} />
      </div>
    );
  }

  if (!week) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="card p-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-brand-900">
                Start the week ending {formatDate(isoToDate(weekId))}
              </h1>
              <p className="text-sm text-brand-600 mt-0.5">
                Choose how you'd like to begin.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <button
              onClick={onCreateFresh}
              className="focus-ring text-left p-5 rounded-xl border border-brand-200 hover:border-brand-400 hover:bg-brand-50 transition group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-brand-900">Fresh week</span>
                <ArrowRight className="w-4 h-4 text-brand-500 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-sm text-brand-600">
                All items at zero. Enter today's quantities from scratch.
              </p>
            </button>
            <button
              onClick={onCloneLast}
              className="focus-ring text-left p-5 rounded-xl border border-brand-200 hover:border-brand-400 hover:bg-brand-50 transition group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-brand-900">
                  Copy from last week
                </span>
                <Copy className="w-4 h-4 text-brand-500 group-hover:translate-x-0.5 transition" />
              </div>
              <p className="text-sm text-brand-600">
                Pre-fill quantities from the most recent week, then adjust.
              </p>
            </button>
          </div>
          <div className="mt-6 pt-6 border-t border-brand-100">
            <button
              onClick={() => setDatePickerOpen(true)}
              className="focus-ring inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-900"
            >
              <CalendarDays className="w-4 h-4" />
              Different week ending date
            </button>
          </div>
        </div>
        <DatePickerModal
          open={datePickerOpen}
          value={weekId}
          onClose={() => setDatePickerOpen(false)}
          onConfirm={(d) => {
            setWeekId(d);
            setDatePickerOpen(false);
          }}
        />
      </div>
    );
  }

  // Filter and group entries
  const searchLower = search.trim().toLowerCase();
  const isSearching = searchLower.length > 0;
  const visibleEntries = Object.entries(week.entries)
    .filter(([_, e]) => {
      if (isSearching) {
        return (
          e.name.toLowerCase().includes(searchLower) ||
          (e.subcategory ?? "").toLowerCase().includes(searchLower) ||
          e.unit.toLowerCase().includes(searchLower)
        );
      }
      return e.category === activeCategory;
    })
    .sort((a, b) => a[1].sortOrder - b[1].sortOrder);

  const visibleGrouped = groupEntriesBySubcategory(visibleEntries);

  // Items that aren't yet in this week (for "Add to week" search)
  const itemsNotInWeek = items.filter(
    (i) => !i.archived && !week.entries[i.id],
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => setDatePickerOpen(true)}
            className="focus-ring inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-900 mb-1"
          >
            <CalendarDays className="w-4 h-4" />
            Week ending
            <ChevronDown className="w-3 h-3" />
          </button>
          <h1 className="text-3xl font-semibold text-brand-900">
            {formatDate(isoToDate(weekId))}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <SaveIndicator saving={savingCount > 0} />
          <button
            onClick={onExportExcel}
            title="Download this week as an Excel file"
            className="focus-ring inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-brand-200 text-brand-800 hover:bg-brand-50 transition text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <div className="text-right">
            <div className="text-xs text-brand-600 uppercase tracking-wide">
              Grand total
            </div>
            <div className="text-3xl font-semibold tabular-nums text-brand-900">
              {formatGBP(grandTotal)}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-3">
          <CategorySidebar
            active={activeCategory}
            onSelect={(c) => {
              setActiveCategory(c);
              setSearch("");
            }}
            totals={categoryTotals}
            disabled={isSearching}
          />
        </aside>

        <section className="col-span-12 md:col-span-9 space-y-4">
          <div className="card p-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-brand-500 ml-1" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isSearching
                  ? `Searching all categories…`
                  : `Search items in ${activeCategory}…`
              }
              className="flex-1 px-2 py-1 outline-none bg-transparent text-brand-900 placeholder:text-brand-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-brand-600 hover:text-brand-800 px-2"
              >
                clear
              </button>
            )}
          </div>

          {visibleEntries.length === 0 ? (
            <div className="card p-12 text-center text-brand-600">
              {isSearching
                ? `No items match "${search}"`
                : `No items in ${activeCategory} for this week.`}
              {itemsNotInWeek.length > 0 && (
                <AddToWeekControl
                  items={itemsNotInWeek}
                  onAdd={onAddNewItem}
                  category={activeCategory}
                />
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {visibleGrouped.map((g) => (
                <div
                  key={g.subcategory ?? "(none)"}
                  className="card overflow-hidden"
                >
                  {g.subcategory && (
                    <div className="px-5 py-2.5 bg-brand-50 border-b border-brand-100 text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {g.subcategory}
                    </div>
                  )}
                  <div className="divide-y divide-brand-100">
                    {g.entries.map(([id, e]) => (
                      <EntryRow
                        key={id}
                        itemId={id}
                        entry={e}
                        onChangeLocal={handleQuantityChange}
                        onPersist={persistQuantity}
                        onRemove={() => onRemoveFromWeek(id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isSearching && (
            <AddToWeekControl
              items={itemsNotInWeek}
              onAdd={onAddNewItem}
              category={activeCategory}
            />
          )}
        </section>
      </div>

      <DatePickerModal
        open={datePickerOpen}
        value={weekId}
        onClose={() => setDatePickerOpen(false)}
        onConfirm={(d) => {
          setWeekId(d);
          setDatePickerOpen(false);
        }}
      />
    </div>
  );
}

function CategorySidebar({
  active,
  onSelect,
  totals,
  disabled,
}: {
  active: string;
  onSelect: (c: string) => void;
  totals: Record<string, number>;
  disabled: boolean;
}) {
  return (
    <div className={cn("card p-2", disabled && "opacity-60")}>
      {CATEGORY_ORDER.map((c) => {
        const t = totals[c] ?? 0;
        const isActive = active === c && !disabled;
        return (
          <button
            key={c}
            onClick={() => onSelect(c)}
            className={cn(
              "focus-ring w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-sm transition",
              isActive
                ? "bg-brand-600 text-white"
                : "text-brand-800 hover:bg-brand-50",
            )}
          >
            <span className="truncate">{c}</span>
            <span
              className={cn(
                "text-xs tabular-nums shrink-0",
                isActive ? "text-white/90" : "text-brand-500",
              )}
            >
              {t > 0 ? formatGBP(t) : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EntryRow({
  itemId,
  entry,
  onChangeLocal,
  onPersist,
  onRemove,
}: {
  itemId: string;
  entry: WeekEntry;
  onChangeLocal: (id: string, q: number) => void;
  onPersist: (id: string, q: number) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState(
    entry.quantity ? String(entry.quantity) : "",
  );
  const lastSaved = useRef(entry.quantity);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from prop if changed externally (and we're not actively editing)
  useEffect(() => {
    if (entry.quantity !== lastSaved.current) {
      setText(entry.quantity ? String(entry.quantity) : "");
      lastSaved.current = entry.quantity;
    }
  }, [entry.quantity]);

  const onChange = (v: string) => {
    setText(v);
    const n = parseQuantity(v);
    onChangeLocal(itemId, n);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastSaved.current = n;
      onPersist(itemId, n);
    }, 400);
  };

  const lineTotal = entry.quantity * entry.unitPrice;

  return (
    <div className="px-5 py-3 flex items-center gap-4 group hover:bg-brand-50/50 transition">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-brand-900 truncate">{entry.name}</div>
        <div className="text-xs text-brand-600 mt-0.5">
          {entry.unit} • {formatGBP(entry.unitPrice)}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="0"
          className="w-20 text-right tabular-nums px-3 py-1.5 rounded-lg border border-brand-200 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 outline-none"
        />
        <div className="w-24 text-right tabular-nums font-medium text-brand-900">
          {lineTotal > 0 ? formatGBP(lineTotal) : "—"}
        </div>
        <button
          onClick={onRemove}
          title="Remove from this week"
          className="opacity-0 group-hover:opacity-100 transition focus-ring p-1.5 rounded text-brand-500 hover:text-red-700 hover:bg-red-50"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function AddToWeekControl({
  items,
  onAdd,
  category,
}: {
  items: Item[];
  onAdd: (item: Item) => void;
  category: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let candidates = items;
    if (!showAll && !s) candidates = items.filter((i) => i.category === category);
    if (s) {
      candidates = candidates.filter(
        (i) =>
          i.name.toLowerCase().includes(s) ||
          (i.subcategory ?? "").toLowerCase().includes(s),
      );
    }
    return candidates.slice(0, 30);
  }, [items, search, showAll, category]);

  if (items.length === 0) return null;

  return (
    <div className="card p-3">
      {!open ? (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-brand-700">
            {items.filter((i) => i.category === category).length > 0 ? (
              <>
                {items.filter((i) => i.category === category).length} item(s) in{" "}
                {category} not in this week.
              </>
            ) : (
              <>{items.length} master items not in this week.</>
            )}
          </div>
          <button
            onClick={() => setOpen(true)}
            className="focus-ring inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-brand-100 text-brand-800 hover:bg-brand-200 transition"
          >
            <Plus className="w-4 h-4" />
            Add to this week
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search master list…"
              className="flex-1 px-3 py-2 rounded-lg border border-brand-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
            <label className="flex items-center gap-1.5 text-xs text-brand-700 whitespace-nowrap">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="accent-brand-600"
              />
              All categories
            </label>
            <button
              onClick={() => {
                setOpen(false);
                setSearch("");
              }}
              className="text-sm text-brand-700 hover:text-brand-900 px-2"
            >
              Done
            </button>
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-brand-500 p-3 text-center">
              No matches.{" "}
              <Link to="/items" className="text-brand-700 underline">
                Add to master list
              </Link>
              .
            </p>
          ) : (
            <div className="divide-y divide-brand-100 max-h-72 overflow-y-auto">
              {filtered.map((i) => (
                <button
                  key={i.id}
                  onClick={() => onAdd(i)}
                  className="w-full text-left px-3 py-2 hover:bg-brand-50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-brand-900 truncate">
                      {i.name}
                    </div>
                    <div className="text-xs text-brand-600">
                      {i.category}
                      {i.subcategory ? ` • ${i.subcategory}` : ""} • {i.unit}
                    </div>
                  </div>
                  <div className="text-sm text-brand-700 tabular-nums shrink-0">
                    {formatGBP(i.unitPrice)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ saving }: { saving: boolean }) {
  return (
    <div className="text-xs text-brand-500 flex items-center gap-1.5">
      {saving ? (
        <>
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Saving…
        </>
      ) : (
        <>
          <Check className="w-3.5 h-3.5 text-brand-500" />
          Saved
        </>
      )}
    </div>
  );
}

function DatePickerModal({
  open,
  value,
  onClose,
  onConfirm,
}: {
  open: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (iso: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value, open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose week-ending date"
      footer={
        <>
          <button
            onClick={onClose}
            className="focus-ring px-4 py-2 rounded-lg text-brand-700 hover:bg-brand-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(draft)}
            className="focus-ring px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            Open
          </button>
        </>
      }
    >
      <p className="text-sm text-brand-700 mb-3">
        Pick any date — we'll snap to the Sunday that ends that week.
      </p>
      <input
        type="date"
        value={draft}
        onChange={(e) => setDraft(snapToSunday(e.target.value))}
        className="w-full px-3 py-2 rounded-lg border border-brand-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
      />
      <p className="text-sm text-brand-600 mt-2">
        Will open: <strong>{formatDate(isoToDate(draft))}</strong>
      </p>
    </Modal>
  );
}

function snapToSunday(iso: string): string {
  if (!iso) return iso;
  const d = isoToDate(iso);
  return weekEndingISO(d);
}

function groupEntriesBySubcategory(
  entries: [string, WeekEntry][],
): { subcategory: string | undefined; entries: [string, WeekEntry][] }[] {
  const map = new Map<string | undefined, [string, WeekEntry][]>();
  for (const [id, e] of entries) {
    const arr = map.get(e.subcategory);
    if (arr) arr.push([id, e]);
    else map.set(e.subcategory, [[id, e]]);
  }
  return [...map.entries()].map(([subcategory, entries]) => ({
    subcategory,
    entries,
  }));
}
