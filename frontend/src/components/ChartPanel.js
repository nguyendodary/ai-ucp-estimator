import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const ACTOR_COLORS = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7'];
const UC_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function ChartPanel({ data }) {
  if (!data) return null;

  const actorChartData = {
    labels: data.actors.map((a) => `${a.name} (${a.actor_type})`),
    datasets: [
      {
        data: data.actors.map((a) => a.weight),
        backgroundColor: ACTOR_COLORS.slice(0, data.actors.length),
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const ucChartData = {
    labels: data.use_cases.map((uc) => uc.name),
    datasets: [
      {
        data: data.use_cases.map((uc) => uc.weight),
        backgroundColor: UC_COLORS.slice(0, data.use_cases.length),
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 12, font: { size: 11 } },
      },
    },
  };

  return (
    <div className="chart-panel">
      <div className="chart-container">
        <h3>Actor Complexity Distribution</h3>
        <Pie data={actorChartData} options={chartOptions} />
      </div>
      <div className="chart-container">
        <h3>Use Case Complexity Distribution</h3>
        <Pie data={ucChartData} options={chartOptions} />
      </div>
    </div>
  );
}

export default ChartPanel;
