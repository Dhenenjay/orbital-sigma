import { Protect, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import NaturalLanguageChat from "../components/NaturalLanguageChat";
import AoiMap from "../components/AoiMap";
import SignalsDisplay from "../components/SignalsDisplay";
import QueryHistorySidebar, { addToQueryHistory } from "../components/QueryHistorySidebar";
import Navbar from "../components/Navbar";
import ErrorBanner, { useErrorBanner, detectErrorType } from "../components/ErrorBanner";
import OnboardingModal, { useOnboarding } from "../components/OnboardingModal";

type AoiType = "port" | "farm" | "mine" | "energy";
interface Aoi { id: string; name: string; type: AoiType; bbox: number[]; description?: string }
interface Instruments {
  futures?: { symbol: string; name: string }[];
  etfs?: { symbol: string; name: string }[];
  fx?: { pair: string; name: string }[];
}

export default function DashboardProPage() {
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
  const { error: bannerError, showError, clearError } = useErrorBanner();
  const { showOnboarding, closeOnboarding, resetOnboarding } = useOnboarding();

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    clearError();
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (type) params.set("type", type);
      const res = await fetch(`/api/aois${params.toString() ? `?${params.toString()}` : ""}`);
      if (!res.ok) {
        // Simulate different error types based on status code
        if (res.status === 503) {
          throw { 
            message: "Google Earth Engine service is temporarily unavailable",
            code: "gee_unavailable",
            details: "The satellite imagery processing service is experiencing high demand"
          };
        } else if (res.status === 429) {
          throw { 
            message: "Earth Engine API rate limit exceeded",
            code: "gee_quota",
            details: "You've reached your hourly processing limit. Please wait before making more requests."
          };
        } else if (res.status === 401) {
          throw { 
            message: "Authentication required",
            code: "401",
            details: "Your session has expired. Please sign in again."
          };
        }
        throw new Error(`Search failed: ${res.status}`);
      }
      const data = (await res.json()) as Aoi[];
      setResults(data);
      
      if (q.trim() || type) {
        addToQueryHistory({
          query: q.trim() || `All ${type}s`,
          summary: `Found ${data.length} ${type || 'AOI'}${data.length !== 1 ? 's' : ''} ${q.trim() ? `matching "${q.trim()}"` : ''}`,
          type: "search",
          resultCount: data.length,
          parameters: { q: q.trim(), type }
        });
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : (err.message || "Search failed");
      setError(message);
      
      // Show error banner for critical errors
      const errorType = detectErrorType(err);
      showError({
        type: errorType,
        message: message,
        details: err.details,
        retryable: true,
        actionLabel: "Retry Search",
        actionCallback: () => {
          clearError();
          handleSearch();
        }
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const status = router.query.status as string | undefined;
    if (status === "success") {
      fetch("/api/billing/mark-pro", { method: "POST" }).finally(() => {
        router.replace(router.pathname, undefined, { shallow: true });
      });
    }
  }, [router.query.status, router]);

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
        clearError();
        const res = await fetch(`/api/aois?q=${encodeURIComponent(aoi)}`);
        if (!res.ok) {
          // Handle specific API errors
          if (res.status === 503) {
            throw { 
              message: "GPT-5 service temporarily unavailable",
              code: "service_unavailable",
              details: "The AI analysis service is experiencing high demand"
            };
          }
          throw new Error(`Failed to load AOI: ${res.status}`);
        }
        const list = (await res.json()) as Aoi[];
        const found = list.find(x => x.id === aoi) ?? list[0] ?? null;
        setSelected(found);
        if (found) {
          const ins = await fetch(`/api/instruments?type=${encodeURIComponent(found.type)}`);
          if (ins.ok) {
            const payload = (await ins.json()) as Instruments;
            setInstruments(payload);
          } else {
            // Handle instruments API error
            if (ins.status === 429) {
              showError({
                type: "gpt5_rate_limit",
                message: "GPT-5 rate limit reached while fetching market instruments",
                details: "Please wait a few moments before requesting instrument data",
                retryable: false
              });
            }
            setInstruments(null);
          }
        } else {
          setInstruments(null);
        }
      } catch (e: any) {
        const message = e instanceof Error ? e.message : (e.message || "Failed loading AOI");
        setAoiError(message);
        setSelected(null);
        setInstruments(null);
        
        // Show error banner for critical errors
        const errorType = detectErrorType(e);
        showError({
          type: errorType,
          message: message,
          details: e.details,
          retryable: true,
          actionLabel: "Retry",
          actionCallback: () => {
            clearError();
            router.push({ pathname: "/dashboard-pro", query: { aoi } }, undefined, { shallow: true });
          }
        });
      } finally {
        setLoadingAoi(false);
      }
    })();
  }, [router.query.aoi]);

  const handleQuerySelect = (query: any) => {
    if (query.parameters) {
      setQ(query.parameters.q || "");
      setType(query.parameters.type || "");
      setTimeout(() => handleSearch(), 100);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Onboarding Modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={closeOnboarding} />
      
      {/* Error Banner */}
      <ErrorBanner error={bannerError} onDismiss={clearError} autoHide={false} />
      {/* Professional Navbar */}
      <nav className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
                  <span className="text-lg">🛰️</span>
                </div>
                <div>
                  <h1 className="text-white font-bold text-lg tracking-tight">Orbital Sigma</h1>
                  <p className="text-gray-400 text-xs tracking-wider uppercase">Intelligence Platform</p>
                </div>
              </div>
              
              <div className="hidden md:flex items-center space-x-1">
                <Link href="/dashboard-pro" className="px-4 py-2 text-sm font-medium text-white bg-gray-800/50 rounded-lg">
                  Dashboard
                </Link>
                <Link href="/signals" className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/30 rounded-lg transition-all">
                  Signals
                </Link>
                <Link href="/analytics" className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/30 rounded-lg transition-all">
                  Analytics
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-green-400 text-xs font-medium">Live</span>
              </div>
              <button className="p-2 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <button 
                onClick={resetOnboarding}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="View tutorial"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <Protect>
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                      userButtonPopoverCard: "bg-gray-900 border-gray-800",
                      userButtonPopoverActionButton: "text-gray-300 hover:text-white hover:bg-gray-800",
                    },
                  }}
                />
              </Protect>
            </div>
          </div>
        </div>
      </nav>

      <QueryHistorySidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onQuerySelect={handleQuerySelect}
        currentQuery={q}
      />

      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-80' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-light text-white tracking-tight">
                  Market Intelligence
                </h2>
                <p className="mt-1 text-gray-400">
                  Real-time satellite analytics • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-all flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">History</span>
                </button>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium">New Query</span>
                </button>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Active Signals</span>
                <span className="text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded-full">+12%</span>
              </div>
              <div className="text-2xl font-bold text-white">247</div>
              <div className="text-xs text-gray-500 mt-1">Last 24 hours</div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">AOIs Monitored</span>
                <span className="text-blue-400 text-xs bg-blue-400/10 px-2 py-1 rounded-full">Live</span>
              </div>
              <div className="text-2xl font-bold text-white">1,429</div>
              <div className="text-xs text-gray-500 mt-1">Across 47 regions</div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Confidence Avg</span>
                <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded-full">76%</span>
              </div>
              <div className="text-2xl font-bold text-white">0.76</div>
              <div className="text-xs text-gray-500 mt-1">Above threshold</div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">API Usage</span>
                <span className="text-purple-400 text-xs bg-purple-400/10 px-2 py-1 rounded-full">Pro</span>
              </div>
              <div className="text-2xl font-bold text-white">∞</div>
              <div className="text-xs text-gray-500 mt-1">Unlimited queries</div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-medium text-white mb-4">AOI Search</h3>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search by location, commodity, or identifier..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value as AoiType | "")}
                className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                <option value="">All Types</option>
                <option value="port">Port</option>
                <option value="farm">Farm</option>
                <option value="mine">Mine</option>
                <option value="energy">Energy</option>
              </select>
              <button 
                type="submit" 
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Search</span>
                  </>
                )}
              </button>
            </form>
            
            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Map Display */}
          {results.length > 0 && (
            <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden mb-8">
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-lg font-medium text-white">AOI Locations</h3>
                <p className="text-sm text-gray-400 mt-1">{results.length} areas of interest identified</p>
              </div>
              <div className="h-96">
                <AoiMap 
                  aois={results} 
                  selectedAoi={selected}
                  onAoiClick={(aoi) => {
                    setSelected(aoi);
                    router.push({ pathname: "/dashboard-pro", query: { aoi: aoi.id } }, undefined, { shallow: true });
                  }}
                  height="100%"
                  showLabels={true}
                />
              </div>
            </div>
          )}

          {/* Selected AOI Details */}
          {selected && (
            <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 backdrop-blur-sm border border-indigo-800/50 rounded-xl p-6 mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">{selected.name}</h3>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-400">Type: <span className="text-indigo-400 font-medium">{selected.type}</span></span>
                    <span className="text-gray-400">ID: <span className="text-gray-300 font-mono">{selected.id}</span></span>
                  </div>
                  {selected.description && (
                    <p className="mt-3 text-gray-400">{selected.description}</p>
                  )}
                </div>
                <button 
                  onClick={() => router.replace({ pathname: router.pathname }, undefined, { shallow: true })}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all text-sm"
                >
                  Clear
                </button>
              </div>
              
              {loadingAoi && <p className="mt-4 text-gray-400 text-sm">Loading instruments...</p>}
              {aoiError && <p className="mt-4 text-red-400 text-sm">{aoiError}</p>}
              
              {instruments && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Futures</h4>
                    <ul className="space-y-1">
                      {(instruments.futures ?? []).map((f) => (
                        <li key={f.symbol} className="text-xs text-gray-400">
                          <span className="text-indigo-400 font-medium">{f.symbol}</span> — {f.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">ETFs</h4>
                    <ul className="space-y-1">
                      {(instruments.etfs ?? []).map((e) => (
                        <li key={e.symbol} className="text-xs text-gray-400">
                          <span className="text-indigo-400 font-medium">{e.symbol}</span> — {e.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">FX</h4>
                    <ul className="space-y-1">
                      {(instruments.fx ?? []).map((x) => (
                        <li key={x.pair} className="text-xs text-gray-400">
                          <span className="text-indigo-400 font-medium">{x.pair}</span> — {x.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trading Signals Section */}
          <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl">
            <SignalsDisplay 
              aoiId={selected?.id}
              limit={8}
              minConfidence={0.5}
              showFilters={true}
            />
          </div>

          {/* Search Results */}
          {results.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-white mb-4">Search Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((aoi) => (
                  <div key={aoi.id} className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-indigo-800/50 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-white font-medium">{aoi.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-400">{aoi.type}</span>
                          <span className="text-xs text-gray-600">•</span>
                          <span className="text-xs text-gray-500 font-mono">{aoi.id}</span>
                        </div>
                      </div>
                      <Link 
                        href={{ pathname: "/dashboard-pro", query: { aoi: aoi.id } }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-all"
                      >
                        Select
                      </Link>
                    </div>
                    {aoi.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">{aoi.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pro Features Section */}
          <Protect has={{ plan: "pro" }}>
            <div className="mt-8 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 backdrop-blur-sm border border-indigo-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Pro Features Active</h3>
                  <p className="text-sm text-gray-400">Unlimited queries • Priority processing • Advanced analytics</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">Active</span>
                </div>
              </div>
            </div>
          </Protect>

          {/* Free Plan Upgrade */}
          <Protect hasNot={{ plan: "pro" }}>
            <div className="mt-8 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 backdrop-blur-sm border border-yellow-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Upgrade to Pro</h3>
                  <p className="text-sm text-gray-400">Currently on Free plan (5 queries/day). Unlock unlimited access.</p>
                </div>
                <Link 
                  href="/pricing"
                  className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-medium rounded-lg transition-all"
                >
                  Upgrade Now
                </Link>
              </div>
            </div>
          </Protect>
        </div>
      </main>

      {/* Natural Language Chat */}
      <NaturalLanguageChat />
    </div>
  );
}
