import React, { useState } from 'react';
import { analyzeFile } from '../api';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

function FileUpload({ onResult, onError, setLoading }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|docx|txt)$/i)) {
      onError('Unsupported file type. Please upload PDF, DOCX, or TXT.');
      return;
    }
    setSelectedFile(file);
    setLoading(true);
    try {
      const data = await analyzeFile(file);
      onResult(data);
    } catch (err) {
      onError(err.response?.data?.detail || 'Failed to analyze file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  return (
    <div className="upload-section">
      <h3>Upload File</h3>
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <p>Drag & drop a PDF, DOCX, or TXT file here</p>
        <p className="or-text">or</p>
        <label className="file-label">
          <input type="file" accept=".pdf,.docx,.txt" onChange={handleChange} />
          Browse Files
        </label>
        {selectedFile && <p className="file-name">Selected: {selectedFile.name}</p>}
      </div>
    </div>
  );
}

export default FileUpload;
