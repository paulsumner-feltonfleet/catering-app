import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Archive, ArchiveRestore, Tag } from "lucide-react";
import { CATEGORY_ORDER, type Item } from "../types";
import { deleteItem, saveItem, subscribeItems } from "../lib/db";
import { Modal } from "../components/Modal";
import {
  emptyItemForm,
  formValuesToItem,
  ItemForm,
  itemToFormValues,
  type ItemFormValues,
} from "../components/ItemForm";
import { formatGBP } from "../lib/money";
import { cn, formatError } from "../lib/utils";
import { ErrorCard } from "../components/ErrorCard";

export function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(
    CATEGORY_ORDER[0],
  );

  // Add / edit modal state
  const [editing, setEditing] = useState<{
    item: Item | null; // null = creating
    values: ItemFormValues;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = subscribeItems(
      (next) => {
        setItems(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(formatError(err));
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const knownSubcategories = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const i of items) {
      if (!i.subcategory) continue;
      (map[i.category] ??= new Set()).add(i.subcategory);
    }
    return Object.fromEntries(
      Object.entries(map).map(([k, v]) => [k, [...v].sort()]),
    );
  }, [items]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((i) => {
      if (!showArchived && i.archived) return false;
      if (s) {
        if (
          !i.name.toLowerCase().includes(s) &&
          !i.unit.toLowerCase().includes(s) &&
          !(i.subcategory ?? "").toLowerCase().includes(s) &&
          !(i.code ?? "").toLowerCase().includes(s)
        )
          return false;
      } else if (i.category !== activeCategory) {
        return false;
      }
      return true;
    });
  }, [items, search, showArchived, activeCategory]);

  const grouped = useMemo(() => groupBySubcategory(filtered), [filtered]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of items) {
      if (i.archived && !showArchived) continue;
      m[i.category] = (m[i.category] ?? 0) + 1;
    }
    return m;
  }, [items, showArchived]);

  const onAdd = () => {
    setEditing({ item: null, values: emptyItemForm(activeCategory) });
  };
  const onEdit = (item: Item) => {
    setEditing({ item, values: itemToFormValues(item) });
  };
  const onSave = async () => {
    if (!editing) return;
    const { item, values } = editing;
    if (!values.name.trim()) return;
    if (item) {
      await saveItem(formValuesToItem(values, item));
    } else {
      // new item — generate id, place at end of category
      const id = `${slug(values.category)}-${slug(values.name)}-${Date.now().toString(36)}`;
      const maxOrder = items.reduce(
        (m, i) => (i.sortOrder > m ? i.sortOrder : m),
        0,
      );
      await saveItem(
        formValuesToItem(values, {
          id,
          sortOrder: maxOrder + 1,
          archived: false,
        }),
      );
    }
    setEditing(null);
  };
  const onArchiveToggle = async (item: Item) => {
    if (item.archived) {
      await saveItem({ ...item, archived: false });
    } else {
      await deleteItem(item.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-wrap items-center gap-4 justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-brand-900">Items</h1>
          <p className="text-sm text-brand-600 mt-1">
            Master list of stock items. Edits here apply to new weeks; past
            weeks keep the prices and names that were live at the time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-brand-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-brand-600"
            />
            Show archived
          </label>
          <button
            onClick={onAdd}
            className="focus-ring inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-3">
          <div className="card p-2">
            {CATEGORY_ORDER.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setActiveCategory(c);
                  setSearch("");
                }}
                className={cn(
                  "focus-ring w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-sm transition",
                  activeCategory === c && !search
                    ? "bg-brand-600 text-white"
                    : "text-brand-800 hover:bg-brand-50",
                )}
              >
                <span>{c}</span>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    activeCategory === c && !search
                      ? "bg-white/20"
                      : "bg-brand-100 text-brand-700",
                  )}
                >
                  {counts[c] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="col-span-12 md:col-span-9 space-y-4">
          <div className="card p-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-brand-500 ml-1" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search items${search ? "" : ` in ${activeCategory}`}…`}
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

          {loading ? (
            <div className="card p-12 text-center text-brand-500">Loading…</div>
          ) : error ? (
            <ErrorCard message={error} />
          ) : filtered.length === 0 ? (
            <EmptyState
              search={search}
              onAdd={onAdd}
              category={activeCategory}
            />
          ) : (
            <div className="space-y-6">
              {grouped.map((g) => (
                <div key={g.subcategory ?? "(none)"} className="card overflow-hidden">
                  {g.subcategory && (
                    <div className="px-5 py-2.5 bg-brand-50 border-b border-brand-100 text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {g.subcategory}
                    </div>
                  )}
                  <div className="divide-y divide-brand-100">
                    {g.items.map((it) => (
                      <ItemRow
                        key={it.id}
                        item={it}
                        onEdit={() => onEdit(it)}
                        onArchiveToggle={() => onArchiveToggle(it)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.item ? "Edit item" : "Add new item"}
        footer={
          <>
            <button
              onClick={() => setEditing(null)}
              className="focus-ring px-4 py-2 rounded-lg text-brand-700 hover:bg-brand-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!editing?.values.name.trim()}
              className="focus-ring px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editing?.item ? "Save changes" : "Add item"}
            </button>
          </>
        }
      >
        {editing && (
          <ItemForm
            values={editing.values}
            onChange={(values) => setEditing({ ...editing, values })}
            knownSubcategories={knownSubcategories}
          />
        )}
      </Modal>
    </div>
  );
}

function ItemRow({
  item,
  onEdit,
  onArchiveToggle,
}: {
  item: Item;
  onEdit: () => void;
  onArchiveToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "px-5 py-3 flex items-center gap-4 hover:bg-brand-50/50 group transition",
        item.archived && "opacity-50",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-brand-900 truncate">{item.name}</div>
        <div className="text-xs text-brand-600 mt-0.5 flex items-center gap-2 flex-wrap">
          <span>{item.unit}</span>
          {item.code && (
            <span className="inline-flex items-center gap-1 text-brand-500">
              <Tag className="w-3 h-3" />
              {item.code}
            </span>
          )}
          {item.archived && (
            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-xs">
              Archived
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-brand-900 font-medium tabular-nums">
          {formatGBP(item.unitPrice)}
        </div>
        <div className="text-xs text-brand-500">per {item.unit}</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={onEdit}
          title="Edit"
          className="focus-ring p-2 rounded-lg text-brand-700 hover:bg-brand-100 transition"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onArchiveToggle}
          title={item.archived ? "Restore" : "Archive"}
          className="focus-ring p-2 rounded-lg text-brand-700 hover:bg-brand-100 transition"
        >
          {item.archived ? (
            <ArchiveRestore className="w-4 h-4" />
          ) : (
            <Archive className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  search,
  category,
  onAdd,
}: {
  search: string;
  category: string;
  onAdd: () => void;
}) {
  return (
    <div className="card p-12 text-center">
      <p className="text-brand-700 mb-4">
        {search
          ? `No items match "${search}"`
          : `No items in ${category} yet`}
      </p>
      <button
        onClick={onAdd}
        className="focus-ring inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
      >
        <Plus className="w-4 h-4" /> Add an item
      </button>
    </div>
  );
}

function groupBySubcategory(items: Item[]) {
  const map = new Map<string | undefined, Item[]>();
  for (const i of items) {
    const arr = map.get(i.subcategory);
    if (arr) arr.push(i);
    else map.set(i.subcategory, [i]);
  }
  const groups = [...map.entries()].map(([subcategory, items]) => ({
    subcategory,
    items: items.sort((a, b) => a.sortOrder - b.sortOrder),
  }));
  groups.sort((a, b) => {
    const sa = a.items[0]?.sortOrder ?? 0;
    const sb = b.items[0]?.sortOrder ?? 0;
    return sa - sb;
  });
  return groups;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
