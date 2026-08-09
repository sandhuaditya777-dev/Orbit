'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, X, Loader2 } from 'lucide-react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import type { Notification } from '@/api/notifications';

const TYPE_ICONS: Record<string, string> = {
  TASK_ASSIGNED: '🎯',
  COMMENT_ADDED: '💬',
  MENTION:       '@',
  STATUS_CHANGED:'🔄',
  DUE_DATE:      '📅',
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

interface NotifRowProps {
  notif: Notification;
  onRead: (id: string) => void;
}

function NotifRow({ notif, onRead }: NotifRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`group flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-amber-50/50 transition-colors cursor-pointer ${
        notif.isRead ? 'opacity-60' : ''
      }`}
      onClick={() => !notif.isRead && onRead(notif._id)}
    >
      {/* Icon bubble */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-sm mt-0.5">
        {TYPE_ICONS[notif.type] ?? '🔔'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-gray-800 text-xs font-medium leading-snug">{notif.title}</p>
        <p className="text-gray-500 text-[11px] leading-snug truncate mt-0.5">{notif.body}</p>
        <p className="text-gray-400 text-[10px] mt-1">{timeAgo(notif.createdAt)}</p>
      </div>

      {!notif.isRead && (
        <div className="flex-shrink-0 mt-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
        </div>
      )}
    </motion.div>
  );
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useRealtimeNotifications();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        id="notifications-bell-btn"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-[480px] flex flex-col bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-gray-900 text-sm font-semibold">Notifications</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck size={12} />
                    All read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="text-amber-500 animate-spin" />
              </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                  <Bell size={28} className="opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((n) => (
                    <NotifRow key={n._id} notif={n} onRead={markRead} />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0">
                <p className="text-[10px] text-gray-400 text-center">
                  Showing last {notifications.length} notifications
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
