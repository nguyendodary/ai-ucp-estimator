import React from 'react';

import { cn } from '../../lib/utils';
import { Card } from '../ui/card';

function StatCard({ label, value, icon: Icon, valueClassName, format, unit }) {
  const displayValue =
    value === null || value === undefined
      ? '—'
      : typeof format === 'function'
        ? format(value)
        : format
          ? value.toFixed(format)
          : value;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden',
        'hover:shadow-soft hover:border-zinc-300/70 transition-all duration-200',
        'cursor-default'
      )}
    >
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center">
          {Icon ? (
            <Icon className="h-5 w-5 text-blue-700 dark:text-blue-200" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-blue-600" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {label}
          </div>
          <div
            className={cn(
              'mt-2 text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50',
              valueClassName
            )}
          >
            {displayValue}
            {unit ? (
              <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-400 font-semibold">
                {unit}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default StatCard;

