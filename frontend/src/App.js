import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import TextInput from './components/TextInput';
import Dashboard from './components/Dashboard';
import ChartPanel from './components/ChartPanel';
import BreakdownTable from './components/BreakdownTable';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleResult = (data) => {
    setResult(data);
    setError(null);
  };

  const handleError = (message) => {
    setError(message);
    setResult(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI-Powered UCP Estimation</h1>
        <p>Upload or paste software requirements to get Use Case Point estimates</p>
      </header>

      <main className="app-main">
        <div className="input-panel">
          <FileUpload
            onResult={handleResult}
            onError={handleError}
            setLoading={setLoading}
          />
          <div className="divider">
            <span>OR</span>
          </div>
          <TextInput
            onResult={handleResult}
            onError={handleError}
            setLoading={setLoading}
          />
        </div>

        {loading && <LoadingSpinner />}

        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="results-panel">
            <Dashboard data={result} />
            <BreakdownTable data={result} />
            <ChartPanel data={result} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
