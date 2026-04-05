import React from 'react';

function BreakdownTable({ data }) {
  if (!data) return null;

  return (
    <div className="breakdown-section">
      <div className="breakdown-grid">
        <div className="breakdown-card">
          <h3>Actors</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {data.actors.map((a, i) => (
                <tr key={i}>
                  <td>{a.name}</td>
                  <td>
                    <span className={`badge badge-${a.actor_type}`}>{a.actor_type}</span>
                  </td>
                  <td>{a.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="breakdown-card">
          <h3>Use Cases</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Transactions</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {data.use_cases.map((uc, i) => (
                <tr key={i}>
                  <td>{uc.name}</td>
                  <td>{uc.transactions}</td>
                  <td>{uc.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default BreakdownTable;
