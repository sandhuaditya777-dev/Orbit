'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, Download, FileJson, FileText } from 'lucide-react';
import { api } from '@/api/api-client';

/* ─── Filter state shape ────────────────────────────────────────── */
export interface KanbanFilters {
  priority:   string;   // '' = all
  type:       string;
  assigneeId: string;
  label:      string;
}

export const EMPTY_FILTERS: KanbanFilters = {
  priority: '', type: '', assigneeId: '', label: '',
};

const PRIORITIES = ['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const PRIORITY_LABELS: Record<string, string> = {
  NO_PRIORITY: 'No priority', LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent',
};
const TYPES = ['TASK', 'BUG', 'EPIC', 'STORY'] as const;

/* ─── Mini select ───────────────────────────────────────────────── */
function FilterSelect({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const active = value !== '';
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pl-2.5 pr-6 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all outline-none ${
          active
            ? 'bg-amber-50 border-amber-300 text-amber-700'
            : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-600'
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
    </div>
  );
}

/* ─── Export dropdown ───────────────────────────────────────────── */
function ExportMenu({
  projectId, token,
}: {
  projectId: string;
  token: string | null;
}) {
  const [open, setOpen] = useState(false);

  const download = (format: 'csv' | 'json') => {
    setOpen(false);
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const url = `${base}/tasks/export?projectId=${projectId}&format=${format}`;
    const a = document.createElement('a');
    a.href = url;
    // Pass auth token via query won't work with JWT guard — use fetch + blob instead
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        a.download = `tasks-${projectId}.${format}`;
        a.click();
        URL.revokeObjectURL(objUrl);
      })
      .catch(() => {});
  };

  return (
    <div className="relative">
      <button
        id="export-tasks-btn"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-amber-600 hover:border-amber-300 text-xs font-medium transition-all cursor-pointer"
      >
        <Download size={13} /> Export
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-full mt-1.5 z-20 w-36 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
            >
              <button
                onClick={() => download('csv')}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-700 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <FileText size={13} className="text-emerald-500" /> Download CSV
              </button>
              <button
                onClick={() => download('json')}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-700 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <FileJson size={13} className="text-amber-500" /> Download JSON
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main filter bar ───────────────────────────────────────────── */
interface Props {
  filters: KanbanFilters;
  onChange: (f: KanbanFilters) => void;
  memberMap: Record<string, { name: string; avatar: string }>;
  allLabels: string[];
  projectId: string;
  token: string | null;
  totalTasks: number;
  filteredTasks: number;
}

export default function KanbanFilterBar({
  filters, onChange, memberMap, allLabels, projectId, token, totalTasks, filteredTasks,
}: Props) {
  const activeCount = Object.values(filters).filter(Boolean).length;

  const update = (key: keyof KanbanFilters) => (v: string) =>
    onChange({ ...filters, [key]: v });

  const clearAll = () => onChange(EMPTY_FILTERS);

  const members = Object.entries(memberMap).map(([id, m]) => ({ value: id, label: m.name }));
  const labels  = allLabels.map((l) => ({ value: l, label: l }));

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 flex-wrap"
    >
      {/* Filter icon + count */}
      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium mr-0.5">
        <Filter size={13} />
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold">
            {activeCount}
          </span>
        )}
      </div>

      {/* Selects */}
      <FilterSelect
        label="Priority"
        value={filters.priority}
        options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
        onChange={update('priority')}
      />
      <FilterSelect
        label="Type"
        value={filters.type}
        options={TYPES.map((t) => ({ value: t, label: t[0] + t.slice(1).toLowerCase() }))}
        onChange={update('type')}
      />
      {members.length > 0 && (
        <FilterSelect
          label="Assignee"
          value={filters.assigneeId}
          options={members}
          onChange={update('assigneeId')}
        />
      )}
      {labels.length > 0 && (
        <FilterSelect
          label="Label"
          value={filters.label}
          options={labels}
          onChange={update('label')}
        />
      )}

      {/* Clear */}
      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer border border-transparent hover:border-red-200"
        >
          <X size={11} /> Clear
        </button>
      )}

      {/* Result count */}
      {activeCount > 0 && (
        <span className="text-[11px] text-gray-500">
          {filteredTasks} / {totalTasks} tasks
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export */}
      <ExportMenu projectId={projectId} token={token} />
    </motion.div>
  );
}
