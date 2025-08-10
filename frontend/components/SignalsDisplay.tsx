import { useEffect, useState } from "react";
import type { Signal } from "../pages/api/signals";
import EvidenceModal from "./EvidenceModal";
import { exportToCSV, exportToPDF, exportToJSON, copyToClipboard } from "../utils/exportSignals";

interface SignalsDisplayProps {
  aoiId?: string;
  limit?: number;
  minConfidence?: number;
  showFilters?: boolean;
}

export default function SignalsDisplay({ 
  aoiId, 
  limit = 10, 
  minConfidence = 0,
  showFilters = true 
}: SignalsDisplayProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    sector: "",
    direction: "",
    minConfidence: minConfidence.toString(),
  });
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (aoiId) params.set("aoiId", aoiId);
      if (filters.sector) params.set("sector", filters.sector);
      if (filters.direction) params.set("direction", filters.direction);
      if (filters.minConfidence) params.set("minConfidence", filters.minConfidence);
      params.set("limit", limit.toString());
      
      const res = await fetch(`/api/signals?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch signals");
      
      const data = await res.json();
      setSignals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [aoiId, filters.sector, filters.direction, filters.minConfidence]);

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case "long": return "#10b981";
      case "short": return "#ef4444";
      case "neutral": return "#6b7280";
      default: return "#6b7280";
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case "long": return "↗";
      case "short": return "↘";
      case "neutral": return "→";
      default: return "•";
    }
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence > 0.8) return { label: "High", color: "#ef4444" }; // Red for high (>0.8)
    if (confidence > 0.6) return { label: "Medium", color: "#f59e0b" }; // Yellow for medium (>0.6)
    return { label: "Low", color: "#10b981" }; // Green for low (≤0.6)
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  };

  // Handle export actions
  const handleExportCSV = () => {
    exportToCSV(signals, "trading_signals");
    setExportSuccess("Exported to CSV successfully!");
    setTimeout(() => setExportSuccess(null), 3000);
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    exportToPDF(signals, "trading_signals");
    setExportSuccess("Opening PDF preview...");
    setTimeout(() => setExportSuccess(null), 3000);
    setShowExportMenu(false);
  };

  const handleExportJSON = () => {
    exportToJSON(signals, "trading_signals");
    setExportSuccess("Exported to JSON successfully!");
    setTimeout(() => setExportSuccess(null), 3000);
    setShowExportMenu(false);
  };

  const handleCopyToClipboard = () => {
    copyToClipboard(signals);
    setExportSuccess("Copied to clipboard!");
    setTimeout(() => setExportSuccess(null), 3000);
    setShowExportMenu(false);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🤖</span> GPT-5 Trading Signals
            </h2>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
              AI-generated trading signals based on satellite imagery and pattern analysis
            </p>
          </div>
          
          {/* Export Button */}
          {signals.length > 0 && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                style={{
                  padding: "8px 14px",
                  background: "#1f2937",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#111827"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#1f2937"}
              >
                <span>📥</span> Export
                <span style={{ fontSize: 10 }}>{showExportMenu ? "▲" : "▼"}</span>
              </button>
              
              {/* Export Menu Dropdown */}
              {showExportMenu && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 4,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  zIndex: 10,
                  minWidth: 180,
                  overflow: "hidden",
                }}>
                  <button
                    onClick={handleExportCSV}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span>📊</span> Export as CSV
                  </button>
                  
                  <button
                    onClick={handleExportPDF}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "transparent",
                      border: "none",
                      borderTop: "1px solid #e5e7eb",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span>📄</span> Export as PDF
                  </button>
                  
                  <button
                    onClick={handleExportJSON}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "transparent",
                      border: "none",
                      borderTop: "1px solid #e5e7eb",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span>🔧</span> Export as JSON
                  </button>
                  
                  <button
                    onClick={handleCopyToClipboard}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "transparent",
                      border: "none",
                      borderTop: "1px solid #e5e7eb",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span>📋</span> Copy to Clipboard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Export Success Message */}
        {exportSuccess && (
          <div style={{
            position: "fixed",
            top: 80,
            right: 20,
            padding: "12px 20px",
            background: "#10b981",
            color: "white",
            borderRadius: 8,
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            fontSize: 14,
            fontWeight: 500,
            zIndex: 1000,
            animation: "slideIn 0.3s ease-out",
          }}>
            ✅ {exportSuccess}
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ 
          display: "flex", 
          gap: 12, 
          marginBottom: 20,
          padding: 12,
          background: "#f9fafb",
          borderRadius: 8,
          flexWrap: "wrap"
        }}>
          <select 
            value={filters.sector} 
            onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value }))}
            style={{ 
              padding: "6px 10px", 
              borderRadius: 6, 
              border: "1px solid #d1d5db",
              fontSize: 14
            }}
          >
            <option value="">All Sectors</option>
            <option value="energy">Energy</option>
            <option value="agriculture">Agriculture</option>
            <option value="mining">Mining</option>
          </select>

          <select 
            value={filters.direction} 
            onChange={(e) => setFilters(prev => ({ ...prev, direction: e.target.value }))}
            style={{ 
              padding: "6px 10px", 
              borderRadius: 6, 
              border: "1px solid #d1d5db",
              fontSize: 14
            }}
          >
            <option value="">All Directions</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
            <option value="neutral">Neutral</option>
          </select>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 14, color: "#4b5563" }}>Min Confidence:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={filters.minConfidence}
              onChange={(e) => setFilters(prev => ({ ...prev, minConfidence: e.target.value }))}
              style={{ width: 100 }}
            />
            <span style={{ fontSize: 14, fontWeight: 500, minWidth: 35 }}>
              {(parseFloat(filters.minConfidence) * 100).toFixed(0)}%
            </span>
          </div>

          <button
            onClick={fetchSignals}
            disabled={loading}
            style={{
              padding: "6px 12px",
              background: loading ? "#9ca3af" : "#4f46e5",
              color: "white",
              borderRadius: 6,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 500
            }}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ 
          padding: 12, 
          background: "#fef2f2", 
          border: "1px solid #fecaca", 
          borderRadius: 8,
          color: "#dc2626",
          marginBottom: 16
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading State */}
      {loading && signals.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          Loading signals...
        </div>
      )}

      {/* Signals List */}
      {signals.length > 0 && (
        <div style={{ display: "grid", gap: 16 }}>
          {signals.map((signal) => {
            const confidenceLevel = getConfidenceLevel(signal.confidence);
            
            return (
              <div
                key={signal.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  background: "white",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgb(0 0 0 / 0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Header */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "flex-start",
                  marginBottom: 12,
                  flexWrap: "wrap",
                  gap: 8
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Instrument */}
                    <div style={{
                      padding: "6px 12px",
                      background: "#1f2937",
                      color: "white",
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 16
                    }}>
                      {signal.instrument}
                    </div>

                    {/* Direction */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 10px",
                      background: `${getDirectionColor(signal.direction)}15`,
                      color: getDirectionColor(signal.direction),
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 14
                    }}>
                      <span style={{ fontSize: 18 }}>{getDirectionIcon(signal.direction)}</span>
                      {signal.direction.toUpperCase()}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div style={{ 
                    fontSize: 12, 
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    🕐 {formatTimeAgo(signal.timestamp)}
                  </div>
                </div>

                {/* Confidence Bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: 4
                  }}>
                    <span style={{ fontSize: 13, color: "#4b5563", fontWeight: 500 }}>
                      Confidence
                    </span>
                    <span style={{ 
                      fontSize: 13, 
                      color: confidenceLevel.color,
                      fontWeight: 600
                    }}>
                      {confidenceLevel.label} ({(signal.confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ 
                    height: 8, 
                    background: "#f3f4f6", 
                    borderRadius: 4,
                    overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${signal.confidence * 100}%`,
                      background: `linear-gradient(90deg, ${confidenceLevel.color}, ${confidenceLevel.color}dd)`,
                      borderRadius: 4,
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                </div>

                {/* Rationale */}
                <div style={{
                  padding: 12,
                  background: "#f9fafb",
                  borderRadius: 8,
                  marginBottom: 12
                }}>
                  <div style={{ 
                    fontSize: 12, 
                    color: "#6b7280", 
                    marginBottom: 4,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}>
                    📊 Analysis & Rationale
                  </div>
                  <div style={{ 
                    fontSize: 14, 
                    color: "#1f2937",
                    lineHeight: 1.5
                  }}>
                    {signal.rationale}
                  </div>
                </div>

                {/* Metadata and Actions */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12
                }}>
                  <div style={{ 
                    display: "flex", 
                    gap: 12,
                    fontSize: 12,
                    color: "#6b7280",
                    flexWrap: "wrap"
                  }}>
                    {signal.aoiName && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        📍 <span>{signal.aoiName}</span>
                      </div>
                    )}
                    {signal.sector && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        🏭 <span style={{ textTransform: "capitalize" }}>{signal.sector}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      🆔 <span>{signal.id}</span>
                    </div>
                  </div>
                  
                  {/* View Evidence Button */}
                  <button
                    onClick={() => {
                      setSelectedSignal(signal);
                      setShowEvidenceModal(true);
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "#4f46e5",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#4338ca";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#4f46e5";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    🛰️ View Evidence
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && signals.length === 0 && !error && (
        <div style={{ 
          textAlign: "center", 
          padding: 40, 
          color: "#9ca3af",
          background: "#f9fafb",
          borderRadius: 8
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
          <p>No signals found matching your criteria</p>
        </div>
      )}

      {/* Evidence Modal */}
      {selectedSignal && (
        <EvidenceModal
          isOpen={showEvidenceModal}
          onClose={() => {
            setShowEvidenceModal(false);
            setSelectedSignal(null);
          }}
          signalId={selectedSignal.id}
          instrument={selectedSignal.instrument}
          aoiName={selectedSignal.aoiName}
        />
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
