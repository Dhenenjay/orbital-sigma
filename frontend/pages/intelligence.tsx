import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Protect, useUser, UserButton } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import { Bell, Save, History, Send } from 'lucide-react';

// Dynamic imports to avoid SSR issues
const MapView = dynamic(() => import('../components/IntelligenceMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-950 animate-pulse" />
});

const EvidencePanel = dynamic(() => import('../components/EvidencePanel'), {
  ssr: false
});

interface Signal {
  id: string;
  instrument: string;
  direction: "long" | "short" | "neutral";
  confidence: number;
  rationale: string;
  thesis: string;
  horizon: string;
  impact: number;
  aoi: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    magnitude: number;
  };
}

interface Message {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  signals?: Signal[];
  status?: string;
}

export default function IntelligencePage() {
  const router = useRouter();
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAoi, setSelectedAoi] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 20, lng: 0 });
  const [mapZoom, setMapZoom] = useState(2);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [scanStatus, setScanStatus] = useState("");
  const [showEvidence, setShowEvidence] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<any>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
  const [savedQueries, setSavedQueries] = useState<any[]>([]);
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [saveCurrentQuery, setSaveCurrentQuery] = useState(false);
  const [queryHistory, setQueryHistory] = useState<any[]>([]);
  const [focusedRegion, setFocusedRegion] = useState<string>("");
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isProcessing) return;

    const userQuery = query.trim();
    setQuery("");
    setIsProcessing(true);

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: "user",
      content: userQuery,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Parse the query to understand intent for UI updates
    const intent = parseQueryIntent(userQuery);
    
    // Update scan status with real stages
    setScanStatus(`Parsing query with NLP...`);

    // If region mentioned, auto-zoom map
    if (intent.region && intent.region !== 'Global') {
      zoomToRegion(intent.region);
    }

    try {
      // Call the real API endpoint that orchestrates everything
      const response = await fetch('/api/intelligence/generate-signals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin', // Include cookies for authentication
        body: JSON.stringify({ query: userQuery }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate signals';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // If response.json() fails, use status text
          errorMessage = `${response.status}: ${response.statusText || 'Server error'}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Update scan status as we process
      setScanStatus(`Analyzing ${result.aois?.length || 0} areas of interest...`);
      
      // Store anomalies for evidence panel
      if (result.anomalies && result.anomalies.length > 0) {
        setSelectedAnomaly(result.anomalies[0]);
      }
      
      // Transform the API response into our Signal format
      const signals: Signal[] = result.signals?.map((sig: any) => ({
        id: sig.id || `sig-${Date.now()}-${Math.random()}`,
        instrument: sig.instrument,
        direction: sig.direction,
        confidence: sig.confidence,
        rationale: sig.rationale || '',
        thesis: sig.thesis,
        horizon: sig.timeHorizon,
        impact: Math.round(sig.impact * 100),
        aoi: {
          id: sig.aoi?.id || `aoi-${Date.now()}`,
          name: sig.aoi?.name || sig.region || 'Unknown',
          lat: sig.aoi?.lat || 0,
          lng: sig.aoi?.lng || 0,
          magnitude: sig.confidence || 0.5
        }
      })) || [];
      
      // Update hotspots on map from detected anomalies
      if (result.anomalies && result.anomalies.length > 0) {
        const newHotspots = result.anomalies.map((anomaly: any) => ({
          id: anomaly.id || `hotspot-${Date.now()}-${Math.random()}`,
          lat: anomaly.coordinates?.lat || anomaly.lat || 0,
          lng: anomaly.coordinates?.lng || anomaly.lng || 0,
          magnitude: anomaly.score || 0.5,
          name: anomaly.location || anomaly.name || 'Anomaly Detected'
        }));
        setHotspots(newHotspots);
      } else if (signals.length > 0) {
        // Fallback to signal locations if no anomalies
        const newHotspots = signals.map(sig => ({
          id: sig.aoi.id,
          lat: sig.aoi.lat,
          lng: sig.aoi.lng,
          magnitude: sig.aoi.magnitude,
          name: sig.aoi.name
        }));
        setHotspots(newHotspots);
      }

      // Create assistant response with real data
      const summary = result.summary || 
        (signals.length > 0 
          ? `Found ${signals.length} trading signal${signals.length > 1 ? 's' : ''} based on satellite analysis and anomaly detection.`
          : "No significant anomalies detected for your query.");
      
      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        type: "assistant",
        content: summary,
        timestamp: new Date(),
        signals
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error processing query:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        type: "system",
        content: `Error: ${error instanceof Error ? error.message : 'Failed to process query. Please check if all services are running.'}

Make sure:
1. The Convex backend is running (npx convex dev)
2. The geo-service is running (cd geo-service && python -m uvicorn app:app)
3. All API keys are properly configured in .env.local`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setScanStatus("");
    }
  };

  const parseQueryIntent = (query: string) => {
    const lower = query.toLowerCase();
    return {
      region: lower.includes('brazil') ? 'Brazil' : 
              lower.includes('china') ? 'China' :
              lower.includes('us') || lower.includes('america') ? 'United States' : 
              lower.includes('europe') ? 'Europe' : 'Global',
      type: lower.includes('soy') || lower.includes('farm') || lower.includes('agriculture') ? 'Agriculture' :
            lower.includes('port') || lower.includes('shipping') ? 'Port' :
            lower.includes('mine') || lower.includes('copper') || lower.includes('gold') ? 'Mining' :
            lower.includes('oil') || lower.includes('energy') ? 'Energy' : 'All',
      timeWindow: lower.includes('week') ? '7 days' :
                  lower.includes('month') ? '30 days' :
                  lower.includes('day') ? '24 hours' : '14 days',
      commodity: lower.includes('soy') ? 'Soybeans' :
                 lower.includes('copper') ? 'Copper' :
                 lower.includes('oil') ? 'Crude Oil' : null
    };
  };

  const zoomToRegion = (region: string) => {
    const regions: Record<string, any> = {
      'Brazil': { lat: -15.793889, lng: -47.882778, zoom: 5 },
      'China': { lat: 35.86166, lng: 104.195397, zoom: 4 },
      'United States': { lat: 37.0902, lng: -95.712891, zoom: 4 },
      'Europe': { lat: 54.5260, lng: 15.2551, zoom: 4 },
      'Global': { lat: 20, lng: 0, zoom: 2 }
    };

    const target = regions[region] || regions['Global'];
    setMapCenter({ lat: target.lat, lng: target.lng });
    setMapZoom(target.zoom);
  };

  const handleSaveQuery = () => {
    if (messages.length > 0) {
      const currentQuery = {
        id: `query-${Date.now()}`,
        timestamp: new Date(),
        messages: messages,
        saved: true
      };
      setSavedQueries(prev => [currentQuery, ...prev]);
      setQueryHistory(prev => [currentQuery, ...prev.slice(0, 9)]); // Keep last 10
      console.log('Query saved successfully');
    }
  };

  const exportSignals = (signals: Signal[]) => {
    const csvContent = [
      ['Instrument', 'Direction', 'Confidence', 'Impact', 'Horizon', 'Thesis', 'Location'],
      ...signals.map(s => [
        s.instrument,
        s.direction,
        `${Math.round(s.confidence * 100)}%`,
        `${s.impact}/100`,
        s.horizon,
        s.thesis,
        s.aoi.name
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signals-${Date.now()}.csv`;
    a.click();
  };

  const copyThesis = (thesis: string) => {
    navigator.clipboard.writeText(thesis);
    // Show a brief toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg z-50';
    toast.textContent = 'Thesis copied to clipboard';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };
  
  const showSignalEvidence = (signal: Signal) => {
    setSelectedSignal(signal);
    setShowEvidence(signal.id);
  };

  // Track what user is typing and focus map accordingly
  const handleQueryChange = (value: string) => {
    setQuery(value);
    
    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to detect when user stops typing
    const timeout = setTimeout(() => {
      // Extract location keywords from query
      const locationKeywords = [
        'brazil', 'brazilian', 'soy', 'soybeans',
        'chile', 'chilean', 'copper',
        'china', 'chinese', 'shanghai', 'beijing',
        'singapore', 'singaporean',
        'usa', 'united states', 'america', 'texas',
        'port', 'ports', 'shipping',
        'mine', 'mines', 'mining',
        'farm', 'farms', 'agriculture',
        'europe', 'european',
        'africa', 'african',
        'asia', 'asian',
        'middle east'
      ];
      
      const lowerQuery = value.toLowerCase();
      for (const keyword of locationKeywords) {
        if (lowerQuery.includes(keyword)) {
          setFocusedRegion(keyword);
          break;
        }
      }
    }, 500); // Wait 500ms after user stops typing
    
    setTypingTimeout(timeout);
  };

  return (
    <Protect>
      <div className="h-screen flex bg-gray-950 text-white">
        {/* Left: World Map */}
        <div className="w-1/2 h-full relative">
        <MapView 
          center={mapCenter}
          zoom={mapZoom}
          hotspots={hotspots}
          selectedAoi={selectedAoi}
          onAoiClick={setSelectedAoi}
          focusedRegion={focusedRegion}
        />
          
          {/* Map Status Pill */}
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-full px-4 py-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-300">
                Last Earth scan: {new Date().toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })} UTC
              </span>
            </div>
          </div>

          {/* Scanning Status */}
          {scanStatus && (
            <div className="absolute top-16 left-4 z-10">
              <div className="bg-indigo-900/90 backdrop-blur-sm border border-indigo-700 rounded-lg px-4 py-2">
                <span className="text-sm text-indigo-200">{scanStatus}</span>
              </div>
            </div>
          )}

          {/* Selected AOI Info */}
          {selectedAoi && (
            <div className="absolute bottom-4 left-4 z-10 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-lg p-4 max-w-sm">
              <h4 className="text-white font-medium mb-1">{selectedAoi.name}</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <div>Magnitude: <span className="text-orange-400">{selectedAoi.magnitude.toFixed(2)} (strong)</span></div>
                <div>Window: 14 days</div>
              </div>
              <button 
                onClick={() => setShowEvidence(selectedAoi.id)}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
              >
                Open full evidence →
              </button>
            </div>
          )}
        </div>

        {/* Right: Natural Language Interface */}
        <div className="w-1/2 h-full flex flex-col bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <h1 className="text-lg font-medium">Intelligence Chat</h1>
              <button
                onClick={() => setShowSavedQueries(!showSavedQueries)}
                className="text-sm text-gray-400 hover:text-white"
              >
                My Queries ({savedQueries.length})
              </button>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="text-gray-500 mb-6">
                  <p className="text-lg mb-4">Ask about market-moving changes on Earth</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">Try:</p>
                    <p className="text-gray-400">"Where did vegetation drop in Brazil soy zones this month?"</p>
                    <p className="text-gray-400">"Which ports look stressed this week?"</p>
                    <p className="text-gray-400">"Show copper mine disruptions that could impact HG futures"</p>
                  </div>
                </div>
              </div>
            )}

            {messages.map(message => (
              <div key={message.id} className={`${message.type === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block max-w-[85%] ${
                  message.type === 'user' 
                    ? 'bg-indigo-600 text-white rounded-lg px-4 py-3'
                    : 'bg-gray-800 rounded-lg'
                }`}>
                  {message.type === 'assistant' && message.signals ? (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="px-4 py-3">
                        <p className="text-gray-200 whitespace-pre-line">{message.content}</p>
                      </div>

                      {/* Signal Cards */}
                      {message.signals.map(signal => (
                        <div key={signal.id} className="border-t border-gray-700 p-4">
                          <div className="space-y-3">
                            {/* Signal Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="text-2xl">
                                  {signal.direction === 'long' ? '📈' : signal.direction === 'short' ? '📉' : '➡️'}
                                </span>
                                <div>
                                  <div className="font-medium text-white">
                                    {signal.direction === 'long' ? 'Bullish' : 'Bearish'}: {signal.instrument}
                                  </div>
                                  <div className="text-xs text-gray-400">Horizon: {signal.horizon}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-300">Impact: {signal.impact}/100</div>
                                <div className="text-sm text-gray-300">Confidence: {Math.round(signal.confidence * 100)}%</div>
                              </div>
                            </div>

                            {/* Thesis */}
                            <div className="bg-gray-900/50 rounded p-3">
                              <p className="text-sm text-gray-300 leading-relaxed">{signal.thesis}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => showSignalEvidence(signal)}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                              >
                                Show evidence
                              </button>
                              <button 
                                onClick={() => exportSignals([signal])}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                              >
                                Export CSV
                              </button>
                              <button 
                                onClick={() => copyThesis(signal.thesis)}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                              >
                                Copy thesis
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-200 px-4 py-3">{message.content}</p>
                  )}
                  
                  <div className="px-4 pb-2 text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="text-gray-400 text-sm flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                <span>Analyzing satellite data...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-800 p-4">
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Ask: Where did vegetation drop in Brazil soy zones this month?"
                disabled={isProcessing}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 pr-12"
              />
                <button
                  type="submit"
                  disabled={isProcessing || !query.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 px-1">
                We'll scan satellite embeddings (AlphaEarth), compare to history, and turn changes into trade ideas with GPT-5.
              </p>
              
              {/* Save Query Toggle */}
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-sm text-gray-400">
                  <input 
                    type="checkbox" 
                    checked={saveCurrentQuery}
                    onChange={(e) => setSaveCurrentQuery(e.target.checked)}
                    className="rounded" 
                  />
                  <span>Save this query</span>
                </label>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveQuery}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Save current conversation
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Evidence Panel (slides in from right) */}
        {showEvidence && selectedSignal && (
          <EvidencePanel
            signalId={showEvidence}
            signal={selectedSignal}
            anomaly={selectedAnomaly}
            onClose={() => {
              setShowEvidence(null);
              setSelectedSignal(null);
            }}
          />
        )}
      </div>
    </Protect>
  );
}
