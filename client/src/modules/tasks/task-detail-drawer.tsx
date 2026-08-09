'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Tag, ChevronDown, Loader2,
  Bug, CheckSquare, Layers, BookOpen, User2,
  Flag, ExternalLink, MessageSquare, Activity,
} from 'lucide-react';
import { useUpdateTask } from '@/api/tasks';
import { useOrgMembers } from '@/api/organizations';
import { useUIStore } from '@/store/ui.store';
import { useSocketEvent } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import CommentThread from '@/modules/comments/comment-thread';
import ActivityFeed from '@/modules/tasks/activity-feed';
import type { Task } from '@/api/types';

interface Props {
  task: Task | null;
  onClose: () => void;
  workspaceId: string;
  statuses: string[];
  memberMap: Record<string, { name: string; avatar: string }>;
}

const PRIORITIES = [
  { value: 'NO_PRIORITY', label: 'None', color: 'text-slate-400', dot: 'bg-slate-400' },
  { value: 'LOW', label: 'Low', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-amber-400', dot: 'bg-amber-400' },
  { value: 'HIGH', label: 'High', color: 'text-orange-400', dot: 'bg-orange-400' },
  { value: 'URGENT', label: 'Urgent', color: 'text-red-400', dot: 'bg-red-400' },
] as const;

const TYPE_ICONS = {
  TASK:  { icon: CheckSquare,  color: 'text-amber-500',   label: 'Task' },
  BUG:   { icon: Bug,          color: 'text-red-500',     label: 'Bug'  },
  EPIC:  { icon: Layers,       color: 'text-purple-500',  label: 'Epic' },
  STORY: { icon: BookOpen,     color: 'text-emerald-500', label: 'Story' },
};

// ── Editable field wrapper ─────────────────────────────────────────────────

function EditableText({
  value,
  onSave,
  className = '',
  placeholder = '',
  multiline = false,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
  };

  if (editing) {
    const shared = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: handleKey,
      autoFocus: true,
      className: `w-full bg-white border border-amber-400/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 text-gray-800 ${className}`,
    };
    return multiline ? (
      <textarea {...shared} rows={4} className={`${shared.className} resize-none`} />
    ) : (
      <input {...shared} />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={`cursor-text rounded-lg px-3 py-2 hover:bg-amber-50 transition-colors text-sm ${className} ${!value ? 'text-gray-400' : ''}`}
    >
      {value || placeholder}
    </div>
  );
}

// ── Select pill ────────────────────────────────────────────────────────────

function SelectPill<T extends string>({
  value,
  options,
  onSelect,
  renderValue,
  renderOption,
}: {
  value: T;
  options: T[];
  onSelect: (v: T) => void;
  renderValue: (v: T) => React.ReactNode;
  renderOption: (v: T) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 text-sm transition-all cursor-pointer"
      >
        {renderValue(value)}
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[140px]"
            >
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { onSelect(opt); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-amber-50 transition-colors text-left cursor-pointer ${opt === value ? 'text-amber-500 font-semibold' : 'text-gray-700'}`}
                >
                  {renderOption(opt)}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Drawer ─────────────────────────────────────────────────────────────

export default function TaskDetailDrawer({ task, onClose, workspaceId, statuses, memberMap }: Props) {
  const { activeOrgId } = useUIStore();
  const updateTask = useUpdateTask();
  const { data: orgMembers = [] } = useOrgMembers(activeOrgId);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');

  // Realtime update for this specific task
  const handleTaskUpdated = useCallback(
    (updated: Task) => {
      if (!task || updated._id !== task._id) return;
      queryClient.setQueryData<Task[]>(['tasks', task.projectId], (old = []) =>
        old.map((t) => (t._id === updated._id ? updated : t)),
      );
      queryClient.setQueryData(['task', updated._id], updated);
    },
    [task, queryClient],
  );

  useSocketEvent<Task>('task:updated', handleTaskUpdated);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const update = useCallback(
    (data: Parameters<typeof updateTask.mutate>[0]['data']) => {
      if (!task) return;
      updateTask.mutate({ id: task._id, data });
    },
    [task, updateTask],
  );

  if (!task) return null;

  const typeInfo = TYPE_ICONS[task.type] || TYPE_ICONS.TASK;
  const TypeIcon = typeInfo.icon;
  const priority = PRIORITIES.find((p) => p.value === task.priority) || PRIORITIES[0];

  const assignedMembers = task.assigneeIds
    .map((id) => ({ id, ...memberMap[id] }))
    .filter((m) => m.name);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-stretch justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Drawer panel */}
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative z-10 w-full max-w-2xl bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-2xl shadow-gray-200/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className={`flex items-center gap-1.5 ${typeInfo.color}`}>
              <TypeIcon className="h-4 w-4" />
              <span className="text-xs font-bold font-mono text-gray-400">{task.slug}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {updateTask.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 flex flex-col gap-6">

              {/* Title */}
              <div>
                <EditableText
                  value={task.title}
                  onSave={(title) => update({ title })}
                  placeholder="Task title"
                  className="text-lg font-bold text-gray-900 -mx-3 -my-2"
                />
              </div>

              {/* Meta pills row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status */}
                <SelectPill
                  value={task.status}
                  options={statuses}
                  onSelect={(status) => update({ status })}
                  renderValue={(v) => (
                    <span className="text-xs font-semibold text-amber-600">{v}</span>
                  )}
                  renderOption={(v) => (
                    <span className={v === task.status ? 'text-amber-500 font-semibold' : 'text-gray-700'}>
                      {v}
                    </span>
                  )}
                />

                {/* Priority */}
                <SelectPill
                  value={task.priority}
                  options={PRIORITIES.map((p) => p.value) as typeof task.priority[]}
                  onSelect={(priority) => update({ priority })}
                  renderValue={(v) => {
                    const p = PRIORITIES.find((x) => x.value === v)!;
                    return (
                      <span className={`text-xs font-semibold flex items-center gap-1.5 ${p.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                        {p.label}
                      </span>
                    );
                  }}
                  renderOption={(v) => {
                    const p = PRIORITIES.find((x) => x.value === v)!;
                    return (
                      <span className={`flex items-center gap-1.5 ${p.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                        {p.label}
                      </span>
                    );
                  }}
                />

                {/* Type */}
                <SelectPill
                  value={task.type}
                  options={Object.keys(TYPE_ICONS) as (keyof typeof TYPE_ICONS)[]}
                  onSelect={(type) => update({ type })}
                  renderValue={(v) => {
                    const info = TYPE_ICONS[v];
                    const Icon = info.icon;
                    return <span className={`flex items-center gap-1.5 text-xs font-semibold ${info.color}`}><Icon className="h-3 w-3" />{info.label}</span>;
                  }}
                  renderOption={(v) => {
                    const info = TYPE_ICONS[v];
                    const Icon = info.icon;
                    return <span className={`flex items-center gap-1.5 ${info.color}`}><Icon className="h-3 w-3" />{info.label}</span>;
                  }}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3">
                  Description
                </label>
                <EditableText
                  value={task.description || ''}
                  onSave={(description) => update({ description })}
                  placeholder="Add a description…"
                  className="text-gray-600 min-h-[80px]"
                  multiline
                />
              </div>

              {/* Properties grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Assignees */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <User2 className="h-3 w-3" /> Assignees
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {assignedMembers.length === 0 ? (
                      <span className="text-xs text-gray-400">Unassigned</span>
                    ) : (
                      assignedMembers.map((m) => {
                        const initials = m.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??';
                        return (
                          <div key={m.id} className="flex items-center gap-1.5">
                            {m.avatar ? (
                              <img src={m.avatar} alt={m.name} className="h-5 w-5 rounded-full object-cover" />
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-[8px] font-bold text-white">
                                {initials}
                              </div>
                            )}
                             <span className="text-xs text-gray-600">{m.name}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {/* Assignee selector */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {orgMembers.map((m) => {
                      const isAssigned = task.assigneeIds.includes(m.userId);
                      const name = m.user?.name ?? m.userId;
                      const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <button
                          key={m.userId}
                          title={name}
                          onClick={() => {
                            const ids = isAssigned
                              ? task.assigneeIds.filter((id) => id !== m.userId)
                              : [...task.assigneeIds, m.userId];
                            update({ assigneeIds: ids });
                          }}
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all cursor-pointer ring-2 ${
                            isAssigned
                              ? 'ring-amber-400 bg-amber-500 text-white'
                              : 'ring-gray-200 bg-gray-100 text-gray-500 hover:ring-amber-300'
                          }`}
                        >
                          {initials}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Due Date only */}
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      <Calendar className="h-3 w-3" /> Due Date
                    </label>
                    <input
                      type="date"
                      value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                      onChange={(e) => update({ dueDate: e.target.value || null })}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Labels */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <Tag className="h-3 w-3" /> Labels
                </label>
                <div className="flex flex-wrap gap-1">
                  {task.labels?.map((lbl) => (
                    <span
                      key={lbl}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] border border-amber-200"
                    >
                      {lbl}
                      <button
                        onClick={() => update({ labels: task.labels.filter((l) => l !== lbl) })}
                        className="hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                  <LabelAdder
                    onAdd={(lbl) => update({ labels: [...(task.labels ?? []), lbl] })}
                  />
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-[10px] text-gray-400 border-t border-gray-200 pt-4">
                <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                {task.updatedBy && <span>Updated by {memberMap[task.updatedBy]?.name ?? task.updatedBy}</span>}
              </div>

              {/* ── Bottom Tabs: Comments / Activity ── */}
              <div className="border-t border-gray-200 pt-4">
                {/* Tab bar */}
                <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-0.5">
                  {[
                    { id: 'comments' as const, label: 'Comments', icon: MessageSquare },
                    { id: 'activity' as const, label: 'Activity', icon: Activity },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      id={`drawer-tab-${id}`}
                      onClick={() => setActiveTab(id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                        activeTab === id
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon size={12} />
                      {label}
                    </button>
                  ))}
                </div>

                {activeTab === 'comments' ? (
                  <CommentThread
                    taskId={task._id}
                    projectId={task.projectId}
                    workspaceId={workspaceId}
                    memberMap={memberMap}
                  />
                ) : (
                  <ActivityFeed entityId={task._id} />
                )}
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}

// ── Label adder ──────────────────────────────────────────────────────────────

function LabelAdder({ onAdd }: { onAdd: (lbl: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) { onAdd(trimmed); }
    setValue('');
    setAdding(false);
  };

  if (adding) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={submit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') { setValue(''); setAdding(false); }
        }}
        placeholder="New label"
        className="px-2 py-0.5 rounded-md bg-white border border-amber-400/60 text-gray-700 text-[10px] focus:outline-none w-24"
      />
    );
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="px-2 py-0.5 rounded-md bg-gray-50 border border-dashed border-gray-300 text-gray-400 text-[10px] hover:text-amber-500 hover:border-amber-400 transition-colors cursor-pointer"
    >
      + label
    </button>
  );
}
