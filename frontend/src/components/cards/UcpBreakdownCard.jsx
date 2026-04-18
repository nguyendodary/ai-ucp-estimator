import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const STEPS = [
  {
    step: '1',
    abbr: 'UAW',
    fullName: 'Unadjusted Actor Weight',
    description: 'Sum of all actor complexity weights.',
    rule: 'Simple = 1  |  Average = 2  |  Complex = 3',
    formulaFn: () => 'UAW = Σ (actor weights)',
    valueFn: (m) => Number(m.uaw).toFixed(0),
    highlight: false,
  },
  {
    step: '2',
    abbr: 'UUCW',
    fullName: 'Unadjusted Use Case Weight',
    description: 'Sum of all use case complexity weights.',
    rule: 'Simple = 5  |  Average = 10  |  Complex = 15',
    formulaFn: () => 'UUCW = Σ (use case weights)',
    valueFn: (m) => Number(m.uucw).toFixed(0),
    highlight: false,
  },
  {
    step: '3',
    abbr: 'UUCP',
    fullName: 'Unadjusted Use Case Points',
    description: 'Raw point total before complexity adjustments.',
    rule: null,
    formulaFn: (m) =>
      `UUCP = UAW + UUCW = ${Number(m.uaw).toFixed(0)} + ${Number(m.uucw).toFixed(0)}`,
    valueFn: (m) => Number(m.uucp).toFixed(0),
    highlight: false,
  },
  {
    step: '4',
    abbr: 'TCF',
    fullName: 'Technical Complexity Factor',
    description: 'Adjusts for technical difficulty across 13 factors (T1–T13).',
    rule: 'Baseline: all T-factors = 3 → TCF ≈ 0.99',
    formulaFn: (m) =>
      `TCF = 0.6 + (0.01 × TF) = ${Number(m.tcf).toFixed(3)}`,
    valueFn: (m) => Number(m.tcf).toFixed(3),
    highlight: false,
  },
  {
    step: '5',
    abbr: 'ECF',
    fullName: 'Environmental Complexity Factor',
    description: 'Adjusts for team experience and environment across 8 factors (E1–E8).',
    rule: 'Baseline: EF = 24 → ECF = 1.00',
    formulaFn: (m) =>
      `ECF = 1.0 + ((EF − 24) × 0.02) = ${Number(m.ecf).toFixed(3)}`,
    valueFn: (m) => Number(m.ecf).toFixed(3),
    highlight: false,
  },
  {
    step: '6',
    abbr: 'UCP',
    fullName: 'Use Case Points',
    description: 'Final adjusted complexity score for the project.',
    rule: null,
    formulaFn: (m) =>
      `UCP = UUCP × TCF × ECF = ${Number(m.uucp).toFixed(0)} × ${Number(m.tcf).toFixed(3)} × ${Number(m.ecf).toFixed(3)}`,
    valueFn: (m) => Number(m.ucp).toFixed(2),
    highlight: true,
  },
  {
    step: '7',
    abbr: 'Effort',
    fullName: 'Estimated Effort',
    description: 'Recommended industry multiplier of 20 person-hours per UCP.',
    rule: null,
    formulaFn: (m) =>
      `Effort = UCP × 20 = ${Number(m.ucp).toFixed(2)} × 20`,
    valueFn: (m) => `${Number(m.effort_hours).toFixed(1)} hrs`,
    highlight: true,
  },
];

function FormulaRow({ step, abbr, fullName, description, rule, formula, value, highlight }) {
  return (
    <div
      className={[
        'flex items-start gap-3 rounded-xl px-4 py-3',
        highlight
          ? 'bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40'
          : 'bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/40 dark:border-zinc-800/30',
      ].join(' ')}
    >
      {/* Step badge */}
      <div className="mt-0.5 flex-shrink-0 h-6 w-6 rounded-full bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300">
        {step}
      </div>

      {/* Label + formula */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{abbr}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">— {fullName}</span>
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{description}</div>
        {rule ? (
          <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-300">{rule}</div>
        ) : null}
        <div className="text-[12px] font-mono text-zinc-600 dark:text-zinc-300 mt-1 break-all">{formula}</div>
      </div>

      {/* Value */}
      <div className="flex-shrink-0 text-right">
        <div
          className={[
            'text-xl font-black tracking-tight',
            highlight
              ? 'text-blue-700 dark:text-blue-300'
              : 'text-zinc-900 dark:text-zinc-50',
          ].join(' ')}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function UcpBreakdownCard({ metrics }) {
  if (!metrics) return null;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">UCP Calculation Breakdown</CardTitle>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Step-by-step derivation of Use Case Points — formula, meaning, and computed value for each index.
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {STEPS.map((s) => (
          <FormulaRow
            key={s.abbr}
            step={s.step}
            abbr={s.abbr}
            fullName={s.fullName}
            description={s.description}
            rule={s.rule}
            formula={s.formulaFn(metrics)}
            value={s.valueFn(metrics)}
            highlight={s.highlight}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export default UcpBreakdownCard;
