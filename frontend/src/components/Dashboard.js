import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  const tcf = Number(data.tcf || 0);
  let riskLevel = 'Low';
  let riskClass = 'risk-low';
  if (tcf > 1.1) {
    riskLevel = 'High Risk';
    riskClass = 'risk-high';
  } else if (tcf >= 1.0) {
    riskLevel = 'Medium';
    riskClass = 'risk-medium';
  }

  const uucpToUcpPercent = data.ucp > 0 ? Math.min(100, (data.uucp / data.ucp) * 100) : 0;

  const extractTechnicalJustifications = () => {
    if (Array.isArray(data.tcf_triggers) && data.tcf_triggers.length > 0) {
      return data.tcf_triggers;
    }

    if (!data.reasoning_log) {
      return [];
    }

    return data.reasoning_log
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^T\d+\s*=/.test(line) || line.includes('T') && line.includes('('));
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const exportDate = new Date().toLocaleString();
    const technicalJustifications = extractTechnicalJustifications();

    doc.setFillColor(26, 115, 232);
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('AI-POWERED UCP ESTIMATOR', margin, 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Export Date: ${exportDate}`, margin, 17);

    doc.setTextColor(26, 26, 46);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Section 1: Summary', margin, 32);

    autoTable(doc, {
      startY: 35,
      margin: { left: margin, right: margin },
      head: [['Metric', 'Value']],
      body: [
        ['UAW', data.uaw],
        ['UUCW', data.uucw],
        ['TCF', Number(data.tcf || 0).toFixed(3)],
        ['ECF', Number(data.ecf || 0).toFixed(3)],
        ['Final UCP', Number(data.ucp || 0).toFixed(2)],
        ['Effort Hours', Number(data.effort_hours || 0).toFixed(1)],
      ],
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 2.8,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [13, 71, 161],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
      },
      theme: 'grid',
    });

    const actorsBody = Array.isArray(data.actors)
      ? data.actors.map((actor) => [actor.name, actor.actor_type || actor.type, actor.weight])
      : [];

    const useCasesBody = Array.isArray(data.use_cases)
      ? data.use_cases.map((uc) => [uc.name, uc.transactions, uc.weight])
      : [];

    const section2StartY = (doc.lastAutoTable?.finalY || 35) + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Section 2: Breakdown', margin, section2StartY);

    autoTable(doc, {
      startY: section2StartY + 3,
      margin: { left: margin, right: margin },
      head: [['Actor', 'Type', 'Weight']],
      body: actorsBody.length > 0 ? actorsBody : [['-', '-', '-']],
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'striped',
    });

    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY || section2StartY + 10) + 6,
      margin: { left: margin, right: margin },
      head: [['Use Case', 'Transactions', 'Weight']],
      body: useCasesBody.length > 0 ? useCasesBody : [['-', '-', '-']],
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [8, 145, 178],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'striped',
    });

    let section3StartY = (doc.lastAutoTable?.finalY || 120) + 10;
    if (section3StartY > 265) {
      doc.addPage();
      section3StartY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Section 3: Technical Justification', margin, section3StartY);

    autoTable(doc, {
      startY: section3StartY + 3,
      margin: { left: margin, right: margin },
      head: [['Auto-identified TCF Trigger from reasoning_log']],
      body: (technicalJustifications.length > 0 ? technicalJustifications : ['No TCF triggers identified.'])
        .map((item) => [item]),
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [30, 41, 59],
        overflow: 'linebreak',
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: pageWidth - margin * 2 },
      },
      theme: 'grid',
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    doc.save(`ucp-estimation-report-${timestamp}.pdf`);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Estimation Results</h2>
        <div className="dashboard-actions">
          <button type="button" className="btn-export-pdf" onClick={handleExportPdf}>
            Export PDF Report
          </button>
          <span className={`risk-tag ${riskClass}`}>{riskLevel}</span>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard label="UAW" value={data.uaw} />
        <MetricCard label="UUCW" value={data.uucw} />
        <MetricCard label="UUCP" value={data.uucp} />
        <MetricCard label="TCF" value={data.tcf.toFixed(3)} />
        <MetricCard label="ECF" value={data.ecf.toFixed(3)} />
        <MetricCard label="UCP" value={data.ucp.toFixed(2)} />
        <MetricCard label="Estimated Effort" value={data.effort_hours.toFixed(1)} unit="person-hours" />
      </div>

      <div className="impact-panel">
        <h3>Technical Factor Impact</h3>
        <div className="impact-row">
          <span>UUCP / UCP</span>
          <span>{uucpToUcpPercent.toFixed(1)}%</span>
        </div>
        <div className="impact-bar">
          <div className="impact-bar-fill" style={{ width: `${uucpToUcpPercent}%` }} />
        </div>
      </div>

      <div className="tcf-triggers">
        <h3>Auto-Triggered TCF Factors</h3>
        {Array.isArray(data.tcf_triggers) && data.tcf_triggers.length > 0 ? (
          <div className="tcf-badges">
            {data.tcf_triggers.map((item, index) => (
              <span key={index} className="tcf-badge">{item}</span>
            ))}
          </div>
        ) : (
          <p className="tcf-trigger-empty">
            No technical factors were auto-triggered from the reasoning keywords.
          </p>
        )}
      </div>
      
      {data.reasoning_log && (
        <div className="reasoning-breakdown">
          <h3>Reasoning Breakdown</h3>
          <div className="reasoning-content">
            {data.reasoning_log.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
