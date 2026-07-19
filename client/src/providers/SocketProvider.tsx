'use client';

import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useSocketStore } from '@/store/socket.store';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const { setConnected, setRoomPresence } = useSocketStore();
  const initialized = useRef(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('orbit_token') : null;
    if (!isAuthenticated || !token) {
      disconnectSocket();
      setConnected(false);
      initialized.current = false;
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    const socket = connectSocket(token);

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // Global presence handler
    socket.on('presence:update', ({ room, users }: { room: string; users: string[] }) => {
      setRoomPresence(room, users);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('presence:update');
    };
  }, [isAuthenticated, setConnected, setRoomPresence]);

  return <>{children}</>;
}
