import React, { useState } from 'react';
import { analyzeText } from '../api';

function TextInput({ onResult, onError, setLoading }) {
  const [text, setText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 10) {
      onError('Please enter at least 10 characters of requirements text.');
      return;
    }
    setLoading(true);
    try {
      const data = await analyzeText(text);
      onResult(data);
    } catch (err) {
      onError(err.response?.data?.detail || 'Failed to analyze text.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-section">
      <h3>Paste Requirements Text</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          className="requirement-textarea"
          placeholder="Paste your software requirements here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
        />
        <button type="submit" className="btn-primary" disabled={text.trim().length < 10}>
          Analyze
        </button>
      </form>
    </div>
  );
}

export default TextInput;
