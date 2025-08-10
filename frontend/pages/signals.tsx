import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Protect } from '@clerk/nextjs';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import SignalsDisplay from '../components/SignalsDisplay';

interface Signal {
  id: string;
  instrument: string;
  direction: "long" | "short" | "neutral";
  confidence: number;
  rationale: string;
  timestamp: string;
  aoiId?: string;
  aoiName?: string;
  sector?: string;
}

export default function SignalsPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    sector: '',
    direction: '',
    minConfidence: 0.5
  });

  useEffect(() => {
    fetchSignals();
  }, [filter]);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.sector) params.set('sector', filter.sector);
      if (filter.direction) params.set('direction', filter.direction);
      params.set('minConfidence', filter.minConfidence.toString());
      
      const res = await fetch(`/api/signals?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSignals(data);
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Navbar />
      
      <Protect>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-light text-white tracking-tight">
                  Trading Signals
                </h1>
                <p className="mt-1 text-gray-400">
                  Real-time AI-generated trading signals from satellite intelligence
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-green-400 text-xs font-medium">Live</span>
                </div>
                
                <button 
                  onClick={() => fetchSignals()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm font-medium">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-medium text-white mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Sector</label>
                <select 
                  value={filter.sector}
                  onChange={(e) => setFilter({...filter, sector: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Sectors</option>
                  <option value="energy">Energy</option>
                  <option value="agriculture">Agriculture</option>
                  <option value="mining">Mining</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Direction</label>
                <select 
                  value={filter.direction}
                  onChange={(e) => setFilter({...filter, direction: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Directions</option>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Min Confidence</label>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filter.minConfidence}
                  onChange={(e) => setFilter({...filter, minConfidence: parseFloat(e.target.value)})}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">{(filter.minConfidence * 100).toFixed(0)}%</div>
              </div>
              
              <div className="flex items-end">
                <button 
                  onClick={() => setFilter({ sector: '', direction: '', minConfidence: 0.5 })}
                  className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Total Signals</span>
                <span className="text-indigo-400 text-xs bg-indigo-400/10 px-2 py-1 rounded-full">24h</span>
              </div>
              <div className="text-2xl font-bold text-white">{signals.length}</div>
              <div className="text-xs text-gray-500 mt-1">Active positions</div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Avg Confidence</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {signals.length > 0 
                  ? `${(signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length * 100).toFixed(0)}%`
                  : '—'
                }
              </div>
              <div className="text-xs text-gray-500 mt-1">Across all signals</div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Long/Short Ratio</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {signals.filter(s => s.direction === 'long').length} / {signals.filter(s => s.direction === 'short').length}
              </div>
              <div className="text-xs text-gray-500 mt-1">Market sentiment</div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">High Confidence</span>
                <span className="text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded-full">&gt;80%</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {signals.filter(s => s.confidence > 0.8).length}
              </div>
              <div className="text-xs text-gray-500 mt-1">Strong signals</div>
            </div>
          </div>

          {/* Signals Display Component */}
          <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl">
            <SignalsDisplay 
              limit={20}
              minConfidence={filter.minConfidence}
              showFilters={false}
              refreshTrigger={filter}
            />
          </div>

          {/* Empty State */}
          {!loading && signals.length === 0 && (
            <div className="text-center py-16">
              <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-xl font-medium text-gray-400 mb-2">No signals found</h3>
              <p className="text-gray-500">Try adjusting your filters or check back later for new signals.</p>
            </div>
          )}
        </main>
      </Protect>
    </div>
  );
}
