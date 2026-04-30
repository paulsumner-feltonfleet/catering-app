import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, History, Inbox, Trash2 } from "lucide-react";
import type { Week } from "../types";
import { deleteWeek, loadAllWeeks } from "../lib/db";
import { formatGBP } from "../lib/money";
import { formatDate, formatError, isoToDate } from "../lib/utils";
import { weekTotal } from "../lib/week";
import { ErrorCard } from "../components/ErrorCard";
import { Modal } from "../components/Modal";

export function PastWeeks() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Week | null>(null);
  const [busy, setBusy] = useState(false);

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

  const onDelete = async (week: Week) => {
    setBusy(true);
    try {
      await deleteWeek(week.id);
      setWeeks((prev) => prev.filter((w) => w.id !== week.id));
      setConfirmDelete(null);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(false);
    }
  };

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
            <div className="col-span-5">Week ending</div>
            <div className="col-span-3 text-right">Items entered</div>
            <div className="col-span-3 text-right">Grand total</div>
            <div className="col-span-1" />
          </div>
          <div className="divide-y divide-brand-100">
            {weeks.map((w) => {
              const filledCount = Object.values(w.entries).filter(
                (e) => e.quantity > 0,
              ).length;
              return (
                <div
                  key={w.id}
                  className="grid grid-cols-12 px-5 py-3.5 hover:bg-brand-50/50 transition group items-center"
                >
                  <Link
                    to={`/weeks/${w.id}`}
                    className="col-span-5 flex items-center min-w-0"
                  >
                    <ChevronRight className="w-4 h-4 text-brand-400 group-hover:text-brand-700 group-hover:translate-x-0.5 transition mr-2 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-brand-900 truncate">
                        {formatDate(isoToDate(w.id))}
                      </div>
                      <div className="text-xs text-brand-500">
                        Edited {formatDate(w.updatedAt)}
                      </div>
                    </div>
                  </Link>
                  <Link
                    to={`/weeks/${w.id}`}
                    className="col-span-3 text-right text-brand-700 tabular-nums"
                  >
                    {filledCount} / {Object.keys(w.entries).length}
                  </Link>
                  <Link
                    to={`/weeks/${w.id}`}
                    className="col-span-3 text-right tabular-nums font-medium text-brand-900"
                  >
                    {formatGBP(weekTotal(w))}
                  </Link>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => setConfirmDelete(w)}
                      title="Delete this week"
                      className="focus-ring opacity-0 group-hover:opacity-100 transition p-1.5 rounded text-brand-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => !busy && setConfirmDelete(null)}
        title="Delete this week?"
        footer={
          <>
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={busy}
              className="focus-ring px-4 py-2 rounded-lg text-brand-700 hover:bg-brand-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => confirmDelete && onDelete(confirmDelete)}
              disabled={busy}
              className="focus-ring px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        {confirmDelete && (
          <div className="space-y-2 text-brand-800">
            <p>
              You're about to permanently delete the week ending{" "}
              <strong>{formatDate(isoToDate(confirmDelete.id))}</strong>.
            </p>
            <p className="text-sm text-brand-600">
              Grand total {formatGBP(weekTotal(confirmDelete))} •{" "}
              {Object.values(confirmDelete.entries).filter((e) => e.quantity > 0)
                .length}{" "}
              items entered. This can't be undone.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
