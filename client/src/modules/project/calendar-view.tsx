'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Circle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/api-client';
import type { Task } from '@/api/types';

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const PRIORITY_DOT: Record<string, string> = {
  URGENT: 'bg-red-400',  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-amber-400', LOW: 'bg-emerald-400', NO_PRIORITY: 'bg-slate-500',
};

interface Props {
  projectId: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarView({ projectId }: Props) {
  const today   = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    queryFn:  () => api.get<Task[]>(`/tasks?projectId=${projectId}`),
    enabled:  !!projectId,
  });

  // Index tasks by due date day
  const tasksByDay = useMemo(() => {
    const map: Record<number, Task[]> = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const d = new Date(t.dueDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(t);
      }
    });
    return map;
  }, [tasks, year, month]);

  const daysInMonth  = getDaysInMonth(year, month);
  const firstWeekday = getFirstDayOfMonth(year, month);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const selectedTasks = selectedDay ? (tasksByDay[selectedDay] ?? []) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">{MONTHS[month]} {year}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prev} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); setSelectedDay(null); }}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Today
          </button>
          <button onClick={next} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-slate-500 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for first week offset */}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day      = i + 1;
          const dayTasks = tasksByDay[day] ?? [];
          const isToday  =
            day === today.getDate() &&
            month === today.getMonth() &&
            year  === today.getFullYear();
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              id={`cal-day-${day}`}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`relative min-h-[72px] p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                isSelected
                  ? 'border-indigo-500/50 bg-indigo-500/10'
                  : dayTasks.length > 0
                  ? 'border-slate-700/60 bg-slate-900/60 hover:border-slate-600'
                  : 'border-slate-800/40 bg-slate-900/20 hover:border-slate-700/40'
              }`}
            >
              {/* Day number */}
              <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${
                isToday
                  ? 'bg-indigo-500 text-white'
                  : isSelected
                  ? 'text-indigo-300'
                  : 'text-slate-400'
              }`}>
                {day}
              </span>

              {/* Task pills */}
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayTasks.slice(0, 2).map((t) => (
                  <div key={t._id} className="flex items-center gap-1 overflow-hidden">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] ?? 'bg-slate-500'}`} />
                    <span className="text-[9px] text-slate-400 truncate leading-tight">{t.title}</span>
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <span className="text-[9px] text-indigo-400 font-semibold">+{dayTasks.length - 2} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-5"
        >
          <p className="text-sm font-semibold text-slate-300 mb-3">
            {MONTHS[month]} {selectedDay} — {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} due
          </p>

          {selectedTasks.length === 0 ? (
            <p className="text-slate-600 text-sm">No tasks due this day.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedTasks.map((t) => (
                <div key={t._id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900">
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] ?? 'bg-slate-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500 font-mono">{t.slug}</span>
                      <span className="text-[10px] text-slate-600">·</span>
                      <span className="text-[10px] text-slate-500">{t.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
