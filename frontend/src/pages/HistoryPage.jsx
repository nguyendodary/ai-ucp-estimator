import React, { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Trash2, X } from 'lucide-react';

import { deleteProject, getProjectDetail, listProjects, exportProjectPdf } from '../api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import DataTable from '../components/tables/DataTable';
import WeightsCharts from '../components/charts/WeightsCharts';
import StatCard from '../components/cards/StatCard';

import { BriefcaseBusiness, Layers, Shield, Users } from 'lucide-react';

function formatMetric(v, decimals) {
  if (v === null || v === undefined) return '—';
  const num = Number(v);
  if (Number.isNaN(num)) return '—';
  return num.toFixed(decimals);
}

function Modal({ open, title, onClose, children, actions }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[520px] lg:w-[640px] bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-l border-zinc-200/70 dark:border-zinc-800/70 overflow-auto">
        <div className="p-5 flex items-start justify-between gap-3 border-b border-zinc-200/70 dark:border-zinc-800/70">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Project</div>
            <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-2xl border border-zinc-200/70 hover:bg-zinc-100/70 dark:border-zinc-800/70 dark:hover:bg-zinc-800/60 flex items-center justify-center"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
            </button>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await listProjects();
        if (!mounted) return;
        setProjects(res || []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.detail || e?.message || 'Failed to load projects.');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [projects, search]);

  const openProject = async (id) => {
    setSelectedId(id);
    setDetailError('');
    setDetailLoading(true);
    setSelectedDetail(null);
    try {
      const detail = await getProjectDetail(id);
      setSelectedDetail(detail);
    } catch (e) {
      setDetailError(e?.response?.data?.detail || e?.message || 'Failed to load project detail.');
    } finally {
      setDetailLoading(false);
    }
  };

  const modalOpen = selectedId !== null;

  const handleExportPdf = async () => {
    if (!selectedId) return;
    try {
      await exportProjectPdf(selectedId);
    } catch (e) {
      console.error('Failed to export PDF:', e);
    }
  };

  const handleDelete = async (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteProject(projectId);
      // Refresh the project list
      const res = await listProjects();
      setProjects(res || []);
      // Close modal if the deleted project was open
      if (selectedId === projectId) {
        setSelectedId(null);
        setSelectedDetail(null);
      }
    } catch (e) {
      console.error('Failed to delete project:', e);
      alert('Failed to delete project. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-50">History</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="h-9 w-[220px] rounded-xl border border-zinc-200/70 bg-white/70 px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-50"
        />
      </div>

      {loading ? (
        <Card className="rounded-2xl">
          <CardContent className="pt-0">
            <div className="h-6 w-48 bg-zinc-200/70 dark:bg-zinc-800/60 rounded animate-pulse" />
            <div className="mt-4 h-40 bg-zinc-200/60 dark:bg-zinc-800/40 rounded-2xl animate-pulse" />
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
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Run your first estimation to create a persisted project in the database.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Projects</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Project</th>
                    <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Created</th>
                    <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">UCP</th>
                    <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-right">Effort</th>
                    <th className="py-3 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => (
                    <tr
                      key={`${p.id}_${idx}`}
                      className="border-t border-zinc-200/70 dark:border-zinc-800/70 odd:bg-zinc-50/40 dark:odd:bg-zinc-900/30 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</td>
                      <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300">{p.created_at}</td>
                      <td className="py-3 px-3 font-semibold">{p.metrics?.ucp ?? '—'}</td>
                      <td className="py-3 px-3 text-right font-semibold">{p.metrics?.effort_hours ?? '—'}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="md" className="min-w-[108px]" onClick={() => openProject(p.id)}>
                            <Eye className="h-4 w-4" />
                            Open
                          </Button>
                          <Button variant="ghost" size="md" className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => handleDelete(p.id, p.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 px-3 text-center text-zinc-500 dark:text-zinc-400">
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

      <Modal
        open={modalOpen}
        title={selectedDetail?.name || 'Project detail'}
        onClose={() => {
          setSelectedId(null);
          setSelectedDetail(null);
          setDetailError('');
        }}
        actions={selectedDetail ? (
          <Button variant="outline" size="md" onClick={handleExportPdf}>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        ) : null}
      >
        {detailLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-40 bg-zinc-200/70 dark:bg-zinc-800/60 rounded" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/40" />
              ))}
            </div>
            <div className="h-[260px] bg-zinc-200/60 dark:bg-zinc-800/40 rounded-2xl" />
            <div className="h-56 bg-zinc-200/60 dark:bg-zinc-800/40 rounded-2xl" />
          </div>
        ) : detailError ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-50/30 text-red-700 dark:bg-red-500/10 dark:text-red-300 px-5 py-4 font-semibold">
            {detailError}
          </div>
        ) : selectedDetail ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="UAW" value={selectedDetail.metrics.uaw} icon={Users} format={(v) => formatMetric(v, 1)} />
              <StatCard label="UUCW" value={selectedDetail.metrics.uucw} icon={Layers} format={(v) => formatMetric(v, 1)} />
              <StatCard label="TCF" value={selectedDetail.metrics.tcf} icon={Shield} format={(v) => formatMetric(v, 3)} />
              <StatCard
                label="ECF"
                value={selectedDetail.metrics.ecf}
                icon={BriefcaseBusiness}
                format={(v) => formatMetric(v, 3)}
              />
              <StatCard label="UCP" value={selectedDetail.metrics.ucp} icon={Layers} format={(v) => formatMetric(v, 2)} />
              <StatCard
                label="Effort Hours"
                value={selectedDetail.metrics.effort_hours}
                icon={Users}
                format={(v) => formatMetric(v, 1)}
                unit="hrs"
              />
            </div>
            <WeightsCharts actors={selectedDetail.actors} useCases={selectedDetail.use_cases} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataTable variant="actors" rows={selectedDetail.actors} />
              <DataTable variant="use_cases" rows={selectedDetail.use_cases} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

