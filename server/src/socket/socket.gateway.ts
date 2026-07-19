import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  // userId → Set of socketIds (one user can have multiple tabs)
  private readonly userSockets = new Map<string, Set<string>>();

  // roomId → Set of userIds currently present
  private readonly roomPresence = new Map<string, Set<string>>();

  afterInit() {
    this.logger.log('Socket.IO Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const userId = client.data?.userId as string | undefined;
    if (userId) {
      // Remove socket from user tracking
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);
      }

      // Remove from all rooms they were in and notify
      for (const [room, users] of this.roomPresence.entries()) {
        if (users.has(userId)) {
          const allSockets = this.userSockets.get(userId);
          if (!allSockets || allSockets.size === 0) {
            users.delete(userId);
            this.server.to(room).emit('presence:update', {
              room,
              users: Array.from(users),
            });
          }
        }
      }
    }
  }

  // ── Room Management ──────────────────────────────────────────

  @SubscribeMessage('room:join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; userId: string },
  ) {
    const { room, userId } = data;
    client.join(room);
    client.data.userId = userId;

    // Track sockets per user
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    // Track presence per room
    if (!this.roomPresence.has(room)) {
      this.roomPresence.set(room, new Set());
    }
    this.roomPresence.get(room)!.add(userId);

    // Broadcast updated presence to room
    const users = Array.from(this.roomPresence.get(room)!);
    this.server.to(room).emit('presence:update', { room, users });

    this.logger.log(`User ${userId} joined room ${room}`);
  }

  @SubscribeMessage('room:leave')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; userId: string },
  ) {
    const { room, userId } = data;
    client.leave(room);

    const presence = this.roomPresence.get(room);
    if (presence) {
      // Only remove from presence if user has no other sockets in room
      const userSockets = this.userSockets.get(userId);
      const socketsInRoom = this.server?.sockets?.adapter?.rooms?.get(room);
      const stillInRoom = userSockets && socketsInRoom
        ? [...userSockets].some((sid) => socketsInRoom.has(sid))
        : false;

      if (!stillInRoom) {
        presence.delete(userId);
        this.server.to(room).emit('presence:update', {
          room,
          users: Array.from(presence),
        });
      }
    }
  }

  // ── Typing Indicators ────────────────────────────────────────

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @MessageBody() data: { room: string; userId: string; userName: string },
  ) {
    this.server.to(data.room).emit('typing:start', data);
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @MessageBody() data: { room: string; userId: string },
  ) {
    this.server.to(data.room).emit('typing:stop', data);
  }

  // ── Broadcast Helpers (called from services) ─────────────────

  broadcastToRoom(room: string, event: string, data: unknown) {
    this.server.to(room).emit(event, data);
  }

  broadcastToProject(projectId: string, event: string, data: unknown) {
    this.broadcastToRoom(`project:${projectId}`, event, data);
  }

  broadcastToTask(taskId: string, event: string, data: unknown) {
    this.broadcastToRoom(`task:${taskId}`, event, data);
  }
}
