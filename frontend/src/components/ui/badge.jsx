import React from 'react';

import { cn } from '../../lib/utils';

function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700',
    simple: 'bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700',
    average: 'bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-800/60',
    complex: 'bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-100 dark:border-purple-800/60',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold tracking-wide',
        variants[variant] || variants.default,
        className,
      )}
      {...props}
    />
  );
}

export { Badge };

