import { useEffect, useState } from "react";

export interface QueryHistoryItem {
  id: string;
  query: string;
  summary: string;
  timestamp: string;
  type?: "search" | "natural_language" | "filter";
  resultCount?: number;
  parameters?: Record<string, any>;
}

interface QueryHistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onQuerySelect?: (query: QueryHistoryItem) => void;
  currentQuery?: string;
}

export default function QueryHistorySidebar({
  isOpen,
  onToggle,
  onQuerySelect,
  currentQuery
}: QueryHistorySidebarProps) {
  const [queries, setQueries] = useState<QueryHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [viewportWidth, setViewportWidth] = useState(1024);

  // Load query history from localStorage on mount
  useEffect(() => {
    loadQueryHistory();
    
    // Track viewport width for responsive behavior
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    
    // Listen for storage events to sync across tabs
    const handleStorageChange = () => {
      loadQueryHistory();
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const loadQueryHistory = () => {
    try {
      const stored = localStorage.getItem("queryHistory");
      if (stored) {
        const history = JSON.parse(stored) as QueryHistoryItem[];
        // Sort by timestamp, most recent first
        history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setQueries(history);
      } else {
        // Initialize with sample data if no history exists
        const sampleHistory: QueryHistoryItem[] = [
          {
            id: "qh_001",
            query: "Show me large changes in South American soy farms",
            summary: "Detected 12 anomalies in Brazilian soy regions",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            type: "natural_language",
            resultCount: 12,
            parameters: { region: "South America", commodity: "soy", severity: "large" }
          },
          {
            id: "qh_002",
            query: "copper mines Chile",
            summary: "Found 5 copper mining sites in Chile",
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            type: "search",
            resultCount: 5,
            parameters: { type: "mine", commodity: "copper", country: "Chile" }
          },
          {
            id: "qh_003",
            query: "Port congestion Asia last 24 hours",
            summary: "Identified 8 ports with high congestion",
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            type: "natural_language",
            resultCount: 8,
            parameters: { type: "port", region: "Asia", timeframe: "24h" }
          },
          {
            id: "qh_004",
            query: "energy sector Middle East",
            summary: "Located 15 energy facilities across 6 countries",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            type: "search",
            resultCount: 15,
            parameters: { sector: "energy", region: "Middle East" }
          },
          {
            id: "qh_005",
            query: "wheat production anomalies confidence > 0.7",
            summary: "3 high-confidence wheat anomalies detected",
            timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            type: "filter",
            resultCount: 3,
            parameters: { commodity: "wheat", confidence_min: 0.7 }
          },
          {
            id: "qh_006",
            query: "African gold mines operational status",
            summary: "Monitoring 9 active gold mining operations",
            timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
            type: "natural_language",
            resultCount: 9,
            parameters: { type: "mine", commodity: "gold", region: "Africa" }
          },
          {
            id: "qh_007",
            query: "oil refineries Texas",
            summary: "Found 7 refineries in Texas region",
            timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
            type: "search",
            resultCount: 7,
            parameters: { type: "refinery", commodity: "oil", state: "Texas" }
          },
          {
            id: "qh_008",
            query: "Show recent shipping delays Singapore port",
            summary: "2 vessels delayed, average wait time 18 hours",
            timestamp: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
            type: "natural_language",
            resultCount: 2,
            parameters: { type: "port", location: "Singapore", metric: "delays" }
          }
        ];
        setQueries(sampleHistory);
        localStorage.setItem("queryHistory", JSON.stringify(sampleHistory));
      }
    } catch (error) {
      console.error("Failed to load query history:", error);
      setQueries([]);
    }
  };

  // Save new query to history
  const saveQuery = (query: QueryHistoryItem) => {
    const updatedHistory = [query, ...queries.filter(q => q.id !== query.id)].slice(0, 50); // Keep last 50
    setQueries(updatedHistory);
    localStorage.setItem("queryHistory", JSON.stringify(updatedHistory));
  };

  // Clear history
  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all query history?")) {
      setQueries([]);
      localStorage.removeItem("queryHistory");
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins} min ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get icon for query type
  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "natural_language": return "💬";
      case "search": return "🔍";
      case "filter": return "⚙️";
      default: return "📝";
    }
  };

  // Filter queries based on search and type
  const filteredQueries = queries.filter(q => {
    const matchesSearch = searchTerm === "" || 
      q.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "" || q.type === filterType;
    return matchesSearch && matchesType;
  });

  // Group queries by date
  const groupedQueries = filteredQueries.reduce((groups, query) => {
    const date = new Date(query.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = "Yesterday";
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      groupKey = "This Week";
    } else if (date > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      groupKey = "This Month";
    } else {
      groupKey = "Older";
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(query);
    return groups;
  }, {} as Record<string, QueryHistoryItem[]>);

  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;
  const sidebarWidth = isMobile ? "80vw" : isTablet ? 280 : 320;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && isMobile && (
        <div
          className="sidebar-overlay"
          onClick={onToggle}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 998,
          }}
        />
      )}

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          position: "fixed",
          left: isOpen ? (typeof sidebarWidth === "string" ? 240 : sidebarWidth) : 0,
          top: isMobile ? "auto" : "50%",
          bottom: isMobile ? 20 : "auto",
          transform: isMobile ? "none" : "translateY(-50%)",
          zIndex: 999,
          background: "#4f46e5",
          color: "white",
          border: "none",
          borderRadius: isMobile ? "50%" : "0 8px 8px 0",
          padding: isMobile ? "12px" : "12px 8px",
          width: isMobile ? 48 : "auto",
          height: isMobile ? 48 : "auto",
          cursor: "pointer",
          transition: "all 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "2px 2px 8px rgba(0,0,0,0.2)",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "#4338ca"}
        onMouseLeave={(e) => e.currentTarget.style.background = "#4f46e5"}
      >
        <span style={{ fontSize: isMobile ? 20 : 18 }}>
          {isMobile ? "📜" : (isOpen ? "◀" : "▶")}
        </span>
      </button>

      {/* Sidebar */}
      <div
        className="sidebar"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: sidebarWidth,
          maxWidth: isMobile ? "90vw" : "none",
          background: "white",
          boxShadow: isOpen ? "4px 0 12px rgba(0,0,0,0.1)" : "none",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          zIndex: isMobile ? 1100 : 998,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: 20,
          borderBottom: "1px solid #e5e7eb",
          background: "#f9fafb",
        }}>
          <h3 style={{ 
            margin: 0, 
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span>📜</span> Query History
          </h3>
          <p style={{ 
            margin: 0, 
            fontSize: 12, 
            color: "#6b7280" 
          }}>
            Your recent searches and filters
          </p>
        </div>

        {/* Search and Filters */}
        <div style={{
          padding: 12,
          borderBottom: "1px solid #e5e7eb",
          background: "#ffffff",
        }}>
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              marginBottom: 8,
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                flex: 1,
                padding: "6px 8px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              <option value="">All Types</option>
              <option value="natural_language">Natural Language</option>
              <option value="search">Search</option>
              <option value="filter">Filter</option>
            </select>
            <button
              onClick={clearHistory}
              style={{
                padding: "6px 12px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#dc2626"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#ef4444"}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Query List */}
        <div style={{
          flex: 1,
          overflow: "auto",
          padding: 12,
        }}>
          {Object.keys(groupedQueries).length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: 40,
              color: "#9ca3af",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <p style={{ fontSize: 14 }}>No queries found</p>
            </div>
          ) : (
            Object.entries(groupedQueries).map(([group, items]) => (
              <div key={group} style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  paddingLeft: 4,
                }}>
                  {group}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {items.map((query) => (
                    <div
                      key={query.id}
                      onClick={() => onQuerySelect?.(query)}
                      style={{
                        padding: 12,
                        background: currentQuery === query.query ? "#eff6ff" : "#f9fafb",
                        border: currentQuery === query.query ? "1px solid #93c5fd" : "1px solid #e5e7eb",
                        borderRadius: 8,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (currentQuery !== query.query) {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentQuery !== query.query) {
                          e.currentTarget.style.background = "#f9fafb";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }
                      }}
                    >
                      {/* Query Header */}
                      <div style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        marginBottom: 6,
                      }}>
                        <span style={{ fontSize: 14 }}>{getTypeIcon(query.type)}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#1f2937",
                            lineHeight: 1.4,
                            marginBottom: 4,
                          }}>
                            {query.query}
                          </div>
                          <div style={{
                            fontSize: 12,
                            color: "#6b7280",
                            lineHeight: 1.4,
                          }}>
                            {query.summary}
                          </div>
                        </div>
                      </div>

                      {/* Query Footer */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: "1px solid #e5e7eb",
                      }}>
                        <div style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}>
                          🕐 {formatTimestamp(query.timestamp)}
                        </div>
                        {query.resultCount !== undefined && (
                          <div style={{
                            fontSize: 11,
                            color: "#6b7280",
                            background: "#e5e7eb",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontWeight: 500,
                          }}>
                            {query.resultCount} result{query.resultCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Stats */}
        <div style={{
          padding: 12,
          borderTop: "1px solid #e5e7eb",
          background: "#f9fafb",
          fontSize: 12,
          color: "#6b7280",
          display: "flex",
          justifyContent: "space-between",
        }}>
          <span>{filteredQueries.length} queries</span>
          <span>Last 7 days</span>
        </div>
      </div>
    </>
  );
}

// Export function to add query to history
export const addToQueryHistory = (query: Omit<QueryHistoryItem, "id" | "timestamp">) => {
  const newQuery: QueryHistoryItem = {
    ...query,
    id: `qh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  
  try {
    const stored = localStorage.getItem("queryHistory");
    const history = stored ? JSON.parse(stored) : [];
    const updatedHistory = [newQuery, ...history].slice(0, 50);
    localStorage.setItem("queryHistory", JSON.stringify(updatedHistory));
    
    // Dispatch storage event to update other components
    window.dispatchEvent(new StorageEvent("storage", {
      key: "queryHistory",
      newValue: JSON.stringify(updatedHistory),
    }));
  } catch (error) {
    console.error("Failed to save query to history:", error);
  }
};
