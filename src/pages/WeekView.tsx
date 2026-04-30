import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Download } from "lucide-react";
import type { Week } from "../types";
import { loadItems, loadWeek, saveWeek } from "../lib/db";
import { formatGBP } from "../lib/money";
import { formatDate, formatError, isoToDate, weekEndingISO } from "../lib/utils";
import { categoryTotals, cloneWeek, weekTotal } from "../lib/week";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { ErrorCard } from "../components/ErrorCard";

export function WeekView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [week, setWeek] = useState<Week | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadWeek(id).then(
      (w) => {
        setWeek(w);
        setLoading(false);
      },
      (err) => {
        setError(formatError(err));
        setLoading(false);
      },
    );
  }, [id]);

  const totals = useMemo(() => categoryTotals(week), [week]);

  const onClone = async () => {
    if (!week || !user) return;
    try {
      const items = await loadItems();
      const targetId = weekEndingISO();
      const cloned = cloneWeek(targetId, week, items, user.email);
      await saveWeek(cloned);
      navigate("/");
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
      <div className="max-w-5xl mx-auto p-6">
        <div className="card p-12 text-center text-brand-500">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <ErrorCard message={error} />
      </div>
    );
  }

  if (!week) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="card p-12 text-center">
          <p className="text-brand-700 mb-4">Week not found.</p>
          <Link to="/weeks" className="text-brand-700 underline">
            Back to past weeks
          </Link>
        </div>
      </div>
    );
  }

  const total = weekTotal(week);
  const entries = Object.entries(week.entries)
    .filter(([_, e]) => e.quantity > 0)
    .sort((a, b) => a[1].sortOrder - b[1].sortOrder);

  // Group filled entries by category → subcategory
  const groupedByCat = new Map<
    string,
    Map<string | undefined, typeof entries>
  >();
  for (const pair of entries) {
    const e = pair[1];
    let byCat = groupedByCat.get(e.category);
    if (!byCat) {
      byCat = new Map();
      groupedByCat.set(e.category, byCat);
    }
    const arr = byCat.get(e.subcategory);
    if (arr) arr.push(pair);
    else byCat.set(e.subcategory, [pair]);
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Link
        to="/weeks"
        className="focus-ring inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> All weeks
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-sm text-brand-600 mb-1">Week ending</div>
          <h1 className="text-3xl font-semibold text-brand-900">
            {formatDate(isoToDate(week.id))}
          </h1>
          <div className="text-xs text-brand-500 mt-1">
            Recorded by {week.createdBy} • last edit{" "}
            {formatDate(week.updatedAt)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onExportExcel}
            title="Download this week as an Excel file"
            className="focus-ring inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-brand-200 hover:bg-brand-50 transition"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={onClone}
            className="focus-ring inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-brand-200 hover:bg-brand-50 transition"
          >
            <Copy className="w-4 h-4" /> Copy to current week
          </button>
          <div className="text-right">
            <div className="text-xs text-brand-600 uppercase tracking-wide">
              Grand total
            </div>
            <div className="text-3xl font-semibold tabular-nums text-brand-900">
              {formatGBP(total)}
            </div>
          </div>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="card p-12 text-center text-brand-600">
          No quantities were entered for this week.
        </div>
      ) : (
        <div className="space-y-6">
          {[...groupedByCat.entries()].map(([cat, subs]) => {
            const catTotal = totals[cat] ?? 0;
            return (
              <div key={cat} className="card overflow-hidden">
                <div className="px-5 py-3 bg-brand-50 border-b border-brand-100 flex items-center justify-between">
                  <h2 className="font-semibold text-brand-900">{cat}</h2>
                  <span className="font-medium tabular-nums text-brand-800">
                    {formatGBP(catTotal)}
                  </span>
                </div>
                {[...subs.entries()].map(([sub, items]) => (
                  <div key={sub ?? "(none)"}>
                    {sub && (
                      <div className="px-5 py-1.5 bg-white border-b border-brand-100 text-xs font-semibold uppercase tracking-wide text-brand-600">
                        {sub}
                      </div>
                    )}
                    <div className="divide-y divide-brand-100">
                      {items.map(([id, e]) => (
                        <div
                          key={id}
                          className="px-5 py-2.5 flex items-center gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-brand-900 truncate">
                              {e.name}
                            </div>
                            <div className="text-xs text-brand-500">
                              {e.unit} • {formatGBP(e.unitPrice)}
                            </div>
                          </div>
                          <div className="w-16 text-right tabular-nums text-brand-800">
                            {e.quantity}
                          </div>
                          <div className="w-24 text-right tabular-nums font-medium text-brand-900">
                            {formatGBP(e.quantity * e.unitPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
