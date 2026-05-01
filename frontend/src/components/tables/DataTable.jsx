import React, { useState } from "react";

import ChartCard from "../cards/ChartCard";
import { Badge } from "../ui/badge";
import { MessageSquare } from "lucide-react";
import { cn } from "../../lib/utils";

function typeBadgeVariant(type) {
  const v = (type || "").toLowerCase();
  if (v === "simple") return "simple";
  if (v === "average") return "average";
  return "complex";
}

const COMPLEXITY_OPTIONS = ["simple", "average", "complex"];

/**
 * DataTable
 *
 * Props
 * ─────
 * variant      'actors' | 'use_cases'
 * rows         array of ActorBreakdown | UseCaseBreakdown (may include a `notes` string)
 * editable     boolean — enables inline classification editing and per-row notes
 * onUpdateRow  (index: number, patch: object) => void — called when a row is mutated
 */
function DataTable({ variant, rows, editable = false, onUpdateRow }) {
  // Track which row note textareas are expanded
  const [expandedNotes, setExpandedNotes] = useState(new Set());

  if (!Array.isArray(rows)) rows = [];

  const isActors = variant === "actors";

  const header = isActors
    ? { col1: "Name", col2: "Type", col3: "Weight" }
    : { col1: "Name", col2: "Complexity", col3: "Weight" };

  const toggleNote = (idx) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <ChartCard
      title={isActors ? "Actors" : "Use Cases"}
      subtitle={
        editable
          ? "Edit classifications · click 💬 to add a decision note"
          : "Final structured list"
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {header.col1}
              </th>
              <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {header.col2}
              </th>
              <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                {header.col3}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.flatMap((r, idx) => {
                const key = `${r.name}_${idx}`;
                const classificationValue = isActors
                  ? r.actor_type
                  : r.complexity;
                const badgeVariant = typeBadgeVariant(classificationValue);
                const isNoteOpen = expandedNotes.has(idx);
                const hasNote = !!(r.notes && r.notes.trim());

                const mainRow = (
                  <tr
                    key={key}
                    className={cn(
                      "border-t border-zinc-200/70 dark:border-zinc-800/70",
                      "odd:bg-zinc-50/40 dark:odd:bg-zinc-900/30",
                      "hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors",
                    )}
                  >
                    {/* Name cell */}
                    <td className="py-3 px-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                            {r.name}
                          </div>
                          {!isActors && r.description ? (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap">
                              {r.description}
                            </div>
                          ) : null}
                          {/* Show note preview when collapsed */}
                          {hasNote && !isNoteOpen ? (
                            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic max-w-[300px] truncate">
                              {r.notes}
                            </div>
                          ) : null}
                        </div>

                        {/* Note toggle button */}
                        {editable && (
                          <button
                            type="button"
                            onClick={() => toggleNote(idx)}
                            title={
                              isNoteOpen
                                ? "Hide note"
                                : hasNote
                                  ? "Edit note"
                                  : "Add decision note"
                            }
                            className={cn(
                              "flex-shrink-0 p-1 rounded-lg transition-colors mt-0.5",
                              isNoteOpen
                                ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
                                : hasNote
                                  ? "text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                  : "text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                            )}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Classification cell */}
                    <td className="py-3 px-3">
                      {editable ? (
                        <select
                          value={classificationValue}
                          onChange={(e) =>
                            onUpdateRow?.(
                              idx,
                              isActors
                                ? { actor_type: e.target.value }
                                : { complexity: e.target.value },
                            )
                          }
                          className={cn(
                            "rounded-lg border text-xs font-semibold px-2.5 py-1.5 cursor-pointer appearance-none",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35",
                            "dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-50",
                            "bg-white border-zinc-200 text-zinc-800",
                            classificationValue === "simple" &&
                              "border-emerald-300 text-emerald-700 bg-emerald-50/60 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/20",
                            classificationValue === "average" &&
                              "border-blue-300 text-blue-700 bg-blue-50/60 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/20",
                            classificationValue === "complex" &&
                              "border-violet-300 text-violet-700 bg-violet-50/60 dark:border-violet-800 dark:text-violet-300 dark:bg-violet-950/20",
                          )}
                        >
                          {COMPLEXITY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant={badgeVariant}>
                          {classificationValue}
                        </Badge>
                      )}
                    </td>

                    {/* Weight cell */}
                    <td className="py-3 px-3 text-right font-semibold">
                      {editable ? (
                        <span
                          className={cn(
                            "inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold",
                            "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
                          )}
                        >
                          {r.weight}
                        </span>
                      ) : (
                        r.weight
                      )}
                    </td>
                  </tr>
                );

                // Expanded notes row
                const noteRow =
                  editable && isNoteOpen ? (
                    <tr
                      key={`${key}_note`}
                      className="border-t border-amber-200/60 dark:border-amber-800/30 bg-amber-50/40 dark:bg-amber-950/10"
                    >
                      <td colSpan={3} className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 mt-2 flex-shrink-0" />
                          <div className="flex-1">
                            <label className="block text-[10px] font-semibold text-amber-600 dark:text-amber-400 mb-1 uppercase tracking-wider">
                              Decision note — explain the classification or
                              value choice
                            </label>
                            <textarea
                              value={r.notes || ""}
                              onChange={(e) =>
                                onUpdateRow?.(idx, { notes: e.target.value })
                              }
                              placeholder={
                                isActors
                                  ? `Why is "${r.name}" classified as ${classificationValue}?`
                                  : `Why is "${r.name}" ${classificationValue} complexity?`
                              }
                              rows={2}
                              className={cn(
                                "w-full rounded-lg border border-amber-200/70 dark:border-amber-800/40",
                                "bg-white/80 dark:bg-zinc-950/60 px-3 py-2 text-xs resize-y",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
                                "dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
                              )}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null;

                return noteRow ? [mainRow, noteRow] : [mainRow];
              })
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="py-10 px-3 text-center text-zinc-500 dark:text-zinc-400"
                >
                  {isActors ? "No actors provided." : "No use cases provided."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

export default DataTable;
