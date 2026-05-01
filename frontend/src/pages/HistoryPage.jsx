import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  Download,
  Eye,
  Layers,
  Pencil,
  Shield,
  Trash2,
  Users,
} from "lucide-react";

import {
  deleteProject,
  exportProjectPdf,
  getProjectDetail,
  listProjects,
} from "../api";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import DataTable from "../components/tables/DataTable";
import WeightsCharts from "../components/charts/WeightsCharts";
import StatCard from "../components/cards/StatCard";
import UcpBreakdownCard from "../components/cards/UcpBreakdownCard";
import EstimationDetailsCard from "../components/cards/EstimationDetailsCard";
import { cn } from "../lib/utils";

// ─── UCP weight maps (mirrors backend calculator) ──────────────────────────
const ACTOR_WEIGHTS = { simple: 1, average: 2, complex: 3 };
const UC_WEIGHTS = { simple: 5, average: 10, complex: 15 };

/**
 * Client-side metric recalculation — called whenever a classification is
 * changed in the editable tables.  TCF and ECF are fixed from the API.
 */
function recalculate(actors, useCases, tcf, ecf) {
  const updatedActors = actors.map((a) => ({
    ...a,
    weight: ACTOR_WEIGHTS[a.actor_type] ?? 1,
  }));
  const updatedUseCases = useCases.map((uc) => ({
    ...uc,
    weight: UC_WEIGHTS[uc.complexity] ?? 5,
  }));
  const uaw = updatedActors.reduce((s, a) => s + a.weight, 0);
  const uucw = updatedUseCases.reduce((s, uc) => s + uc.weight, 0);
  const uucp = uaw + uucw;
  const ucp = uucp * tcf * ecf;
  const effort_hours = ucp * 20;
  return {
    actors: updatedActors,
    useCases: updatedUseCases,
    metrics: { uaw, uucw, uucp, tcf, ecf, ucp, effort_hours },
  };
}

function formatMetric(v, decimals) {
  if (v === null || v === undefined) return "—";
  const num = Number(v);
  if (Number.isNaN(num)) return "—";
  return num.toFixed(decimals);
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-[92px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/40"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-[360px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/40"
          />
        ))}
      </div>
      <div className="h-[420px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/40" />
      <div className="h-[160px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/40" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-[280px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/40"
          />
        ))}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  // ── List state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");

  // ── Detail / drill-down state ──────────────────────────────────────────────
  const [view, setView] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // ── Editing state ──────────────────────────────────────────────────────────
  // editedDetail is a local copy of selectedDetail enriched with `notes` fields.
  // It diverges from selectedDetail when the user changes classifications.
  const [editedDetail, setEditedDetail] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  // Signals that the next load should automatically open in editing mode.
  const pendingEditRef = useRef(false);

  // ── Load project list on mount ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await listProjects();
        if (!mounted) return;
        setProjects(res || []);
      } catch (e) {
        if (!mounted) return;
        setError(
          e?.response?.data?.detail || e?.message || "Failed to load projects.",
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ── Initialise editedDetail whenever a fresh project detail arrives ────────
  useEffect(() => {
    if (!selectedDetail) {
      setEditedDetail(null);
      return;
    }
    setEditedDetail({
      ...selectedDetail,
      actors: selectedDetail.actors.map((a) => ({ ...a, notes: "" })),
      use_cases: selectedDetail.use_cases.map((uc) => ({ ...uc, notes: "" })),
    });
    // Apply the pending edit flag that was set before the async load.
    setIsEditing(pendingEditRef.current);
    pendingEditRef.current = false;
  }, [selectedDetail]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [projects, search]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  /**
   * Open a project's detail view.
   * @param {number}  id           — project id
   * @param {boolean} startEditing — if true, detail view opens in editing mode
   */
  const openProject = async (id, startEditing = false) => {
    setView("detail");
    setSelectedId(id);
    setDetailLoading(true);
    setDetailError("");
    setSelectedDetail(null);
    setEditedDetail(null);
    setIsEditing(false);
    pendingEditRef.current = startEditing;
    try {
      const detail = await getProjectDetail(id);
      setSelectedDetail(detail);
    } catch (e) {
      setDetailError(
        e?.response?.data?.detail ||
          e?.message ||
          "Failed to load project detail.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBack = () => {
    setView("list");
    setSelectedId(null);
    setSelectedDetail(null);
    setEditedDetail(null);
    setIsEditing(false);
    setDetailError("");
  };

  const handleExportPdf = async () => {
    if (!selectedId) return;
    try {
      await exportProjectPdf(selectedId);
    } catch (e) {
      console.error("Failed to export PDF:", e);
    }
  };

  const handleDelete = async (projectId, projectName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${projectName}"? This action cannot be undone.`,
      )
    )
      return;
    try {
      await deleteProject(projectId);
      const res = await listProjects();
      setProjects(res || []);
      if (selectedId === projectId) handleBack();
    } catch (e) {
      console.error("Failed to delete project:", e);
      alert("Failed to delete project. Please try again.");
    }
  };

  // ── Editing handlers ────────────────────────────────────────────────────────
  const handleUpdateActor = (index, patch) => {
    setEditedDetail((prev) => {
      if (!prev) return prev;
      const newActors = prev.actors.map((a, i) =>
        i === index ? { ...a, ...patch } : a,
      );
      const { actors, useCases, metrics } = recalculate(
        newActors,
        prev.use_cases,
        prev.metrics.tcf,
        prev.metrics.ecf,
      );
      return { ...prev, actors, use_cases: useCases, metrics };
    });
  };

  const handleUpdateUseCase = (index, patch) => {
    setEditedDetail((prev) => {
      if (!prev) return prev;
      const newUseCases = prev.use_cases.map((uc, i) =>
        i === index ? { ...uc, ...patch } : uc,
      );
      const { actors, useCases, metrics } = recalculate(
        prev.actors,
        newUseCases,
        prev.metrics.tcf,
        prev.metrics.ecf,
      );
      return { ...prev, actors, use_cases: useCases, metrics };
    });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "detail") {
    return (
      <div className="space-y-6">
        {/* ── Top bar ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Left: back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/70 bg-white/60 px-3 py-2 text-sm font-semibold hover:bg-zinc-100/70 dark:bg-zinc-900/40 dark:border-zinc-800/70 dark:hover:bg-zinc-900/60 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {editedDetail ? (
              <div className="min-w-0">
                <h2 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                  {editedDetail.name}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isEditing
                    ? "Editing mode — classification changes update all metrics in real time."
                    : `Created ${editedDetail.created_at}`}
                </p>
              </div>
            ) : (
              <h2 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                Project Detail
              </h2>
            )}
          </div>

          {/* Right: action buttons */}
          {editedDetail ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Edit / Done toggle */}
              <Button
                variant={isEditing ? "default" : "outline"}
                size="md"
                onClick={() => setIsEditing((v) => !v)}
                className={cn(
                  "gap-1.5",
                  isEditing &&
                    "bg-emerald-600 hover:bg-emerald-700 border-emerald-600",
                )}
              >
                {isEditing ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Done Editing
                  </>
                ) : (
                  <>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </>
                )}
              </Button>

              <Button variant="outline" size="md" onClick={handleExportPdf}>
                <Download className="h-4 w-4" />
                Export PDF
              </Button>

              <Button
                variant="ghost"
                size="md"
                className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                onClick={() => handleDelete(selectedId, editedDetail.name)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>

        {/* ── Content ── */}
        {detailLoading ? (
          <DetailSkeleton />
        ) : detailError ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-50/30 text-red-700 dark:bg-red-500/10 dark:text-red-300 px-5 py-4 font-semibold">
            {detailError}
          </div>
        ) : editedDetail ? (
          <div className="space-y-6">
            {/* Metric stat cards — live-updated from editedDetail */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              <StatCard
                label="UAW"
                value={editedDetail.metrics.uaw}
                icon={Users}
                format={(v) => formatMetric(v, 0)}
              />
              <StatCard
                label="UUCW"
                value={editedDetail.metrics.uucw}
                icon={Layers}
                format={(v) => formatMetric(v, 0)}
              />
              <StatCard
                label="UUCP"
                value={editedDetail.metrics.uucp}
                icon={Layers}
                format={(v) => formatMetric(v, 0)}
              />
              <StatCard
                label="TCF"
                value={editedDetail.metrics.tcf}
                icon={Shield}
                format={(v) => formatMetric(v, 3)}
              />
              <StatCard
                label="ECF"
                value={editedDetail.metrics.ecf}
                icon={BriefcaseBusiness}
                format={(v) => formatMetric(v, 3)}
              />
              <StatCard
                label="UCP"
                value={editedDetail.metrics.ucp}
                icon={Layers}
                format={(v) => formatMetric(v, 2)}
              />
              <StatCard
                label="Effort Hours"
                value={editedDetail.metrics.effort_hours}
                icon={Users}
                format={(v) => formatMetric(v, 1)}
                unit="hrs"
              />
            </div>

            {/* Weight distribution charts */}
            <WeightsCharts
              actors={editedDetail.actors}
              useCases={editedDetail.use_cases}
            />

            {/* Formula breakdown */}
            <UcpBreakdownCard metrics={editedDetail.metrics} />

            {/* Completion estimate */}
            <EstimationDetailsCard
              effortHours={editedDetail.metrics.effort_hours}
            />

            {/* Actors & use-cases tables — editable when isEditing=true */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataTable
                variant="actors"
                rows={editedDetail.actors}
                editable={isEditing}
                onUpdateRow={handleUpdateActor}
              />
              <DataTable
                variant="use_cases"
                rows={editedDetail.use_cases}
                editable={isEditing}
                onUpdateRow={handleUpdateUseCase}
              />
            </div>

            {/* Editing hint banner */}
            {isEditing && (
              <div className="rounded-xl border border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/10 dark:border-amber-700/30 px-5 py-3 text-xs text-amber-700 dark:text-amber-300 font-medium">
                <span className="font-bold">Editing mode:</span> Change actor
                types or use-case complexities in the tables above — UAW, UUCW,
                UUCP, UCP, and Effort update instantly. Click 💬 on any row to
                record a decision note. Click{" "}
                <span className="font-bold">Done Editing</span> when finished.
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          History
        </h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="h-9 w-[220px] rounded-xl border border-zinc-200/70 bg-white/70 px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-50"
        />
      </div>

      {loading ? (
        <Card className="rounded-2xl">
          <CardContent className="pt-6 space-y-3 animate-pulse">
            <div className="h-5 w-48 bg-zinc-200/70 dark:bg-zinc-800/60 rounded" />
            <div className="h-40 bg-zinc-200/60 dark:bg-zinc-800/40 rounded-2xl" />
          </CardContent>
        </Card>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-50/30 text-red-700 dark:bg-red-500/10 dark:text-red-300 px-5 py-4 font-semibold">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">No project history yet</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Run your first estimation to create a persisted project in the
              database.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">
              Projects{" "}
              <span className="ml-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                ({filtered.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Project
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Created
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      UUCP
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      UCP
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                      Effort
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => (
                    <tr
                      key={`${p.id}_${idx}`}
                      className="border-t border-zinc-200/70 dark:border-zinc-800/70 odd:bg-zinc-50/40 dark:odd:bg-zinc-900/30 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-50 max-w-[240px] truncate">
                        {p.name}
                      </td>
                      <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {p.created_at}
                      </td>
                      <td className="py-3 px-3 font-semibold">
                        {p.metrics?.uucp ?? "—"}
                      </td>
                      <td className="py-3 px-3 font-semibold">
                        {p.metrics?.ucp != null
                          ? Number(p.metrics.ucp).toFixed(2)
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold">
                        {p.metrics?.effort_hours != null
                          ? `${Number(p.metrics.effort_hours).toFixed(1)} hrs`
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* ── Edit button ── */}
                          <Button
                            variant="outline"
                            size="md"
                            onClick={() => openProject(p.id, true)}
                            className="gap-1.5 text-amber-600 border-amber-300/70 hover:bg-amber-50 hover:border-amber-400 dark:text-amber-400 dark:border-amber-700/50 dark:hover:bg-amber-950/20"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>

                          {/* ── Open button ── */}
                          <Button
                            variant="outline"
                            size="md"
                            className="min-w-[80px]"
                            onClick={() => openProject(p.id)}
                          >
                            <Eye className="h-4 w-4" />
                            Open
                          </Button>

                          {/* ── Delete button ── */}
                          <Button
                            variant="ghost"
                            size="md"
                            className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                            onClick={() => handleDelete(p.id, p.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 px-3 text-center text-zinc-500 dark:text-zinc-400"
                      >
                        No projects match your search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
