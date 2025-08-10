import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Protect, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Navbar from '../components/Navbar';

export default function AnalyticsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [timeframe, setTimeframe] = useState('7d');
  const [loading, setLoading] = useState(false);

  // Mock analytics data - in production, this would come from your backend
  const analyticsData = {
    performance: {
      totalSignals: 1247,
      successRate: 72.3,
      avgReturn: 3.7,
      sharpeRatio: 1.89,
    },
    byRegion: [
      { region: 'North America', signals: 423, success: 74.2 },
      { region: 'Asia Pacific', signals: 389, success: 71.5 },
      { region: 'Europe', signals: 267, success: 73.8 },
      { region: 'Latin America', signals: 168, success: 69.1 },
    ],
    bySector: [
      { sector: 'Energy', signals: 512, avgConfidence: 0.78, returns: 4.2 },
      { sector: 'Agriculture', signals: 389, avgConfidence: 0.73, returns: 3.1 },
      { sector: 'Mining', signals: 346, avgConfidence: 0.81, returns: 3.9 },
    ],
    recentActivity: [
      { date: '2025-01-10', signals: 47, success: 34 },
      { date: '2025-01-09', signals: 52, success: 38 },
      { date: '2025-01-08', signals: 41, success: 29 },
      { date: '2025-01-07', signals: 45, success: 33 },
      { date: '2025-01-06', signals: 39, success: 28 },
      { date: '2025-01-05', signals: 43, success: 31 },
      { date: '2025-01-04', signals: 48, success: 35 },
    ],
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
                  Analytics Dashboard
                </h1>
                <p className="mt-1 text-gray-400">
                  Performance metrics and insights from your trading signals
                </p>
              </div>
              
              {/* Timeframe Selector */}
              <div className="flex items-center space-x-2 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-1">
                {['24h', '7d', '30d', '90d'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      timeframe === tf
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Key Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Total Signals</span>
                <span className="text-indigo-400 text-xs bg-indigo-400/10 px-2 py-1 rounded-full">{timeframe}</span>
              </div>
              <div className="text-3xl font-bold text-white">{analyticsData.performance.totalSignals}</div>
              <div className="text-xs text-green-400 mt-2">+12.3% vs prev period</div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Success Rate</span>
              </div>
              <div className="text-3xl font-bold text-white">{analyticsData.performance.successRate}%</div>
              <div className="text-xs text-green-400 mt-2">+2.1% improvement</div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Avg Return</span>
              </div>
              <div className="text-3xl font-bold text-white">{analyticsData.performance.avgReturn}%</div>
              <div className="text-xs text-gray-500 mt-2">Per position</div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Sharpe Ratio</span>
              </div>
              <div className="text-3xl font-bold text-white">{analyticsData.performance.sharpeRatio}</div>
              <div className="text-xs text-gray-500 mt-2">Risk-adjusted returns</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Activity Chart */}
            <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4">Signal Activity</h3>
              <div className="space-y-3">
                {analyticsData.recentActivity.map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{day.date}</span>
                    <div className="flex-1 mx-4">
                      <div className="h-6 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full flex">
                          <div 
                            className="bg-green-500/80 transition-all"
                            style={{ width: `${(day.success / day.signals) * 100}%` }}
                          />
                          <div 
                            className="bg-red-500/50"
                            style={{ width: `${((day.signals - day.success) / day.signals) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-300">{day.signals} signals</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Regional Performance */}
            <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4">Regional Performance</h3>
              <div className="space-y-4">
                {analyticsData.byRegion.map((region, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">{region.region}</span>
                      <span className="text-sm text-gray-400">{region.success}% success</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                        style={{ width: `${region.success}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{region.signals} signals</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sector Analysis */}
          <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-medium text-white mb-4">Sector Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Sector</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Signals</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Avg Confidence</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Returns</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.bySector.map((sector, idx) => (
                    <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            sector.sector === 'Energy' ? 'bg-yellow-500' :
                            sector.sector === 'Agriculture' ? 'bg-green-500' :
                            'bg-blue-500'
                          }`} />
                          <span className="text-sm text-white">{sector.sector}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-sm text-gray-300">{sector.signals}</td>
                      <td className="text-right py-3 px-4">
                        <span className="text-sm text-gray-300">{(sector.avgConfidence * 100).toFixed(0)}%</span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`text-sm ${sector.returns > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {sector.returns > 0 ? '+' : ''}{sector.returns}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <div className="flex justify-end">
                          <div className="w-24 h-6 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                              style={{ width: `${Math.min(100, sector.avgConfidence * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 backdrop-blur-sm border border-indigo-800/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Export Analytics</h3>
                <p className="text-sm text-gray-400">Download detailed reports and raw data for further analysis</p>
              </div>
              <div className="flex items-center space-x-3">
                <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">PDF Report</span>
                </button>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">CSV Export</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </Protect>
    </div>
  );
}
