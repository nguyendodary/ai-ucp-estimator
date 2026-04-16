import React from 'react';

import ChartCard from '../cards/ChartCard';
import { Badge } from '../ui/badge';

function typeBadgeVariant(type) {
  const v = (type || '').toLowerCase();
  if (v === 'simple') return 'simple';
  if (v === 'average') return 'average';
  return 'complex';
}

function DataTable({ variant, rows }) {
  if (!Array.isArray(rows)) rows = [];

  const isActors = variant === 'actors';

  const header = isActors
    ? { col1: 'Name', col2: 'Type', col3: 'Weight' }
    : { col1: 'Name', col2: 'Complexity', col3: 'Weight' };

  return (
    <ChartCard title={isActors ? 'Actors' : 'Use Cases'} subtitle="Final structured list">
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
              rows.map((r, idx) => {
                const key = `${r.name}_${idx}`;
                const badgeValue = isActors ? r.actor_type : r.complexity;
                const badgeVariant = typeBadgeVariant(badgeValue);
                return (
                  <tr
                    key={key}
                    className={
                      'border-t border-zinc-200/70 dark:border-zinc-800/70 ' +
                      'odd:bg-zinc-50/40 dark:odd:bg-zinc-900/30 ' +
                      'hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors'
                    }
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {r.name}
                      </div>
                      {!isActors && r.description ? (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap">
                          {r.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={badgeVariant}>
                        {badgeValue}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">
                      {r.weight}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="py-10 px-3 text-center text-zinc-500 dark:text-zinc-400">
                  {isActors ? 'No actors provided.' : 'No use cases provided.'}
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

