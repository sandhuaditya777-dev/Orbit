'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { fetchActivityForEntity, type ActivityEntry } from '@/api/activity';

const ACTION_COLORS: Record<string, string> = {
  CREATED:        'bg-emerald-500',
  UPDATED:        'bg-amber-500',
  STATUS_CHANGED: 'bg-amber-500',
  DELETED:        'bg-red-500',
  COMMENTED:      'bg-amber-500',
  ASSIGNED:       'bg-amber-500',
  UNASSIGNED:     'bg-gray-400',
};

const ACTION_LABELS: Record<string, string> = {
  CREATED:        'created',
  UPDATED:        'updated',
  STATUS_CHANGED: 'changed status',
  DELETED:        'deleted',
  COMMENTED:      'commented',
  ASSIGNED:       'assigned',
  UNASSIGNED:     'unassigned',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  entityId: string;
  className?: string;
  memberMap?: Record<string, { name: string; avatar: string }>;
}

export default function ActivityFeed({ entityId, className = '', memberMap }: Props) {
  const { data: initial, isLoading } = useQuery({
    queryKey: ['activity', entityId],
    queryFn: () => fetchActivityForEntity(entityId, 50),
    staleTime: 30_000,
  });

  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    if (initial) {
      setEntries(initial);
    }
  }, [initial]);

  // Listen for realtime activity events on the project room
  useEffect(() => {
    const socket = getSocket();
    const handler = (entry: ActivityEntry) => {
      if (entry.entityId === entityId) {
        setEntries((prev) => [entry, ...prev]);
      }
    };
    socket.on('activity:created', handler);
    return () => { socket.off('activity:created', handler); };
  }, [entityId]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className={`py-8 text-center text-gray-400 text-sm ${className}`}>
        No activity yet
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

      <div className="space-y-4 pl-10">
        {entries.map((entry) => {
          const dot = ACTION_COLORS[entry.action] ?? 'bg-gray-400';
          const label = ACTION_LABELS[entry.action] ?? entry.action.toLowerCase();
          const actorDisplayName =
            entry.actorName && entry.actorName !== 'Someone'
              ? entry.actorName
              : memberMap?.[entry.actorId]?.name || entry.actorName || 'Team member';

          return (
            <div key={entry._id} className="relative group text-left">
              {/* Timeline dot */}
              <div
                className={`absolute -left-[26px] top-1 w-2.5 h-2.5 rounded-full ${dot} ring-2 ring-white group-hover:scale-125 transition-transform`}
              />

              <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-gray-800 text-xs">{actorDisplayName}</span>
                  <span className="text-gray-500 text-xs">{label}</span>
                  {entry.action === 'STATUS_CHANGED' && entry.metadata && (
                    <>
                      <span className="text-gray-400 text-xs">from</span>
                      <code className="px-1 py-0.5 bg-gray-200 rounded text-[10px] text-gray-700">
                        {String(entry.metadata.from)}
                      </code>
                      <span className="text-gray-400 text-xs">to</span>
                      <code className="px-1 py-0.5 bg-amber-100 rounded text-[10px] text-amber-800 font-semibold">
                        {String(entry.metadata.to)}
                      </code>
                    </>
                  )}
                </div>
                <p className="text-gray-400 text-[10px] mt-0.5">{timeAgo(entry.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
