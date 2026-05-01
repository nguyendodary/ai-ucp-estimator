import React, { useMemo, useState } from "react";
import { Calendar, Clock, Users2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../../lib/utils";

/** Add `workingDays` working days (Mon–Fri) to `startDate`, returning a new Date. */
function addWorkingDays(startDate, workingDays) {
  const date = new Date(startDate);
  const total = Math.max(0, Math.ceil(workingDays));
  let added = 0;
  while (added < total) {
    date.setDate(date.getDate() + 1);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) added++;
  }
  return date;
}

function fmt(n, decimals = 1) {
  if (!Number.isFinite(n) || Number.isNaN(n)) return "—";
  return n.toFixed(decimals);
}

/** Clamp helper */
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v) || min));
}

/**
 * EstimationDetailsCard
 *
 * Shows a "Completion Estimate" panel derived from UCP effort hours.
 * The user can tune team size and hours-per-day to see how the calendar
 * duration changes in real time.
 *
 * Props
 * ─────
 * effortHours  number — total person-hours computed from UCP × 20
 */
function EstimationDetailsCard({ effortHours }) {
  const [numPeople, setNumPeople] = useState(3);
  const [hoursPerDay, setHoursPerDay] = useState(8);

  const { workingDays, workingWeeks, completionDate } = useMemo(() => {
    const teamHoursPerDay = numPeople * hoursPerDay;
    const days = teamHoursPerDay > 0 ? effortHours / teamHoursPerDay : 0;
    const weeks = days / 5;
    const date = addWorkingDays(new Date(), days);
    return { workingDays: days, workingWeeks: weeks, completionDate: date };
  }, [effortHours, numPeople, hoursPerDay]);

  const dateLabel = completionDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handlePeopleChange = (e) =>
    setNumPeople(clamp(e.target.value, 1, 200));
  const handleHoursChange = (e) =>
    setHoursPerDay(clamp(e.target.value, 1, 24));

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Completion Estimate</CardTitle>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Adjust team size and daily capacity to project calendar duration from{" "}
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {fmt(effortHours, 1)} effort-hours
          </span>
          .
        </p>
      </CardHeader>

      <CardContent className="pt-0 space-y-5">
        {/* ── Inputs ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Number of people */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              <Users2 className="h-3.5 w-3.5" />
              Number of People
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={numPeople}
              onChange={handlePeopleChange}
              className="h-10 w-full rounded-xl border border-zinc-200/70 bg-white/70 px-4 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-50"
            />
          </div>

          {/* Hours per day */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              <Clock className="h-3.5 w-3.5" />
              Hours per Day
            </label>
            <input
              type="number"
              min={1}
              max={24}
              value={hoursPerDay}
              onChange={handleHoursChange}
              className="h-10 w-full rounded-xl border border-zinc-200/70 bg-white/70 px-4 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-50"
            />
          </div>
        </div>

        {/* ── Output chips ── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Working days */}
          <div
            className={cn(
              "rounded-xl px-4 py-3 text-center",
              "bg-blue-50/60 dark:bg-blue-950/20",
              "border border-blue-200/50 dark:border-blue-800/40",
            )}
          >
            <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-1">
              Working Days
            </div>
            <div className="text-2xl font-black text-blue-700 dark:text-blue-300 leading-none">
              {fmt(workingDays)}
            </div>
          </div>

          {/* Working weeks */}
          <div
            className={cn(
              "rounded-xl px-4 py-3 text-center",
              "bg-violet-50/60 dark:bg-violet-950/20",
              "border border-violet-200/50 dark:border-violet-800/40",
            )}
          >
            <div className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 mb-1">
              Working Weeks
            </div>
            <div className="text-2xl font-black text-violet-700 dark:text-violet-300 leading-none">
              {fmt(workingWeeks)}
            </div>
          </div>

          {/* Estimated completion date */}
          <div
            className={cn(
              "rounded-xl px-4 py-3 text-center",
              "bg-emerald-50/60 dark:bg-emerald-950/20",
              "border border-emerald-200/50 dark:border-emerald-800/40",
            )}
          >
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
              <Calendar className="h-3 w-3" />
              Est. Completion
            </div>
            <div className="text-sm font-black text-emerald-700 dark:text-emerald-300 leading-tight">
              {dateLabel}
            </div>
          </div>
        </div>

        {/* ── Formula hint ── */}
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          <span className="font-mono">
            working days = effort-hours ÷ (people × hours/day)
          </span>{" "}
          · Completion date counts Mon–Fri only, starting from today.
        </p>
      </CardContent>
    </Card>
  );
}

export default EstimationDetailsCard;
