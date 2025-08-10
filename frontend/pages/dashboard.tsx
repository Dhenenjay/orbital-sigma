import { Protect } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import NaturalLanguageChat from "../components/NaturalLanguageChat";
import AoiMap from "../components/AoiMap";
import SignalsDisplay from "../components/SignalsDisplay";
import QueryHistorySidebar, { addToQueryHistory } from "../components/QueryHistorySidebar";
import Navbar from "../components/Navbar";
import ResponsiveDashboard from "../components/ResponsiveDashboard";

type AoiType = "port" | "farm" | "mine" | "energy";
interface Aoi { id: string; name: string; type: AoiType; bbox: number[]; description?: string }
interface Instruments {
  futures?: { symbol: string; name: string }[];
  etfs?: { symbol: string; name: string }[];
  fx?: { pair: string; name: string }[];
}

export default function DashboardPage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [type, setType] = useState<AoiType | "">("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Aoi[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selected, setSelected] = useState<Aoi | null>(null);
  const [instruments, setInstruments] = useState<Instruments | null>(null);
  const [loadingAoi, setLoadingAoi] = useState(false);
  const [aoiError, setAoiError] = useState<string | null>(null);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (type) params.set("type", type);
      const res = await fetch(`/api/aois${params.toString() ? `?${params.toString()}` : ""}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = (await res.json()) as Aoi[];
      setResults(data);
      
      // Add to query history
      if (q.trim() || type) {
        addToQueryHistory({
          query: q.trim() || `All ${type}s`,
          summary: `Found ${data.length} ${type || 'AOI'}${data.length !== 1 ? 's' : ''} ${q.trim() ? `matching "${q.trim()}"` : ''}`,
          type: "search",
          resultCount: data.length,
          parameters: { q: q.trim(), type }
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // Handle redirect status from pricing success
  useEffect(() => {
    const status = router.query.status as string | undefined;
    if (status === "success") {
      fetch("/api/billing/mark-pro", { method: "POST" }).finally(() => {
        router.replace(router.pathname, undefined, { shallow: true });
      });
    }
  }, [router.query.status, router]);

  // Load selected AOI + instruments when ?aoi= is present
  useEffect(() => {
    const aoi = router.query.aoi as string | undefined;
    if (!aoi) {
      setSelected(null);
      setInstruments(null);
      setAoiError(null);
      return;
    }
    (async () => {
      try {
        setLoadingAoi(true);
        setAoiError(null);
        // Fetch AOI details (search by id)
        const res = await fetch(`/api/aois?q=${encodeURIComponent(aoi)}`);
        if (!res.ok) throw new Error(`Failed to load AOI: ${res.status}`);
        const list = (await res.json()) as Aoi[];
        const found = list.find(x => x.id === aoi) ?? list[0] ?? null;
        setSelected(found);
        if (found) {
          const ins = await fetch(`/api/instruments?type=${encodeURIComponent(found.type)}`);
          if (ins.ok) {
            const payload = (await ins.json()) as Instruments;
            setInstruments(payload);
          } else {
            setInstruments(null);
          }
        } else {
          setInstruments(null);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed loading AOI";
        setAoiError(message);
        setSelected(null);
        setInstruments(null);
      } finally {
        setLoadingAoi(false);
      }
    })();
  }, [router.query.aoi]);

  // Handle query selection from sidebar
  const handleQuerySelect = (query: any) => {
    if (query.parameters) {
      setQ(query.parameters.q || "");
      setType(query.parameters.type || "");
      // Trigger search with the selected query parameters
      setTimeout(() => handleSearch(), 100);
    }
  };

  return (
    <>
      <Navbar />
      <ResponsiveDashboard sidebarOpen={sidebarOpen}>
        {/* Query History Sidebar */}
        <QueryHistorySidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onQuerySelect={handleQuerySelect}
          currentQuery={q}
        />

        <h1 style={{ marginBottom: 8 }}>Dashboard</h1>
        <p style={{ marginBottom: 24, color: "#6b7280" }}>Welcome to your satellite intelligence dashboard.</p>

        {/* GPT-5 Trading Signals */}
        <section className="responsive-section" style={{ 
          marginTop: 24, 
          padding: 16, 
          border: "1px solid #e5e7eb", 
          borderRadius: 8, 
          background: "#ffffff",
          width: "100%",
          boxSizing: "border-box"
        }}>
        <SignalsDisplay 
          aoiId={selected?.id}
          limit={8}
          minConfidence={0.5}
          showFilters={true}
        />
        </section>

        {/* Map Display */}
        {results.length > 0 && (
          <section className="responsive-section" style={{ 
            marginTop: 24, 
            marginBottom: 24,
            width: "100%"
          }}>
            <h2 style={{ marginBottom: 16 }}>AOI Locations</h2>
            <div style={{ 
              width: "100%", 
              height: "400px",
              minHeight: "300px",
              maxHeight: "60vh",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid #e5e7eb"
            }}>
              <AoiMap 
                aois={results} 
                selectedAoi={selected}
                onAoiClick={(aoi) => {
                  setSelected(aoi);
                  router.push({ pathname: "/dashboard", query: { aoi: aoi.id } }, undefined, { shallow: true });
                }}
                height="100%"
                showLabels={true}
              />
            </div>
          </section>
        )}

      {/* AOI info card when selected */}
      {selected && (
        <section style={{ marginTop: 16, padding: 16, border: "1px solid #93c5fd", background: "#eff6ff", borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <h2 style={{ margin: 0 }}>{selected.name}</h2>
              <div style={{ fontSize: 12, color: "#1f2937" }}>{selected.type} • {selected.id}</div>
              {selected.description && <p style={{ marginTop: 8 }}>{selected.description}</p>}
            </div>
            <button onClick={() => router.replace({ pathname: router.pathname }, undefined, { shallow: true })} style={{ padding: "6px 10px", borderRadius: 6, background: "#1f2937", color: "#fff" }}>
              Clear
            </button>
          </div>
          {loadingAoi && <p style={{ marginTop: 8 }}>Loading instruments…</p>}
          {aoiError && <p style={{ marginTop: 8, color: "#b91c1c" }}>{aoiError}</p>}
          {instruments && (
            <div style={{ marginTop: 8, display: "grid", gap: 12 }}>
              <div>
                <strong>Futures</strong>
                <ul style={{ marginTop: 4 }}>
                  {(instruments.futures ?? []).map((f) => (
                    <li key={f.symbol}>{f.symbol} — {f.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>ETFs</strong>
                <ul style={{ marginTop: 4 }}>
                  {(instruments.etfs ?? []).map((e) => (
                    <li key={e.symbol}>{e.symbol} — {e.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>FX</strong>
                <ul style={{ marginTop: 4 }}>
                  {(instruments.fx ?? []).map((x) => (
                    <li key={x.pair}>{x.pair} — {x.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}

        <section className="responsive-section" style={{ 
          marginTop: 24, 
          padding: 16, 
          border: "1px solid #e5e7eb", 
          borderRadius: 8,
          width: "100%",
          boxSizing: "border-box"
        }}>
          <h2>AOI Search</h2>
          <form onSubmit={handleSearch} className="tablet-stack" style={{ 
            display: "flex", 
            gap: 8, 
            alignItems: "center", 
            flexWrap: "wrap", 
            marginTop: 8 
          }}>
            <input
              type="text"
              placeholder="Search AOIs (e.g. copper, Los Angeles)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="tablet-full-width"
              style={{ 
                padding: 8, 
                border: "1px solid #d1d5db", 
                borderRadius: 6, 
                minWidth: 260,
                flex: "1 1 auto"
              }}
            />
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as AoiType | "")}
              className="tablet-full-width" 
              style={{ 
                padding: 8, 
                border: "1px solid #d1d5db", 
                borderRadius: 6,
                minWidth: 150
              }}
            >
              <option value="">All types</option>
              <option value="port">Port</option>
              <option value="farm">Farm</option>
              <option value="mine">Mine</option>
              <option value="energy">Energy</option>
            </select>
            <button 
              type="submit" 
              disabled={loading}
              className="tablet-full-width" 
              style={{ 
                padding: "8px 14px", 
                background: "#111827", 
                color: "white", 
                borderRadius: 6,
                minWidth: 100,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

        {error && <p style={{ color: "#b91c1c", marginTop: 8 }}>{error}</p>}

        {results.length > 0 && (
          <ul style={{ marginTop: 12, listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
            {results.map((a) => (
              <li key={a.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{a.type} • {a.id}</div>
                    {a.description && <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>{a.description}</div>}
                  </div>
                  <Link href={{ pathname: "/dashboard", query: { aoi: a.id } }} style={{ padding: "6px 10px", background: "#111827", color: "white", borderRadius: 6 }}>
                    Select
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pro-only area */}
      <Protect has={{ plan: "pro" }}>
        <section style={{ marginTop: 24, padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <h2>Pro features</h2>
          <p>You are on the Pro plan. Unlimited queries are enabled.</p>
        </section>
      </Protect>

      {/* Shown to non-Pro users */}
      <Protect hasNot={{ plan: "pro" }}>
        <section style={{ marginTop: 24, padding: 16, border: "1px dashed #f59e0b", borderRadius: 8, background: "#fffbeb" }}>
          <h2>Upgrade to Pro</h2>
          <p>You are on the Free plan (5 queries/day). Upgrade for unlimited queries.</p>
          <Link href="/pricing" style={{ display: "inline-block", marginTop: 12, padding: "8px 14px", background: "#111827", color: "white", borderRadius: 6 }}>
            View plans
          </Link>
        </section>
      </Protect>

        {/* Natural Language Chat Assistant */}
        <NaturalLanguageChat />
        
        <style jsx>{`
          @media (max-width: 1023px) {
            .responsive-section {
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
          }
          
          @media (max-width: 639px) {
            h1 {
              font-size: 1.5rem;
            }
            
            h2 {
              font-size: 1.25rem;
            }
            
            section {
              padding: 12px !important;
              margin-top: 16px !important;
            }
          }
        `}</style>
      </ResponsiveDashboard>
    </>
  );
}
