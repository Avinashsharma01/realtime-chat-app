// ============================================================================
// Socket.IO — Real-Time Communication Layer
// ============================================================================
// Supports BOTH 1-on-1 and group chats.
//
// EVENTS:
//   Server → Client:
//     'user:online'     — A user came online
//     'user:offline'    — A user went offline
//     'users:online'    — List of all online users (sent on connect)
//     'message:receive' — A new message arrived
//     'message:error'   — Message sending failed
//     'typing:start'    — Someone started typing
//     'typing:stop'     — Someone stopped typing
//     'group:updated'   — Group metadata changed (member added/removed/renamed)
//
//   Client → Server:
//     'message:send'    — Send a new message (1-on-1 or group)
//     'typing:start'    — Notify typing started
//     'typing:stop'     — Notify typing stopped
//     'group:join'      — Join a Socket.IO room for a group chat
// ============================================================================

import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserPayload, SocketMessageData, TypingData } from '../types';
import { MessageService } from '../services/message.service';
import { prisma } from '../config/db';

// ── Online User Tracking ────────────────────────────────────────────────────
// Map userId → Set of socketIds (supports multiple tabs/devices per user)
const onlineUsers = new Map<string, Set<string>>();

/**
 * Initializes Socket.IO on the HTTP server.
 */
export const initializeSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
    },
  });

  // ── Authentication Middleware ───────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection Handler ──────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const user: UserPayload = socket.data.user;
    console.log(`✅ Socket connected: ${user.username} (${user.id})`);

    // Track this user as online (add this socket to their set)
    if (!onlineUsers.has(user.id)) {
      onlineUsers.set(user.id, new Set());
    }
    onlineUsers.get(user.id)!.add(socket.id);

    // Auto-join all group rooms the user belongs to
    const userChats = await prisma.chat.findMany({
      where: {
        isGroup: true,
        participants: { some: { userId: user.id } },
      },
      select: { id: true },
    });
    for (const chat of userChats) {
      socket.join(`group:${chat.id}`);
    }

    // Tell EVERYONE that this user is now online
    io.emit('user:online', { userId: user.id });
    // Send the new user a list of who's currently online
    socket.emit('users:online', Array.from(onlineUsers.keys()));

    // ── Join a group room (called when user opens a group chat) ──────────
    socket.on('group:join', (chatId: string) => {
      socket.join(`group:${chatId}`);
    });

    // ── Handle: Send Message ────────────────────────────────────────────
    socket.on('message:send', async (data: SocketMessageData) => {
      try {
        const { chatId, content, recipientId, isGroup } = data;

        // Authorization: verify user is a participant in this chat
        const participant = await prisma.chatParticipant.findUnique({
          where: { chatId_userId: { chatId, userId: user.id } },
        });
        if (!participant) {
          socket.emit('message:error', { error: 'You are not a member of this chat' });
          return;
        }

        // Save the message to both databases via the service
        const message = await MessageService.sendMessage(chatId, user.id, content);

        if (isGroup) {
          // For group chats: broadcast to the entire group room
          io.to(`group:${chatId}`).emit('message:receive', message);
        } else {
          // For 1-on-1: send to sender + specific recipient
          socket.emit('message:receive', message);

          if (recipientId) {
            const recipientSockets = onlineUsers.get(recipientId);
            if (recipientSockets) {
              for (const sid of recipientSockets) {
                io.to(sid).emit('message:receive', message);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error sending message via socket:', error);
        socket.emit('message:error', { error: 'Failed to send message' });
      }
    });

    // ── Handle: Delete Message ──────────────────────────────────────────
    socket.on('message:delete', async ({ messageId, chatId, isGroup, recipientId }: {
      messageId: string;
      chatId: string;
      isGroup?: boolean;
      recipientId?: string;
    }) => {
      try {
        const deleted = await MessageService.deleteMessage(messageId, user.id);
        if (!deleted) {
          socket.emit('message:error', { error: 'Cannot delete this message' });
          return;
        }

        const payload = { messageId, chatId };

        if (isGroup) {
          io.to(`group:${chatId}`).emit('message:deleted', payload);
        } else {
          socket.emit('message:deleted', payload);
          if (recipientId) {
            const recipientSockets = onlineUsers.get(recipientId);
            if (recipientSockets) {
              for (const sid of recipientSockets) {
                io.to(sid).emit('message:deleted', payload);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error deleting message via socket:', error);
        socket.emit('message:error', { error: 'Failed to delete message' });
      }
    });

    // ── Handle: Typing Indicators ───────────────────────────────────────
    socket.on('typing:start', ({ chatId, recipientId, isGroup }: TypingData) => {
      if (isGroup) {
        socket.to(`group:${chatId}`).emit('typing:start', {
          chatId,
          userId: user.id,
          username: user.username,
        });
      } else if (recipientId) {
        const recipientSockets = onlineUsers.get(recipientId);
        if (recipientSockets) {
          for (const sid of recipientSockets) {
            io.to(sid).emit('typing:start', {
              chatId,
              userId: user.id,
            });
          }
        }
      }
    });

    socket.on('typing:stop', ({ chatId, recipientId, isGroup }: TypingData) => {
      if (isGroup) {
        socket.to(`group:${chatId}`).emit('typing:stop', {
          chatId,
          userId: user.id,
        });
      } else if (recipientId) {
        const recipientSockets = onlineUsers.get(recipientId);
        if (recipientSockets) {
          for (const sid of recipientSockets) {
            io.to(sid).emit('typing:stop', {
              chatId,
              userId: user.id,
            });
          }
        }
      }
    });

    // ── Handle: Disconnect ──────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${user.username} (${user.id})`);

      // Remove THIS socket from the user's set
      const sockets = onlineUsers.get(user.id);
      if (sockets) {
        sockets.delete(socket.id);
        // Only mark user as offline if ALL their tabs/devices are disconnected
        if (sockets.size === 0) {
          onlineUsers.delete(user.id);
          io.emit('user:offline', { userId: user.id });
        }
      }
    });
  });

  return io;
};

/**
 * Returns the Map of currently online users.
 */
export const getOnlineUsers = (): Map<string, Set<string>> => onlineUsers;
