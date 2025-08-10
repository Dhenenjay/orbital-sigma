import type { Signal } from "../pages/api/signals";

/**
 * Export signals to CSV format
 */
export const exportToCSV = (signals: Signal[], filename: string = "signals_export") => {
  // Define CSV headers
  const headers = [
    "Signal ID",
    "Instrument",
    "Direction",
    "Confidence",
    "Timestamp",
    "AOI Name",
    "Sector",
    "Rationale"
  ];

  // Convert signals to CSV rows
  const rows = signals.map(signal => [
    signal.id,
    signal.instrument,
    signal.direction,
    (signal.confidence * 100).toFixed(1) + "%",
    new Date(signal.timestamp).toLocaleString(),
    signal.aoiName || "",
    signal.sector || "",
    `"${signal.rationale.replace(/"/g, '""')}"` // Escape quotes in rationale
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export signals to PDF format
 * Note: This creates a simplified HTML-based PDF using the browser's print functionality
 */
export const exportToPDF = (signals: Signal[], filename: string = "signals_export") => {
  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Trading Signals Report</title>
      <style>
        @media print {
          @page {
            margin: 20mm;
            size: A4;
          }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #111827;
          border-bottom: 2px solid #4f46e5;
          padding-bottom: 10px;
          margin-bottom: 30px;
        }
        .header-info {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .signal-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .signal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
        }
        .instrument {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
        }
        .direction {
          padding: 4px 12px;
          border-radius: 6px;
          font-weight: 600;
          display: inline-block;
        }
        .direction-long {
          background: #d1fae5;
          color: #065f46;
        }
        .direction-short {
          background: #fee2e2;
          color: #991b1b;
        }
        .direction-neutral {
          background: #f3f4f6;
          color: #4b5563;
        }
        .confidence-bar {
          margin: 15px 0;
        }
        .confidence-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 14px;
        }
        .confidence-track {
          height: 8px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
        }
        .confidence-fill {
          height: 100%;
          border-radius: 4px;
        }
        .confidence-high { background: #ef4444; }
        .confidence-medium { background: #f59e0b; }
        .confidence-low { background: #10b981; }
        .rationale {
          background: #f9fafb;
          padding: 12px;
          border-radius: 6px;
          margin: 15px 0;
          font-size: 14px;
          line-height: 1.5;
        }
        .metadata {
          display: flex;
          gap: 20px;
          font-size: 12px;
          color: #6b7280;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <h1>🛰️ GPT-5 Trading Signals Report</h1>
      
      <div class="header-info">
        <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
        <div><strong>Total Signals:</strong> ${signals.length}</div>
        <div><strong>Report Type:</strong> AI-Generated Trading Signals</div>
      </div>

      ${signals.map(signal => {
        const confidencePercent = (signal.confidence * 100).toFixed(0);
        const confidenceLevel = signal.confidence > 0.8 ? 'high' : signal.confidence > 0.6 ? 'medium' : 'low';
        const confidenceLabel = signal.confidence > 0.8 ? 'High' : signal.confidence > 0.6 ? 'Medium' : 'Low';
        
        return `
          <div class="signal-card">
            <div class="signal-header">
              <div>
                <span class="instrument">${signal.instrument}</span>
                <span class="direction direction-${signal.direction}">${signal.direction.toUpperCase()}</span>
              </div>
              <div style="text-align: right; font-size: 12px; color: #6b7280;">
                ${new Date(signal.timestamp).toLocaleString()}
              </div>
            </div>

            <div class="confidence-bar">
              <div class="confidence-label">
                <span>Confidence</span>
                <span><strong>${confidenceLabel}</strong> (${confidencePercent}%)</span>
              </div>
              <div class="confidence-track">
                <div class="confidence-fill confidence-${confidenceLevel}" style="width: ${confidencePercent}%"></div>
              </div>
            </div>

            <div class="rationale">
              <strong>Analysis & Rationale:</strong><br>
              ${signal.rationale}
            </div>

            <div class="metadata">
              ${signal.aoiName ? `<div>📍 ${signal.aoiName}</div>` : ''}
              ${signal.sector ? `<div>🏭 ${signal.sector}</div>` : ''}
              <div>🆔 ${signal.id}</div>
            </div>
          </div>
        `;
      }).join('')}

      <div class="footer">
        <p>© ${new Date().getFullYear()} Orbital Sigma - Satellite Intelligence Platform</p>
        <p>This report contains AI-generated trading signals based on satellite imagery analysis.</p>
        <p>Not financial advice. Please conduct your own research before making trading decisions.</p>
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      
      // Optional: close the window after printing
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  }
};

/**
 * Export signals to JSON format
 */
export const exportToJSON = (signals: Signal[], filename: string = "signals_export") => {
  const dataStr = JSON.stringify(signals, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Copy signals data to clipboard as formatted text
 */
export const copyToClipboard = (signals: Signal[]) => {
  const text = signals.map(signal => {
    const confidence = (signal.confidence * 100).toFixed(0);
    return `${signal.instrument} - ${signal.direction.toUpperCase()} (${confidence}% confidence)
${signal.rationale}
${signal.aoiName ? `Location: ${signal.aoiName}` : ''}
${new Date(signal.timestamp).toLocaleString()}
---`;
  }).join('\n\n');

  navigator.clipboard.writeText(text).then(() => {
    // Success feedback could be handled by the calling component
    console.log('Copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
};
