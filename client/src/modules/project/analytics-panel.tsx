'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, TrendingUp, CheckCircle2, ListTodo, BarChart2 } from 'lucide-react';
import { fetchProjectAnalytics } from '@/api/analytics';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ResponsiveContainer,
} from 'recharts';

/* ─── Color palettes ────────────────────────────────────────────── */
const STATUS_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#64748b',
];
const PRIORITY_COLORS: Record<string, string> = {
  URGENT:      '#ef4444',
  HIGH:        '#f97316',
  MEDIUM:      '#f59e0b',
  LOW:         '#10b981',
  NO_PRIORITY: '#64748b',
};

/* ─── Stat card ─────────────────────────────────────────────────── */
function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-4 shadow-sm">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900">{value}</p>
        <p className="text-gray-500 text-xs mt-0.5">{label}</p>
        <p className="text-gray-400 text-[10px] mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

/* ─── Chart card wrapper ────────────────────────────────────────── */
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-gray-800 text-sm font-semibold mb-4">{title}</p>
      {children}
    </div>
  );
}

/* ─── Fill last-14-days gaps with zeros ─────────────────────────── */
function fillTimeline(data: { date: string; count: number }[]) {
  const map: Record<string, number> = {};
  for (const d of data) map[d.date] = d.count;
  const result = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key.slice(5), count: map[key] ?? 0 });
  }
  return result;
}

/* ─── Main component ────────────────────────────────────────────── */
interface Props {
  projectId: string;
  memberMap: Record<string, { name: string }>;
}

export default function AnalyticsPanel({ projectId, memberMap }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', projectId],
    queryFn:  () => fetchProjectAnalytics(projectId),
    staleTime: 60_000,
  });

  const timeline = useMemo(() => fillTimeline(data?.completionTimeline ?? []), [data]);

  const completionRate = data
    ? data.total > 0 ? Math.round((data.completedCount / data.total) * 100) : 0
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-500 text-sm">
        Failed to load analytics
      </div>
    );
  }

  const statusConfig: ChartConfig = Object.fromEntries(
    data.byStatus.map((s, i) => [s.status, { label: s.status, color: STATUS_COLORS[i % STATUS_COLORS.length] }])
  );
  const priorityConfig: ChartConfig = Object.fromEntries(
    data.byPriority.map((p) => [p.priority, { label: p.priority, color: PRIORITY_COLORS[p.priority] ?? '#64748b' }])
  );
  const timelineConfig: ChartConfig = {
    count: { label: 'Completed', color: '#6366f1' },
  };
  const assigneeConfig: ChartConfig = Object.fromEntries(
    data.byAssignee.map((a, i) => [
      a.assigneeId,
      { label: memberMap[a.assigneeId]?.name ?? a.assigneeId.slice(0, 8), color: STATUS_COLORS[i % STATUS_COLORS.length] },
    ])
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── Stat row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks"      value={data.total}          sub="across all statuses"          icon={ListTodo}    color="bg-amber-500" />
        <StatCard label="Completed"        value={data.completedCount} sub="tasks with completedAt set"   icon={CheckCircle2} color="bg-emerald-500" />
        <StatCard label="Completion Rate"  value={`${completionRate}%`} sub="of all tasks finished"       icon={TrendingUp}  color="bg-amber-600" />
        <StatCard label="Statuses in use"  value={data.byStatus.length} sub="active workflow stages"     icon={BarChart2}   color="bg-cyan-500" />
      </div>

      {/* ── Charts 2×2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Tasks by Status — Pie */}
        <ChartCard title="Tasks by Status">
          {data.byStatus.length === 0 ? (
            <p className="text-center text-slate-600 text-sm py-8">No data yet</p>
          ) : (
            <ChartContainer config={statusConfig} className="h-52">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                <Pie
                  data={data.byStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {data.byStatus.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="status" />} />
              </PieChart>
            </ChartContainer>
          )}
        </ChartCard>

        {/* Tasks by Priority — Bar */}
        <ChartCard title="Tasks by Priority">
          {data.byPriority.length === 0 ? (
            <p className="text-center text-slate-600 text-sm py-8">No data yet</p>
          ) : (
            <ChartContainer config={priorityConfig} className="h-52">
              <BarChart data={data.byPriority} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="priority" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.byPriority.map((p, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[p.priority] ?? '#9ca3af'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>

        {/* Completion timeline — Area */}
        <ChartCard title="Completions — last 14 days">
          <ChartContainer config={timelineConfig} className="h-52">
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#areaGrad)"
                dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#d97706' }}
              />
            </AreaChart>
          </ChartContainer>
        </ChartCard>

        {/* Tasks by Assignee — Bar */}
        <ChartCard title="Tasks by Assignee">
          {data.byAssignee.length === 0 ? (
            <p className="text-center text-slate-600 text-sm py-8">No assignees yet</p>
          ) : (
            <ChartContainer config={assigneeConfig} className="h-52">
              <BarChart
                data={data.byAssignee.map((a) => ({
                  ...a,
                  name: memberMap[a.assigneeId]?.name ?? a.assigneeId.slice(0, 8),
                }))}
                barSize={22}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.byAssignee.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>
      </div>
    </motion.div>
  );
}
