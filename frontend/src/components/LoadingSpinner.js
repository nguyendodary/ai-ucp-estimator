import React from 'react';

function LoadingSpinner() {
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <p>Analyzing requirements with AI...</p>
    </div>
  );
}

export default LoadingSpinner;
