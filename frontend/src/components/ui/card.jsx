import React from 'react';

import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200/70 bg-white/80 shadow-soft backdrop-blur dark:bg-zinc-900/50 dark:border-zinc-800/80',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return <div className={cn('p-6 pb-3', className)} {...props} />;
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

function CardTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold tracking-tight', className)} {...props} />;
}

export { Card, CardHeader, CardContent, CardTitle };

