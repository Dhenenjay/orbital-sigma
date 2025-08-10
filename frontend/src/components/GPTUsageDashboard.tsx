/**
 * GPT Usage Dashboard Component
 * Displays token usage, costs, and analytics
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../backend/convex/_generated/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle, TrendingUp, DollarSign, Activity } from 'lucide-react';

interface UsageStats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_tokens: number;
  total_cost: number;
  average_tokens_per_call: number;
  average_cost_per_call: number;
  average_response_time_ms: number;
  by_model: Record<string, any>;
  by_endpoint: Record<string, any>;
  cache_hit_rate: number;
}

export const GPTUsageDashboard: React.FC = () => {
  const [userId, setUserId] = useState('system'); // TODO: Get from auth context
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [alertLimits, setAlertLimits] = useState({
    daily: '',
    monthly: '',
  });

  // Fetch usage statistics
  const usageStats = useQuery(api.tokenUsage.getUserUsageStats, { 
    userId, 
    timeframe 
  });

  // Fetch daily summaries
  const dailySummaries = useQuery(api.tokenUsage.getDailyUsageSummaries, {
    userId,
    days: timeframe === 'today' ? 1 : timeframe === 'week' ? 7 : 30,
  });

  // Fetch cost breakdown
  const costBreakdown = useQuery(api.tokenUsage.getCostBreakdown, {
    userId,
    groupBy: 'endpoint',
  });

  // Fetch recent usage history
  const usageHistory = useQuery(api.tokenUsage.getUsageHistory, {
    userId,
    limit: 10,
  });

  // Format currency
  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(cost);
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Prepare chart data
  const modelChartData = usageStats?.by_model
    ? Object.entries(usageStats.by_model).map(([model, data]) => ({
        name: model,
        calls: data.calls,
        tokens: data.total_tokens,
        cost: data.total_cost,
      }))
    : [];

  const endpointChartData = usageStats?.by_endpoint
    ? Object.entries(usageStats.by_endpoint).map(([endpoint, data]) => ({
        name: endpoint,
        calls: data.calls,
        cost: data.total_cost,
        avgTime: data.average_response_time,
      }))
    : [];

  const dailyChartData = dailySummaries?.summaries || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GPT Usage Dashboard</h1>
          <p className="text-gray-600">Monitor API usage, costs, and performance</p>
        </div>
        
        <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(usageStats?.total_cost || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCost(usageStats?.average_cost_per_call || 0)} per call
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(usageStats?.total_tokens || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(usageStats?.average_tokens_per_call || 0)} per call
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(usageStats?.total_calls || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {usageStats?.failed_calls || 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageStats?.average_response_time_ms || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              {usageStats?.cache_hit_rate?.toFixed(1) || 0}% cache hits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Cost Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Cost Trend</CardTitle>
            <CardDescription>Cost per day over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} />
                <Tooltip formatter={(value: any) => formatCost(value)} />
                <Legend />
                <Line type="monotone" dataKey="total_cost" stroke="#8884d8" name="Cost" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost by Endpoint */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Endpoint</CardTitle>
            <CardDescription>Which functions use the most tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={endpointChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${formatCost(entry.cost)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="cost"
                >
                  {endpointChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCost(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Model Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Model Usage</CardTitle>
            <CardDescription>Calls and costs by model</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={modelChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip formatter={(value: any, name: string) => 
                  name === 'Cost' ? formatCost(value) : formatNumber(value)
                } />
                <Legend />
                <Bar yAxisId="left" dataKey="calls" fill="#8884d8" name="Calls" />
                <Bar yAxisId="right" dataKey="cost" fill="#82ca9d" name="Cost" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Response Times */}
        <Card>
          <CardHeader>
            <CardTitle>Response Times</CardTitle>
            <CardDescription>Average response time by endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={endpointChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `${value}ms`} />
                <Tooltip formatter={(value: any) => `${value}ms`} />
                <Legend />
                <Bar dataKey="avgTime" fill="#8884d8" name="Avg Response Time" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Usage History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent API Calls</CardTitle>
          <CardDescription>Detailed history of recent GPT API usage</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageHistory?.records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-sm">
                    {new Date(record.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{record.endpoint}</TableCell>
                  <TableCell className="text-sm">{record.model}</TableCell>
                  <TableCell className="text-sm">{formatNumber(record.tokens.total)}</TableCell>
                  <TableCell className="font-medium">{formatCost(record.cost.total)}</TableCell>
                  <TableCell className="text-sm">{record.metadata.response_time_ms}ms</TableCell>
                  <TableCell>
                    {record.error ? (
                      <span className="text-red-500 text-sm">Failed</span>
                    ) : record.metadata.cache_hit ? (
                      <span className="text-green-500 text-sm">Cached</span>
                    ) : (
                      <span className="text-green-500 text-sm">Success</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cost Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Alerts</CardTitle>
          <CardDescription>Set spending limits to control API costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="daily-limit">Daily Limit ($)</Label>
              <Input
                id="daily-limit"
                type="number"
                placeholder="10.00"
                value={alertLimits.daily}
                onChange={(e) => setAlertLimits({ ...alertLimits, daily: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="monthly-limit">Monthly Limit ($)</Label>
              <Input
                id="monthly-limit"
                type="number"
                placeholder="100.00"
                value={alertLimits.monthly}
                onChange={(e) => setAlertLimits({ ...alertLimits, monthly: e.target.value })}
              />
            </div>
          </div>
          <Button className="mt-4" variant="outline">
            <AlertCircle className="mr-2 h-4 w-4" />
            Update Alert Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
