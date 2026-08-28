'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { useSocketStore } from '@/store/socket.store';

const EMPTY_PRESENCE: string[] = [];

/**
 * Join a socket room for presence tracking.
 * Automatically leaves the room on unmount / projectId change.
 */
export function usePresence(projectId: string | null, userId: string | null) {
  const { setRoomPresence } = useSocketStore();
  const prevRoom = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId || !userId) return;
    const socket = getSocket();
    const room = `project:${projectId}`;

    // Leave previous room first
    if (prevRoom.current && prevRoom.current !== room) {
      socket.emit('room:leave', { room: prevRoom.current, userId });
    }
    prevRoom.current = room;

    socket.emit('room:join', { room, userId });

    return () => {
      socket.emit('room:leave', { room, userId });
      setRoomPresence(room, []);
    };
  }, [projectId, userId, setRoomPresence]);

  const room = projectId ? `project:${projectId}` : null;
  const onlineUsers = useSocketStore((s) => (room && s.roomPresence[room] ? s.roomPresence[room] : EMPTY_PRESENCE));
  return onlineUsers;
}
