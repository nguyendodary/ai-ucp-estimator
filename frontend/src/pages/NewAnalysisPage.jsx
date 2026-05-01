import React, { useEffect, useMemo, useState } from "react";

import { analyzeFile, analyzeManual, analyzeText } from "../api";
import ActorsUseCasesPanel from "../components/input/ActorsUseCasesPanel";
import FileDropzone from "../components/input/FileDropzone";
import DataTable from "../components/tables/DataTable";
import WeightsCharts from "../components/charts/WeightsCharts";
import StatCard from "../components/cards/StatCard";
import UcpBreakdownCard from "../components/cards/UcpBreakdownCard";
import EstimationDetailsCard from "../components/cards/EstimationDetailsCard";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";

import {
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardList,
  Layers,
  Pencil,
  RefreshCw,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "../lib/utils";

// ─── UCP weight maps (mirrors the backend calculator) ──────────────────────
const ACTOR_WEIGHTS = { simple: 1, average: 2, complex: 3 };
const UC_WEIGHTS = { simple: 5, average: 10, complex: 15 };

const ACTOR_TYPES = ["simple", "average", "complex"];
const COMPLEXITIES = ["simple", "average", "complex"];

// ─── Client-side metric recalculation ──────────────────────────────────────
/**
 * Given (possibly edited) actors and use-cases, recompute all UCP metrics.
 * TCF and ECF are taken directly from the original API result and never change.
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

// ─── Skeleton / empty placeholders ─────────────────────────────────────────
function ResultsEmpty() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="py-14 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Run estimation to compute UCP metrics and render actors / use-cases.
        </p>
      </CardContent>
    </Card>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/30 p-5"
          >
            <div className="h-3 w-16 bg-zinc-200/70 dark:bg-zinc-800/60 rounded-full" />
            <div className="h-7 mt-3 w-20 bg-zinc-200/70 dark:bg-zinc-800/60 rounded-md" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/30 p-6"
          >
            <div className="h-4 w-44 bg-zinc-200/70 dark:bg-zinc-800/60 rounded mb-4" />
            <div className="h-[280px] bg-zinc-200/60 dark:bg-zinc-800/40 rounded-2xl" />
          </div>
        ))}
      </div>
      <div className="h-[400px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/40" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/30 p-6"
          >
            <div className="h-4 w-36 bg-zinc-200/70 dark:bg-zinc-800/60 rounded mb-4" />
            <div className="h-56 bg-zinc-200/60 dark:bg-zinc-800/40 rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mode tabs ──────────────────────────────────────────────────────────────
const TABS = [
  { key: "ai", label: "AI Extraction", Icon: Sparkles },
  { key: "manual", label: "Manual", Icon: ClipboardList },
];

function fmt(v, decimals) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  return Number.isNaN(n) ? "—" : n.toFixed(decimals);
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function NewAnalysisPage({ onNavigateHistory }) {
  const [mode, setMode] = useState("ai");
  const [projectName, setProjectName] = useState("");
  const [requirementsText, setRequirementsText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [actors, setActors] = useState([]);
  const [useCases, setUseCases] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // raw API result
  const [fileError, setFileError] = useState("");

  // ── Editable result (local copy of `result` that can diverge on edits) ──
  const [editedResult, setEditedResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const isManual = mode === "manual";
  const canRunManual = actors.length > 0 && useCases.length > 0;
  const canRunAI = requirementsText.trim().length >= 10 || !!selectedFile;
  const canRun = isManual ? canRunManual : canRunAI;

  // Auto-fill project name when AI detects one and field is still empty
  useEffect(() => {
    if (result?.project_name && !projectName.trim()) {
      setProjectName(result.project_name);
    }
  }, [result]);

  // Initialise editedResult whenever a fresh API result arrives
  useEffect(() => {
    if (!result) {
      setEditedResult(null);
      return;
    }
    setEditedResult({
      ...result,
      actors: result.actors.map((a) => ({ ...a, notes: "" })),
      use_cases: result.use_cases.map((uc) => ({ ...uc, notes: "" })),
    });
    setIsEditing(false);
  }, [result]);

  // ── Manual panel handlers ───────────────────────────────────────────────
  const updateActor = (id, patch) =>
    setActors((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  const updateUseCase = (id, patch) =>
    setUseCases((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    );

  const validateManual = () => {
    if (!canRunManual) return "Add at least one actor and one use case.";
    for (const a of actors) {
      if (!a.name.trim()) return "Actor name is required.";
      if (!ACTOR_TYPES.includes(a.type)) return "Invalid actor type.";
    }
    for (const uc of useCases) {
      if (!uc.name.trim()) return "Use case name is required.";
      if (!COMPLEXITIES.includes(uc.complexity))
        return "Invalid use case complexity.";
    }
    return "";
  };

  // ── Editable result handlers ─────────────────────────────────────────────
  /**
   * Update an actor at `index` with `patch`, then recalculate all metrics.
   */
  const handleUpdateActor = (index, patch) => {
    setEditedResult((prev) => {
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

  /**
   * Update a use-case at `index` with `patch`, then recalculate all metrics.
   */
  const handleUpdateUseCase = (index, patch) => {
    setEditedResult((prev) => {
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

  // ── Run estimation ────────────────────────────────────────────────────────
  const runEstimation = async () => {
    setError("");
    setFileError("");
    setLoading(true);
    setResult(null);

    try {
      if (isManual) {
        const manualError = validateManual();
        if (manualError) throw new Error(manualError);

        const payload = {
          project_name: projectName.trim() || null,
          actors: actors.map((a) => ({ name: a.name.trim(), type: a.type })),
          use_cases: useCases.map((uc) => ({
            name: uc.name.trim(),
            description: uc.description || "",
            complexity: uc.complexity,
          })),
        };

        const data = await analyzeManual(payload);
        setResult(data);
        return;
      }

      if (!canRunAI)
        throw new Error(
          "Provide at least 10 characters of requirements or upload a file.",
        );

      if (selectedFile) {
        const data = await analyzeFile(
          selectedFile,
          projectName.trim() || null,
        );
        setResult(data);
        return;
      }

      const data = await analyzeText(
        requirementsText,
        projectName.trim() || null,
      );
      setResult(data);
    } catch (e) {
      setError(
        e?.response?.data?.detail || e?.message || "Failed to run estimation.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Input card ── */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-4">
          {/* Project name */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Project name
              <span className="ml-1.5 font-normal text-zinc-400">
                (optional — detected automatically from text)
              </span>
            </label>
            <input
              className="h-10 w-full rounded-xl border border-zinc-200/70 bg-white/70 px-4 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-50"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Mobile Payments Revamp"
            />
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 w-fit">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150",
                  mode === key
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-soft"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {mode === "ai" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Requirements
                </label>
                <textarea
                  value={requirementsText}
                  onChange={(e) => setRequirementsText(e.target.value)}
                  placeholder="Paste the software requirements here…"
                  className="w-full rounded-xl border border-zinc-200/70 bg-white/70 px-4 py-3 font-mono text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-50 min-h-[180px] resize-y"
                />
              </div>
              <FileDropzone
                file={selectedFile}
                onFileChange={(f) => {
                  setSelectedFile(f);
                  setFileError("");
                }}
                error={fileError}
              />
            </div>
          ) : (
            <ActorsUseCasesPanel
              actors={actors}
              useCases={useCases}
              onAddActor={() =>
                setActors((prev) => [
                  ...prev,
                  {
                    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    name: "",
                    type: "simple",
                  },
                ])
              }
              onRemoveActor={(id) =>
                setActors((prev) => prev.filter((a) => a.id !== id))
              }
              onUpdateActor={(id, patch) => updateActor(id, patch)}
              onAddUseCase={() =>
                setUseCases((prev) => [
                  ...prev,
                  {
                    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    name: "",
                    description: "",
                    complexity: "simple",
                  },
                ])
              }
              onRemoveUseCase={(id) =>
                setUseCases((prev) => prev.filter((u) => u.id !== id))
              }
              onUpdateUseCase={(id, patch) => updateUseCase(id, patch)}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Run button ── */}
      <div className="flex items-center justify-center">
        <Button
          size="lg"
          className="px-10"
          onClick={runEstimation}
          disabled={loading || !canRun}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {loading ? "Running…" : "Run Estimation"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-50/30 text-red-700 dark:bg-red-500/10 dark:text-red-300 px-5 py-3.5 text-sm font-semibold">
          {error}
        </div>
      ) : null}

      {loading && !result ? <ResultSkeleton /> : null}

      {/* ── Results ── */}
      {editedResult ? (
        <div className="space-y-6">
          {/* Results header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  Estimation Results
                  {editedResult.project_name ? (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      — {editedResult.project_name}
                    </span>
                  ) : null}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isEditing
                    ? "Editing mode — classification changes update all metrics in real time."
                    : "Saved to history. Edit values, add notes, and estimate completion below."}
                </p>
              </div>
            </div>

            {/* Edit / Done toggle */}
            <Button
              variant={isEditing ? "default" : "outline"}
              size="md"
              onClick={() => setIsEditing((v) => !v)}
              className={cn(
                "flex-shrink-0 gap-1.5",
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
                  Edit Results
                </>
              )}
            </Button>
          </div>

          {/* Metric stat cards — live-updated from editedResult */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatCard
              label="UAW"
              value={editedResult.metrics.uaw}
              icon={Users}
              format={(v) => fmt(v, 0)}
            />
            <StatCard
              label="UUCW"
              value={editedResult.metrics.uucw}
              icon={Layers}
              format={(v) => fmt(v, 0)}
            />
            <StatCard
              label="UUCP"
              value={editedResult.metrics.uucp}
              icon={Layers}
              format={(v) => fmt(v, 0)}
            />
            <StatCard
              label="TCF"
              value={editedResult.metrics.tcf}
              icon={Shield}
              format={(v) => fmt(v, 3)}
            />
            <StatCard
              label="ECF"
              value={editedResult.metrics.ecf}
              icon={BriefcaseBusiness}
              format={(v) => fmt(v, 3)}
            />
            <StatCard
              label="UCP"
              value={editedResult.metrics.ucp}
              icon={Layers}
              format={(v) => fmt(v, 2)}
            />
            <StatCard
              label="Effort"
              value={editedResult.metrics.effort_hours}
              icon={Users}
              format={(v) => fmt(v, 1)}
              unit="hrs"
            />
          </div>

          {/* Weight distribution charts */}
          <WeightsCharts
            actors={editedResult.actors}
            useCases={editedResult.use_cases}
          />

          {/* Formula breakdown */}
          <UcpBreakdownCard metrics={editedResult.metrics} />

          {/* ── Completion estimate ── */}
          <EstimationDetailsCard
            effortHours={editedResult.metrics.effort_hours}
          />

          {/* Detailed tables — editable when isEditing=true */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataTable
              variant="actors"
              rows={editedResult.actors}
              editable={isEditing}
              onUpdateRow={handleUpdateActor}
            />
            <DataTable
              variant="use_cases"
              rows={editedResult.use_cases}
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
      ) : loading ? null : (
        <ResultsEmpty />
      )}
    </div>
  );
}
