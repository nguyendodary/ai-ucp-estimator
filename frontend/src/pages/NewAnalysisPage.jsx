import React, { useMemo, useState } from 'react';

import { analyzeFile, analyzeManual, analyzeText } from '../api';
import ActorsUseCasesPanel from '../components/input/ActorsUseCasesPanel';
import FileDropzone from '../components/input/FileDropzone';
import DataTable from '../components/tables/DataTable';
import WeightsCharts from '../components/charts/WeightsCharts';
import StatCard from '../components/cards/StatCard';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';

import { BriefcaseBusiness, ClipboardList, Layers, RefreshCw, Shield, Sparkles, Users } from 'lucide-react';
import { cn } from '../lib/utils';

const ACTOR_TYPES = ['simple', 'average', 'complex'];
const COMPLEXITIES = ['simple', 'average', 'complex'];

function ResultsEmpty() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="py-12 text-center">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Run estimation to compute UCP metrics and render actors / use-cases.
        </div>
      </CardContent>
    </Card>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/30 p-5 animate-pulse"
          >
            <div className="h-3 w-16 bg-zinc-200/70 dark:bg-zinc-800/60 rounded-full" />
            <div className="h-7 mt-3 w-20 bg-zinc-200/70 dark:bg-zinc-800/60 rounded-md" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/30 p-6 animate-pulse">
            <div className="h-4 w-44 bg-zinc-200/70 dark:bg-zinc-800/60 rounded mb-4" />
            <div className="h-[280px] bg-zinc-200/60 dark:bg-zinc-800/40 rounded-2xl" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/30 p-6 animate-pulse">
            <div className="h-4 w-36 bg-zinc-200/70 dark:bg-zinc-800/60 rounded mb-4" />
            <div className="h-56 bg-zinc-200/60 dark:bg-zinc-800/40 rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { key: 'ai', label: 'AI Extraction', Icon: Sparkles },
  { key: 'manual', label: 'Manual', Icon: ClipboardList },
];

export default function NewAnalysisPage({ onNavigateHistory }) {
  const [mode, setMode] = useState('ai');
  const [projectName, setProjectName] = useState('');
  const [requirementsText, setRequirementsText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const [actors, setActors] = useState([]);
  const [useCases, setUseCases] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [fileError, setFileError] = useState('');

  const isManual = mode === 'manual';
  const canRunManual = actors.length > 0 && useCases.length > 0;
  const canRunAI = requirementsText.trim().length >= 10 || !!selectedFile;
  const canRun = isManual ? canRunManual : canRunAI;

  const fileKind = useMemo(() => {
    if (!selectedFile) return '';
    if (selectedFile.name?.toLowerCase().endsWith('.pdf')) return 'PDF';
    if (selectedFile.name?.toLowerCase().endsWith('.docx')) return 'DOCX';
    if (selectedFile.name?.toLowerCase().endsWith('.txt')) return 'TXT';
    return 'FILE';
  }, [selectedFile]);

  const updateActor = (id, patch) => setActors((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const updateUseCase = (id, patch) => setUseCases((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const validateManual = () => {
    if (!canRunManual) return 'Add at least one actor and one use case.';
    for (const a of actors) {
      if (!a.name.trim()) return 'Actor name is required.';
      if (!ACTOR_TYPES.includes(a.type)) return 'Invalid actor type.';
    }
    for (const uc of useCases) {
      if (!uc.name.trim()) return 'Use case name is required.';
      if (!COMPLEXITIES.includes(uc.complexity)) return 'Invalid use case complexity.';
    }
    return '';
  };

  const runEstimation = async () => {
    setError('');
    setFileError('');
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
            description: uc.description || '',
            complexity: uc.complexity,
          })),
        };

        const data = await analyzeManual(payload);
        setResult(data);
        onNavigateHistory?.();
        return;
      }

      if (!canRunAI) throw new Error('Provide at least 10 characters of requirements or upload a file.');

      if (selectedFile) {
        const data = await analyzeFile(selectedFile, projectName.trim() || null);
        setResult(data);
        onNavigateHistory?.();
        return;
      }

      const data = await analyzeText(requirementsText, projectName.trim() || null);
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to run estimation.');
    } finally {
      setLoading(false);
    }
  };

  const formatMetric = (v, decimals) => {
    if (v === null || v === undefined) return '—';
    const num = Number(v);
    if (Number.isNaN(num)) return '—';
    return num.toFixed(decimals);
  };

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl">
        <CardHeader className="pb-4">
          {/* Project name */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Project name
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
                  'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150',
                  mode === key
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-soft'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {mode === 'ai' ? (
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
                  setFileError('');
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
                  { id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, name: '', type: 'simple' },
                ])
              }
              onRemoveActor={(id) => setActors((prev) => prev.filter((a) => a.id !== id))}
              onUpdateActor={(id, patch) => updateActor(id, patch)}
              onAddUseCase={() =>
                setUseCases((prev) => [
                  ...prev,
                  {
                    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    name: '',
                    description: '',
                    complexity: 'simple',
                  },
                ])
              }
              onRemoveUseCase={(id) => setUseCases((prev) => prev.filter((u) => u.id !== id))}
              onUpdateUseCase={(id, patch) => updateUseCase(id, patch)}
            />
          )}
        </CardContent>
      </Card>

      {/* Run button */}
      <div className="flex items-center justify-center">
        <Button
          size="lg"
          className="px-10"
          onClick={runEstimation}
          disabled={loading || !canRun}
        >
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          {loading ? 'Running…' : 'Run Estimation'}
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-50/30 text-red-700 dark:bg-red-500/10 dark:text-red-300 px-5 py-3.5 text-sm font-semibold">
          {error}
        </div>
      ) : null}

      {loading && !result ? <ResultSkeleton /> : null}

      {result ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="UAW" value={result.metrics.uaw} icon={Users} format={(v) => formatMetric(v, 1)} />
            <StatCard label="UUCW" value={result.metrics.uucw} icon={Layers} format={(v) => formatMetric(v, 1)} />
            <StatCard label="TCF" value={result.metrics.tcf} icon={Shield} format={(v) => formatMetric(v, 3)} />
            <StatCard label="ECF" value={result.metrics.ecf} icon={BriefcaseBusiness} format={(v) => formatMetric(v, 3)} />
            <StatCard label="UCP" value={result.metrics.ucp} icon={Layers} format={(v) => formatMetric(v, 2)} />
            <StatCard label="Effort" value={result.metrics.effort_hours} icon={Users} format={(v) => formatMetric(v, 1)} unit="hrs" />
          </div>

          <WeightsCharts actors={result.actors} useCases={result.use_cases} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataTable variant="actors" rows={result.actors} />
            <DataTable variant="use_cases" rows={result.use_cases} />
          </div>
        </div>
      ) : loading ? null : <ResultsEmpty />}
    </div>
  );
}
