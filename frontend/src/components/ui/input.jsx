import React from 'react';

import { cn } from '../../lib/utils';

function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-2xl border border-zinc-200/70 bg-white/70 px-4 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-soft transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };

