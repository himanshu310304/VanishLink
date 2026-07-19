// src/components/analytics/ClickChart.jsx
import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Card } from '../ui/Card';

export const ClickChart = ({ data = [], loading }) => {
  // Normalize API data → recharts data
  const chartData = (data || []).map((point) => ({
    date: point.date ? point.date.slice(5) : '',
    clicks: typeof point.clicks === 'number' ? point.clicks : 0,
  }));

  const hasData = chartData.length > 0;

  return (
    <Card className="h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Click Activity
        </h3>
        <span className="text-xs text-slate-500">Last 7 days</span>
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-600 dark:text-slate-400 text-sm">
            Loading chart data...
          </div>
        ) : !hasData ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />

              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tickLine={false}
                tickMargin={8}
                fontSize={10}
              />
              <YAxis
                stroke="#6b7280"
                tickLine={false}
                tickMargin={8}
                fontSize={10}
                allowDecimals={false}
                domain={[0, (dataMax) => Math.max(dataMax, 5)]}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  border: '1px solid #1f2937',
                  fontSize: 12,
                }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value) => [`${value} clicks`, '']}
              />

              <ReferenceLine y={0} stroke="#1f2937" />

              {/* teammate’s bars + your data */}
              <Bar
                dataKey="clicks"
                barSize={14}
                radius={[4, 4, 0, 0]}
                fill="#16a34a"
                opacity={0.35}
              />

              {/* your area line + improved dots */}
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#22c55e"
                fill="url(#clicksGradient)"
                strokeWidth={2.4}
                dot={{ r: 3, fill: '#22c55e', stroke: '#0f172a', strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};
