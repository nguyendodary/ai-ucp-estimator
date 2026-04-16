import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import ChartCard from '../cards/ChartCard';

function WeightsBarChart({ title, data, dataKey, color }) {
  return (
    <ChartCard title={title} subtitle="Weight distribution across inputs">
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="rgba(63, 63, 70, 0.15)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(39, 39, 42, 0.8)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(39, 39, 42, 0.8)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid rgba(228, 228, 231, 0.7)',
                background: 'rgba(250, 250, 250, 0.92)',
              }}
              labelStyle={{ color: '#111827', fontWeight: 700 }}
              formatter={(value) => [`${value}`, 'Weight']}
            />
            <Bar dataKey={dataKey} fill={color} radius={[12, 12, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function WeightsCharts({ actors = [], useCases = [] }) {
  const actorData = useMemo(
    () =>
      actors.map((a, idx) => ({
        id: a.name + idx,
        label: a.name.length > 18 ? `${a.name.slice(0, 18)}…` : a.name,
        value: a.weight,
      })),
    [actors]
  );

  const ucData = useMemo(
    () =>
      useCases.map((uc, idx) => ({
        id: uc.name + idx,
        label: uc.name.length > 18 ? `${uc.name.slice(0, 18)}…` : uc.name,
        value: uc.weight,
      })),
    [useCases]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <WeightsBarChart title="Actor Weights" data={actorData} dataKey="value" color="#4f46e5" />
      <WeightsBarChart title="Use Case Weights" data={ucData} dataKey="value" color="#0891b2" />
    </div>
  );
}

export default WeightsCharts;

