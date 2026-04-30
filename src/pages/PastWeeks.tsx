import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, History, Inbox } from "lucide-react";
import type { Week } from "../types";
import { loadAllWeeks } from "../lib/db";
import { formatGBP } from "../lib/money";
import { formatDate, formatError, isoToDate } from "../lib/utils";
import { weekTotal } from "../lib/week";
import { ErrorCard } from "../components/ErrorCard";

export function PastWeeks() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllWeeks().then(
      (w) => {
        setWeeks(w);
        setLoading(false);
      },
      (err) => {
        setError(formatError(err));
        setLoading(false);
      },
    );
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-900 flex items-center gap-2">
          <History className="w-6 h-6 text-brand-600" />
          Past weeks
        </h1>
        <p className="text-sm text-brand-600 mt-1">
          Every week you've recorded, newest first. Click to view, edit or
          duplicate.
        </p>
      </header>

      {loading ? (
        <div className="card p-12 text-center text-brand-500">Loading…</div>
      ) : error ? (
        <ErrorCard message={error} />
      ) : weeks.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox className="w-12 h-12 mx-auto text-brand-300 mb-4" />
          <p className="text-brand-700 mb-4">No weeks recorded yet.</p>
          <Link
            to="/"
            className="focus-ring inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            Start this week
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-2.5 bg-brand-50 border-b border-brand-100 text-xs font-semibold uppercase tracking-wide text-brand-700">
            <div className="col-span-6">Week ending</div>
            <div className="col-span-3 text-right">Items entered</div>
            <div className="col-span-3 text-right">Grand total</div>
          </div>
          <div className="divide-y divide-brand-100">
            {weeks.map((w) => {
              const filledCount = Object.values(w.entries).filter(
                (e) => e.quantity > 0,
              ).length;
              return (
                <Link
                  key={w.id}
                  to={`/weeks/${w.id}`}
                  className="grid grid-cols-12 px-5 py-3.5 hover:bg-brand-50/50 transition group"
                >
                  <div className="col-span-6 flex items-center">
                    <ChevronRight className="w-4 h-4 text-brand-400 group-hover:text-brand-700 group-hover:translate-x-0.5 transition mr-2" />
                    <div>
                      <div className="font-medium text-brand-900">
                        {formatDate(isoToDate(w.id))}
                      </div>
                      <div className="text-xs text-brand-500">
                        Edited {formatDate(w.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3 text-right text-brand-700 tabular-nums self-center">
                    {filledCount} / {Object.keys(w.entries).length}
                  </div>
                  <div className="col-span-3 text-right tabular-nums font-medium text-brand-900 self-center">
                    {formatGBP(weekTotal(w))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
