import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

function ChartCard({ title, subtitle, children }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

export default ChartCard;

