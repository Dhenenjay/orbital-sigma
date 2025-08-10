import { useEffect, useState } from "react";

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  signalId: string;
  instrument: string;
  aoiName?: string;
  bbox?: number[]; // [minLon, minLat, maxLon, maxLat]
}

interface EvidenceData {
  beforeImage: string;
  afterImage: string;
  beforeDate: string;
  afterDate: string;
  analysisType: string;
  changeDetected: string;
  coordinates: { lat: number; lon: number };
}

export default function EvidenceModal({
  isOpen,
  onClose,
  signalId,
  instrument,
  aoiName,
  bbox
}: EvidenceModalProps) {
  const [evidence, setEvidence] = useState<EvidenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageComparison, setImageComparison] = useState<"side-by-side" | "overlay">("side-by-side");
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);

  useEffect(() => {
    if (isOpen && signalId) {
      fetchEvidence();
    }
  }, [isOpen, signalId]);

  const fetchEvidence = async () => {
    setLoading(true);
    
    // Simulate fetching GEE imagery - in production, this would call your GEE backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate mock evidence data based on signal
    const mockEvidence: EvidenceData = {
      beforeImage: `https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/thumbnails/${generateMockImageId()}:getPixels`,
      afterImage: `https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/thumbnails/${generateMockImageId()}:getPixels`,
      beforeDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      afterDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      analysisType: getAnalysisType(instrument),
      changeDetected: getChangeDescription(instrument),
      coordinates: {
        lat: bbox ? (bbox[1] + bbox[3]) / 2 : -15.7942,
        lon: bbox ? (bbox[0] + bbox[2]) / 2 : -47.8822
      }
    };
    
    setEvidence(mockEvidence);
    setLoading(false);
  };

  const generateMockImageId = () => {
    // In production, this would be actual GEE image IDs
    return Math.random().toString(36).substring(2, 15);
  };

  const getAnalysisType = (instrument: string) => {
    const types: Record<string, string> = {
      "CL": "Thermal anomaly detection",
      "CORN": "NDVI vegetation index",
      "HG": "Mining activity detection",
      "WEAT": "Soil moisture analysis",
      "NG": "Infrastructure monitoring",
      "SOYB": "Crop health assessment",
      "GC": "Mining operations tracking",
      "KC": "Frost damage detection"
    };
    return types[instrument] || "Multi-spectral analysis";
  };

  const getChangeDescription = (instrument: string) => {
    const changes: Record<string, string> = {
      "CL": "Reduced tanker traffic, thermal signature changes at storage facilities",
      "CORN": "Increased vegetation density, healthy crop signatures",
      "HG": "Decreased truck movements, dust plume reduction",
      "WEAT": "Reduced soil moisture, vegetation stress indicators",
      "NG": "Normal operations, no anomalies detected",
      "SOYB": "Mixed signals - healthy growth but moisture concerns",
      "GC": "Increased activity at extraction sites",
      "KC": "Frost damage visible, canopy temperature anomalies"
    };
    return changes[instrument] || "Significant changes detected in area of interest";
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            maxWidth: 1200,
            width: "100%",
            maxHeight: "90vh",
            overflow: "auto",
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: 20,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                🛰️ Satellite Evidence
              </h2>
              <p style={{ margin: 0, marginTop: 4, color: "#6b7280", fontSize: 14 }}>
                {aoiName || "Area of Interest"} - Signal {signalId}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 6,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: 20 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  border: "3px solid #e5e7eb",
                  borderTop: "3px solid #4f46e5",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 16px",
                }} />
                <p style={{ color: "#6b7280" }}>Loading satellite imagery...</p>
              </div>
            ) : evidence ? (
              <>
                {/* Analysis Info */}
                <div style={{
                  background: "#f9fafb",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 20,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                      Analysis Type
                    </div>
                    <div style={{ fontWeight: 500, color: "#1f2937" }}>
                      {evidence.analysisType}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                      Coordinates
                    </div>
                    <div style={{ fontWeight: 500, color: "#1f2937" }}>
                      {evidence.coordinates.lat.toFixed(4)}°, {evidence.coordinates.lon.toFixed(4)}°
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                      Time Period
                    </div>
                    <div style={{ fontWeight: 500, color: "#1f2937" }}>
                      {evidence.beforeDate} → {evidence.afterDate}
                    </div>
                  </div>
                </div>

                {/* Change Detection */}
                <div style={{
                  background: "#fef3c7",
                  border: "1px solid #fcd34d",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 20,
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 500, color: "#92400e", marginBottom: 4 }}>
                      Changes Detected
                    </div>
                    <div style={{ fontSize: 14, color: "#78350f" }}>
                      {evidence.changeDetected}
                    </div>
                  </div>
                </div>

                {/* View Controls */}
                <div style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 20,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setImageComparison("side-by-side")}
                      style={{
                        padding: "6px 12px",
                        background: imageComparison === "side-by-side" ? "#4f46e5" : "#f3f4f6",
                        color: imageComparison === "side-by-side" ? "white" : "#4b5563",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Side by Side
                    </button>
                    <button
                      onClick={() => setImageComparison("overlay")}
                      style={{
                        padding: "6px 12px",
                        background: imageComparison === "overlay" ? "#4f46e5" : "#f3f4f6",
                        color: imageComparison === "overlay" ? "white" : "#4b5563",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Overlay
                    </button>
                  </div>

                  {imageComparison === "overlay" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <label style={{ fontSize: 14, color: "#4b5563" }}>Opacity:</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={overlayOpacity}
                        onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                        style={{ flex: 1, maxWidth: 200 }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 500, minWidth: 40 }}>
                        {Math.round(overlayOpacity * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Image Display */}
                {imageComparison === "side-by-side" ? (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}>
                    {/* Before Image */}
                    <div>
                      <div style={{
                        background: "#f3f4f6",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <span style={{ fontWeight: 500, color: "#1f2937" }}>Before</span>
                        <span style={{ fontSize: 14, color: "#6b7280" }}>{evidence.beforeDate}</span>
                      </div>
                      <div style={{
                        background: "#f3f4f6",
                        borderRadius: 8,
                        aspectRatio: "4/3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        overflow: "hidden",
                      }}>
                        {/* Placeholder for actual GEE image */}
                        <div style={{
                          position: "absolute",
                          inset: 0,
                          background: `linear-gradient(135deg, #e5e7eb 25%, #f3f4f6 25%, #f3f4f6 50%, #e5e7eb 50%, #e5e7eb 75%, #f3f4f6 75%, #f3f4f6)`,
                          backgroundSize: "20px 20px",
                        }} />
                        <div style={{
                          position: "relative",
                          textAlign: "center",
                          padding: 20,
                          background: "white",
                          borderRadius: 8,
                          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
                        }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>🌍</div>
                          <div style={{ fontSize: 14, color: "#6b7280" }}>
                            Sentinel-2 MSI<br />
                            RGB Composite<br />
                            10m Resolution
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* After Image */}
                    <div>
                      <div style={{
                        background: "#f3f4f6",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <span style={{ fontWeight: 500, color: "#1f2937" }}>After</span>
                        <span style={{ fontSize: 14, color: "#6b7280" }}>{evidence.afterDate}</span>
                      </div>
                      <div style={{
                        background: "#f3f4f6",
                        borderRadius: 8,
                        aspectRatio: "4/3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        overflow: "hidden",
                      }}>
                        {/* Placeholder for actual GEE image */}
                        <div style={{
                          position: "absolute",
                          inset: 0,
                          background: `linear-gradient(135deg, #fecaca 25%, #fee2e2 25%, #fee2e2 50%, #fecaca 50%, #fecaca 75%, #fee2e2 75%, #fee2e2)`,
                          backgroundSize: "20px 20px",
                        }} />
                        <div style={{
                          position: "relative",
                          textAlign: "center",
                          padding: 20,
                          background: "white",
                          borderRadius: 8,
                          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
                        }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>🔴</div>
                          <div style={{ fontSize: 14, color: "#6b7280" }}>
                            Sentinel-2 MSI<br />
                            Change Detected<br />
                            10m Resolution
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: "#f3f4f6",
                    borderRadius: 8,
                    aspectRatio: "16/9",
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    {/* Base (Before) Image */}
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(135deg, #e5e7eb 25%, #f3f4f6 25%, #f3f4f6 50%, #e5e7eb 50%, #e5e7eb 75%, #f3f4f6 75%, #f3f4f6)`,
                      backgroundSize: "20px 20px",
                    }} />
                    
                    {/* Overlay (After) Image */}
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(135deg, #fecaca 25%, #fee2e2 25%, #fee2e2 50%, #fecaca 50%, #fecaca 75%, #fee2e2 75%, #fee2e2)`,
                      backgroundSize: "20px 20px",
                      opacity: overlayOpacity,
                    }} />

                    {/* Center Content */}
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <div style={{
                        textAlign: "center",
                        padding: 24,
                        background: "white",
                        borderRadius: 8,
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🛰️</div>
                        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                          Overlay Comparison
                        </div>
                        <div style={{ fontSize: 14, color: "#6b7280" }}>
                          Adjust opacity slider to compare changes
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Analysis */}
                <div style={{
                  marginTop: 24,
                  padding: 16,
                  background: "#f9fafb",
                  borderRadius: 8,
                }}>
                  <h3 style={{ margin: 0, marginBottom: 12, fontSize: 16 }}>
                    📊 Spectral Analysis
                  </h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 12,
                  }}>
                    <div style={{
                      padding: 12,
                      background: "white",
                      borderRadius: 6,
                      border: "1px solid #e5e7eb",
                    }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                        NDVI Change
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "#dc2626" }}>
                        -12.3%
                      </div>
                    </div>
                    <div style={{
                      padding: 12,
                      background: "white",
                      borderRadius: 6,
                      border: "1px solid #e5e7eb",
                    }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                        Thermal Anomaly
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "#f59e0b" }}>
                        +3.2°C
                      </div>
                    </div>
                    <div style={{
                      padding: 12,
                      background: "white",
                      borderRadius: 6,
                      border: "1px solid #e5e7eb",
                    }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                        Area Affected
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "#4f46e5" }}>
                        42.5 km²
                      </div>
                    </div>
                    <div style={{
                      padding: 12,
                      background: "white",
                      borderRadius: 6,
                      border: "1px solid #e5e7eb",
                    }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                        Confidence
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "#10b981" }}>
                        87%
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
                <p>No evidence data available</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: 20,
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Powered by Google Earth Engine • Sentinel-2 MSI
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
