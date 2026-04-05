import React from 'react';

function MetricCard({ label, value, unit }) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      {unit && <div className="metric-unit">{unit}</div>}
    </div>
  );
}

function Dashboard({ data }) {
  if (!data) return null;

  return (
    <div className="dashboard">
      <h2>Estimation Results</h2>
      <div className="metrics-grid">
        <MetricCard label="UAW" value={data.uaw} />
        <MetricCard label="UUCW" value={data.uucw} />
        <MetricCard label="UUCP" value={data.uucp} />
        <MetricCard label="TCF" value={data.tcf} />
        <MetricCard label="ECF" value={data.ecf} />
        <MetricCard label="UCP" value={data.ucp.toFixed(2)} />
        <MetricCard label="Estimated Effort" value={data.effort_hours.toFixed(1)} unit="person-hours" />
      </div>
    </div>
  );
}

export default Dashboard;
