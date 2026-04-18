import React, { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Download,
  Layers,
  Shield,
  Users,
} from "lucide-react";

import { getProjectDetail, listProjects, exportProjectPdf } from "../api";
import StatCard from "../components/cards/StatCard";
import DataTable from "../components/tables/DataTable";
import WeightsCharts from "../components/charts/WeightsCharts";
import UcpBreakdownCard from "../components/cards/UcpBreakdownCard";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/30 p-5 h-[92px]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/30 p-6 h-[380px]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/30 p-6 h-[320px]"
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage({ onNewAnalysis }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const projects = await listProjects();
        if (!mounted) return;
        if (!projects || projects.length === 0) {
          setLatest(null);
          return;
        }
        const detail = await getProjectDetail(projects[0].id);
        if (!mounted) return;
        setLatest(detail);
      } catch (e) {
        if (!mounted) return;
        setError(
          e?.response?.data?.detail || e?.message || "Failed to load history.",
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

  const formatMetric = (v, decimals) => {
    if (v === null || v === undefined) return "—";
    const num = Number(v);
    if (Number.isNaN(num)) return "—";
    return num.toFixed(decimals);
  };

  const header = useMemo(() => {
    if (!latest) return null;
    return `Latest analysis: ${latest.name}`;
  }, [latest]);

  const handleExportPdf = async () => {
    if (!latest?.id) return;
    try {
      await exportProjectPdf(latest.id);
    } catch (e) {
      console.error("Failed to export PDF:", e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          Analytics Snapshot
        </h2>
        {latest ? (
          <Button
            variant="outline"
            size="md"
            onClick={handleExportPdf}
            className="hidden sm:inline-flex"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        ) : null}
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-50/30 text-red-700 dark:bg-red-500/10 dark:text-red-300 px-5 py-4 font-semibold">
          {error}
        </div>
      ) : latest ? (
        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">
                    {latest.name || header}
                  </CardTitle>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Created {latest.created_at}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                <StatCard
                  label="UAW"
                  value={latest.metrics.uaw}
                  icon={Users}
                  format={(v) => formatMetric(v, 0)}
                />
                <StatCard
                  label="UUCW"
                  value={latest.metrics.uucw}
                  icon={Layers}
                  format={(v) => formatMetric(v, 0)}
                />
                <StatCard
                  label="UUCP"
                  value={latest.metrics.uucp}
                  icon={Layers}
                  format={(v) => formatMetric(v, 0)}
                />
                <StatCard
                  label="TCF"
                  value={latest.metrics.tcf}
                  icon={Shield}
                  format={(v) => formatMetric(v, 3)}
                />
                <StatCard
                  label="ECF"
                  value={latest.metrics.ecf}
                  icon={BriefcaseBusiness}
                  format={(v) => formatMetric(v, 3)}
                />
                <StatCard
                  label="UCP"
                  value={latest.metrics.ucp}
                  icon={Layers}
                  format={(v) => formatMetric(v, 2)}
                />
                <StatCard
                  label="Effort Hours"
                  value={latest.metrics.effort_hours}
                  icon={Users}
                  format={(v) => formatMetric(v, 1)}
                  unit="hrs"
                />
              </div>
            </CardContent>
          </Card>

          <WeightsCharts actors={latest.actors} useCases={latest.use_cases} />

          <UcpBreakdownCard metrics={latest.metrics} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataTable variant="actors" rows={latest.actors} />
            <DataTable variant="use_cases" rows={latest.use_cases} />
          </div>
        </div>
      ) : (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">No analyses yet</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Start a new analysis to generate UCP metrics and history.
            </div>
            {onNewAnalysis ? (
              <div className="mt-5">
                <Button onClick={onNewAnalysis} variant="default">
                  Create first analysis
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
