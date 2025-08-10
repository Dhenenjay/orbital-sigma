import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Protect, useUser, UserButton } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';

// Dynamic import for map to avoid SSR issues
const ProfessionalMap = dynamic(() => import('../components/ProfessionalMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-950 animate-pulse" />
});

// Dynamic import Evidence Modal
const EvidenceModal = dynamic(() => import('../components/EvidenceModal'), {
  ssr: false
});

interface Signal {
  id: string;
  direction: 'Bullish' | 'Bearish' | 'Neutral';
  instruments: string[];
  horizon: string;
  impact: number;
  confidence: number;
  thesis: string;
  location?: string;
  magnitude?: number;
  timestamp?: Date;
  evidence?: {
    before?: string;
    after?: string;
    metrics?: Record<string, any>;
  };
}

interface AOIHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  magnitude: number;
  type: 'port' | 'farm' | 'mine' | 'energy';
  status: 'critical' | 'warning' | 'normal';
}

interface SavedQuery {
  id: string;
  query: string;
  timestamp: Date;
  alerts: boolean;
  threshold?: number;
}

export default function HFTIntelligencePage() {
  const router = useRouter();
  const { user } = useUser();
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [hotspots, setHotspots] = useState<AOIHotspot[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [scanningStatus, setScanningStatus] = useState('');
  const [lastScanTime, setLastScanTime] = useState(new Date());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with some demo hotspots
  useEffect(() => {
    // Simulate initial hotspots
    const initialHotspots: AOIHotspot[] = [
      { id: 'port-shanghai', name: 'Port of Shanghai', lat: 31.2304, lng: 121.4737, magnitude: 0.3, type: 'port', status: 'normal' },
      { id: 'port-singapore', name: 'Port of Singapore', lat: 1.2655, lng: 103.8186, magnitude: 0.4, type: 'port', status: 'normal' },
      { id: 'farm-mato-grosso', name: 'Mato Grosso Soy', lat: -12.6819, lng: -56.9211, magnitude: 0.2, type: 'farm', status: 'normal' },
    ];
    setHotspots(initialHotspots);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isProcessing) return;

    const userQuery = query.trim();
    setIsProcessing(true);
    setScanningStatus('Scanning AlphaEarth embeddings...');

    // Parse intent from query
    const intent = parseQueryIntent(userQuery);

    try {
      // Simulate progressive scanning
      await new Promise(resolve => setTimeout(resolve, 800));
      setScanningStatus(`Scanning AlphaEarth embeddings for: ${intent.region} • ${intent.domain} • last ${intent.timeWindow}...`);
      
      // Auto-zoom map based on query
      if (intent.region && intent.region !== 'Global') {
        zoomToRegion(intent.region);
      }

      // Call the actual API
      const response = await fetch('/api/intelligence/generate-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: userQuery,
          maxSignals: 5,
          timeWindow: intent.timeWindow 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to process: ${response.statusText}`);
      }

      const result = await response.json();

      // Process signals
      if (result.signals && result.signals.length > 0) {
        const processedSignals: Signal[] = result.signals.map((sig: any) => ({
          id: sig.id || `sig-${Date.now()}-${Math.random()}`,
          direction: sig.direction === 'long' ? 'Bullish' : sig.direction === 'short' ? 'Bearish' : 'Neutral',
          instruments: [sig.instrument],
          horizon: sig.timeHorizon || '2-4 weeks',
          impact: sig.impact || 75,
          confidence: sig.confidence || 0.75,
          thesis: sig.thesis || sig.rationale,
          location: sig.aoiName || intent.region,
          magnitude: sig.magnitude || 0.7,
          timestamp: new Date()
        }));

        setSignals(prev => [...processedSignals, ...prev]);

        // Update hotspots with signal locations
        const newHotspots: AOIHotspot[] = processedSignals.map(sig => ({
          id: `hotspot-${sig.id}`,
          name: sig.location || 'Anomaly',
          lat: Math.random() * 180 - 90, // In production, use real coordinates
          lng: Math.random() * 360 - 180,
          magnitude: sig.magnitude || 0.5,
          type: intent.domain === 'Agriculture' ? 'farm' : 
                intent.domain === 'Shipping' ? 'port' : 
                intent.domain === 'Mining' ? 'mine' : 'energy',
          status: sig.magnitude! > 0.7 ? 'critical' : sig.magnitude! > 0.4 ? 'warning' : 'normal'
        }));

        setHotspots(prev => [...newHotspots, ...prev.map(h => ({ ...h, magnitude: h.magnitude * 0.8 }))]);
      }

      setLastScanTime(new Date());
      setQuery('');
    } catch (error) {
      console.error('Error:', error);
      // Show error in UI
    } finally {
      setIsProcessing(false);
      setScanningStatus('');
    }
  };

  const parseQueryIntent = (text: string) => {
    const lower = text.toLowerCase();
    return {
      region: lower.includes('brazil') ? 'Brazil' :
              lower.includes('china') || lower.includes('shanghai') ? 'China' :
              lower.includes('singapore') ? 'Southeast Asia' :
              lower.includes('chile') ? 'South America' :
              lower.includes('texas') || lower.includes('us') ? 'United States' : 'Global',
      domain: lower.includes('soy') || lower.includes('farm') ? 'Agriculture' :
              lower.includes('port') || lower.includes('shipping') ? 'Shipping' :
              lower.includes('copper') || lower.includes('mine') ? 'Mining' : 'Energy',
      timeWindow: lower.includes('week') ? '14 days' :
                  lower.includes('month') ? '30 days' :
                  lower.includes('today') ? '24 hours' : '14 days'
    };
  };

  const zoomToRegion = (region: string) => {
    // This would communicate with the map component
    console.log('Zooming to:', region);
  };

  const exportSignals = () => {
    const csv = [
      ['Timestamp', 'Direction', 'Instruments', 'Horizon', 'Impact', 'Confidence', 'Thesis'],
      ...signals.map(s => [
        s.timestamp?.toISOString() || '',
        s.direction,
        s.instruments.join('; '),
        s.horizon,
        s.impact.toString(),
        (s.confidence * 100).toFixed(0) + '%',
        s.thesis
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signals-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
  };

  const copyThesis = (thesis: string) => {
    navigator.clipboard.writeText(thesis);
    // Show toast notification
  };

  const saveQuery = () => {
    if (!query.trim()) return;
    const newQuery: SavedQuery = {
      id: `query-${Date.now()}`,
      query: query.trim(),
      timestamp: new Date(),
      alerts: false
    };
    setSavedQueries(prev => [newQuery, ...prev]);
  };

  const suggestedQueries = [
    "Show me any changes in Brazilian soy regions in the past 2 weeks and how it might impact soy futures.",
    "Which ports look stressed this week and what could that do to shipping & retail?",
    "Detect copper mine disruptions in Chile that could affect HG futures next month.",
    "Find oil infrastructure changes in the Permian Basin affecting energy prices.",
    "Show agriculture anomalies in Ukraine and their impact on wheat futures."
  ];

  return (
    <Protect>
      <div className="h-screen flex bg-slate-950 text-gray-100 font-sans">
        {/* Left: World Map */}
        <div className="w-1/2 h-full relative bg-slate-900">
          <ProfessionalMap 
            hotspots={hotspots}
            selectedSignal={selectedSignal}
            onHotspotClick={(id) => {
              const signal = signals.find(s => `hotspot-${s.id}` === id);
              if (signal) setSelectedSignal(signal);
            }}
          />
          
          {/* Status Pill */}
          <div className="absolute top-6 left-6 z-10">
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-full px-5 py-2.5 flex items-center space-x-3 shadow-2xl">
              <div className="relative">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              </div>
              <span className="text-sm text-gray-300 font-medium">
                Last Earth scan: {format(lastScanTime, 'MMM d, yyyy, HH:mm')} UTC
              </span>
            </div>
          </div>

          {/* Scanning Status */}
          {scanningStatus && (
            <div className="absolute top-20 left-6 right-6 z-10">
              <div className="bg-indigo-900/90 backdrop-blur-md border border-indigo-600 rounded-lg px-5 py-3 shadow-2xl">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin h-4 w-4 border-2 border-indigo-300 border-t-transparent rounded-full" />
                  <span className="text-sm text-indigo-100">{scanningStatus}</span>
                </div>
              </div>
            </div>
          )}

          {/* Top Areas Today */}
          {hotspots.filter(h => h.status !== 'normal').length > 0 && (
            <div className="absolute bottom-6 left-6 z-10">
              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg p-4 shadow-2xl">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top 3 areas today</h4>
                <div className="space-y-2">
                  {hotspots
                    .filter(h => h.status !== 'normal')
                    .slice(0, 3)
                    .map(hotspot => (
                      <div key={hotspot.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-200">{hotspot.name}</span>
                        <span className={`font-medium ${
                          hotspot.status === 'critical' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {(hotspot.magnitude * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Natural Language Box */}
        <div className="w-1/2 h-full flex flex-col bg-slate-900 border-l border-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div>
              <h1 className="text-xl font-semibold text-white">AlphaEarth Intelligence</h1>
              <p className="text-sm text-gray-400 mt-1">
                Satellite embeddings → Market signals with GPT-5
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSavedQueries(!showSavedQueries)}
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>My Queries</span>
              </button>
              <button
                onClick={() => router.push('/history')}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                History
              </button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>

          {/* Signals Display Area */}
          <div className="flex-1 overflow-y-auto">
            {signals.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center p-8">
                <div className="max-w-lg text-center">
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Ask about market-moving Earth changes</h3>
                  <p className="text-sm text-gray-500 mb-8">
                    We scan satellite embeddings, compare to history, and turn changes into trade ideas.
                  </p>
                  <div className="space-y-2">
                    {suggestedQueries.slice(0, 3).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(suggestion)}
                        className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm text-gray-300 hover:text-white transition-all"
                      >
                        "{suggestion}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {signals.map(signal => (
                  <div key={signal.id} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors">
                    {/* Signal Header */}
                    <div className="px-5 py-4 border-b border-slate-700">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <span className={`text-2xl ${
                            signal.direction === 'Bullish' ? '📈' : 
                            signal.direction === 'Bearish' ? '📉' : '➡️'
                          }`} />
                          <div>
                            <h4 className="font-semibold text-white">
                              {signal.direction}: {signal.instruments.join(', ')}
                            </h4>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                              <span>Horizon: {signal.horizon}</span>
                              <span>•</span>
                              <span>Impact: {signal.impact}/100</span>
                              <span>•</span>
                              <span>Confidence: {(signal.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {signal.timestamp && format(signal.timestamp, 'HH:mm')}
                        </span>
                      </div>
                    </div>

                    {/* Thesis */}
                    <div className="px-5 py-4">
                      <p className="text-sm text-gray-300 leading-relaxed">{signal.thesis}</p>
                    </div>

                    {/* Actions */}
                    <div className="px-5 py-3 bg-slate-900/30 border-t border-slate-700 flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setSelectedSignal(signal);
                          setShowEvidence(true);
                        }}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Show evidence
                      </button>
                      <span className="text-gray-600">•</span>
                      <button
                        onClick={exportSignals}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Export CSV
                      </button>
                      <span className="text-gray-600">•</span>
                      <button
                        onClick={() => copyThesis(signal.thesis)}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Copy thesis
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-800 p-6">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder='Ask: "Where did vegetation drop in Brazil soy zones this month?"'
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  rows={2}
                  disabled={isProcessing}
                />
                <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                  {query && !isProcessing && (
                    <>
                      <button
                        type="button"
                        onClick={saveQuery}
                        className="p-1.5 text-gray-400 hover:text-white transition-colors"
                        title="Save query"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </>
                  )}
                  <button
                    type="submit"
                    disabled={isProcessing || !query.trim()}
                    className={`px-4 py-1.5 rounded-md font-medium transition-all ${
                      isProcessing || !query.trim()
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {isProcessing ? (
                      <span className="flex items-center space-x-2">
                        <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                        <span>Scanning...</span>
                      </span>
                    ) : (
                      'Analyze'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Evidence Modal */}
        {showEvidence && selectedSignal && (
          <EvidenceModal
            signal={selectedSignal}
            onClose={() => setShowEvidence(false)}
          />
        )}

        {/* Saved Queries Sidebar */}
        {showSavedQueries && (
          <div className="absolute right-0 top-0 h-full w-80 bg-slate-900 border-l border-slate-800 z-20 shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-white">Saved Queries</h3>
              <button
                onClick={() => setShowSavedQueries(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto h-full pb-20">
              {savedQueries.length === 0 ? (
                <p className="text-gray-500 text-sm p-4">No saved queries yet</p>
              ) : (
                <div className="p-4 space-y-3">
                  {savedQueries.map(sq => (
                    <div key={sq.id} className="bg-slate-800 rounded-lg p-3">
                      <p className="text-sm text-gray-200 mb-2">{sq.query}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {format(sq.timestamp, 'MMM d, HH:mm')}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setQuery(sq.query)}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            Run again
                          </button>
                          <button className="text-xs text-gray-400 hover:text-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Protect>
  );
}
