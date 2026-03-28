// ============================================================================
// Chat Service
// ============================================================================
// Handles chat-related business logic for BOTH 1-on-1 and group chats:
//   - Creating a new 1-on-1 chat (or returning existing one)
//   - Creating a group chat
//   - Getting all chats for a user
//   - Getting a single chat by ID
//   - Group management: add/remove members, rename, leave, make admin
//
// Uses BOTH databases:
//   - PostgreSQL (Prisma): Stores the chat, participants, and relationships
//   - MongoDB (Mongoose): Stores chat metadata for quick previews
// ============================================================================

import { prisma } from '../config/db';
import { ChatMetadata } from '../models/chatMetadata.model';

// Common include options for loading chat participants with user data
const CHAT_INCLUDE = {
  participants: {
    include: {
      user: {
        select: { id: true, username: true, email: true },
      },
    },
  },
} as const;

export class ChatService {
  // ────────────────────────────────────────────────────────────────────────
  // 1-ON-1 CHAT
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new 1-on-1 chat between two users, or returns the existing one.
   */
  static async getOrCreateChat(userId: string, participantId: string) {
    // Look for existing 1-on-1 chat (not a group) with both users
    const existingChat = await prisma.chat.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: participantId } } },
        ],
      },
      include: CHAT_INCLUDE,
    });

    if (existingChat) return existingChat;

    // Create new 1-on-1 chat
    const newChat = await prisma.chat.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId }, { userId: participantId }],
        },
      },
      include: CHAT_INCLUDE,
    });

    await ChatMetadata.create({
      chatId: newChat.id,
      participantIds: [userId, participantId],
      isGroup: false,
      metadata: { totalMessages: 0, createdBy: userId },
    });

    return newChat;
  }

  // ────────────────────────────────────────────────────────────────────────
  // GROUP CHAT CRUD
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new group chat.
   * The creator is automatically an "admin"; other participants are "member".
   */
  static async createGroup(
    creatorId: string,
    name: string,
    participantIds: string[],
  ) {
    // Ensure creator is included and deduplicate
    const allIds = [...new Set([creatorId, ...participantIds])];

    const group = await prisma.chat.create({
      data: {
        isGroup: true,
        name,
        createdById: creatorId,
        participants: {
          create: allIds.map((uid) => ({
            userId: uid,
            role: uid === creatorId ? 'admin' : 'member',
          })),
        },
      },
      include: CHAT_INCLUDE,
    });

    await ChatMetadata.create({
      chatId: group.id,
      participantIds: allIds,
      isGroup: true,
      groupName: name,
      metadata: { totalMessages: 0, createdBy: creatorId },
    });

    return group;
  }

  /**
   * Renames a group chat. Only admins can do this.
   */
  static async renameGroup(chatId: string, userId: string, newName: string) {
    // Verify user is admin
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId, role: 'admin' },
    });
    if (!participant) throw new Error('Only admins can rename the group');

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { name: newName },
      include: CHAT_INCLUDE,
    });

    // Sync MongoDB
    await ChatMetadata.findOneAndUpdate({ chatId }, { groupName: newName });

    return updated;
  }

  /**
   * Adds a member to a group chat. Only admins can add members.
   */
  static async addMember(chatId: string, adminId: string, newUserId: string) {
    // Verify caller is admin of this group
    const adminParticipant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId: adminId, role: 'admin' },
    });
    if (!adminParticipant) throw new Error('Only admins can add members');

    // Check chat is a group
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat?.isGroup) throw new Error('Cannot add members to a 1-on-1 chat');

    // Check user isn't already in the group
    const existing = await prisma.chatParticipant.findFirst({
      where: { chatId, userId: newUserId },
    });
    if (existing) throw new Error('User is already a member of this group');

    await prisma.chatParticipant.create({
      data: { chatId, userId: newUserId, role: 'member' },
    });

    // Update MongoDB participant list
    await ChatMetadata.findOneAndUpdate(
      { chatId },
      { $addToSet: { participantIds: newUserId } },
    );

    // Return updated chat
    return prisma.chat.findUnique({
      where: { id: chatId },
      include: CHAT_INCLUDE,
    });
  }

  /**
   * Removes a member from a group. Admins can remove members.
   * A member can also remove themselves (leave).
   */
  static async removeMember(
    chatId: string,
    requesterId: string,
    targetUserId: string,
  ) {
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat?.isGroup) throw new Error('Cannot remove members from a 1-on-1 chat');

    // If removing another user, must be admin
    if (requesterId !== targetUserId) {
      const adminCheck = await prisma.chatParticipant.findFirst({
        where: { chatId, userId: requesterId, role: 'admin' },
      });
      if (!adminCheck) throw new Error('Only admins can remove other members');
    }

    // Don't allow the last admin to leave (must promote someone first)
    if (requesterId === targetUserId) {
      const adminCount = await prisma.chatParticipant.count({
        where: { chatId, role: 'admin' },
      });
      const isAdmin = await prisma.chatParticipant.findFirst({
        where: { chatId, userId: targetUserId, role: 'admin' },
      });
      if (isAdmin && adminCount === 1) {
        const memberCount = await prisma.chatParticipant.count({ where: { chatId } });
        if (memberCount > 1) {
          throw new Error('Promote another admin before leaving');
        }
      }
    }

    await prisma.chatParticipant.deleteMany({
      where: { chatId, userId: targetUserId },
    });

    // Update MongoDB
    await ChatMetadata.findOneAndUpdate(
      { chatId },
      { $pull: { participantIds: targetUserId } },
    );

    // If no members remain, delete the group entirely
    const remaining = await prisma.chatParticipant.count({ where: { chatId } });
    if (remaining === 0) {
      await prisma.chat.delete({ where: { id: chatId } });
      await ChatMetadata.deleteOne({ chatId });
      return null;
    }

    return prisma.chat.findUnique({
      where: { id: chatId },
      include: CHAT_INCLUDE,
    });
  }

  /**
   * Promotes a member to admin in a group.
   */
  static async makeAdmin(chatId: string, adminId: string, targetUserId: string) {
    // Verify caller is admin
    const adminCheck = await prisma.chatParticipant.findFirst({
      where: { chatId, userId: adminId, role: 'admin' },
    });
    if (!adminCheck) throw new Error('Only admins can promote members');

    const target = await prisma.chatParticipant.findFirst({
      where: { chatId, userId: targetUserId },
    });
    if (!target) throw new Error('User is not in this group');

    await prisma.chatParticipant.update({
      where: { id: target.id },
      data: { role: 'admin' },
    });

    return prisma.chat.findUnique({
      where: { id: chatId },
      include: CHAT_INCLUDE,
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // SHARED QUERIES (work for both 1-on-1 and groups)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Returns all chats for a given user (both 1-on-1 and groups),
   * sorted by most recent activity.
   */
  static async getUserChats(userId: string) {
    const chats = await prisma.chat.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        ...CHAT_INCLUDE,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const enrichedChats = await Promise.all(
      chats.map(async (chat: (typeof chats)[number]) => {
        const metadata = await ChatMetadata.findOne({ chatId: chat.id });
        return {
          ...chat,
          metadata: metadata ? metadata.toObject() : null,
        };
      }),
    );

    return enrichedChats;
  }

  /**
   * Returns a single chat by ID, but only if the requesting user
   * is a participant (security check).
   */
  static async getChatById(chatId: string, userId: string) {
    return prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: { some: { userId } },
      },
      include: CHAT_INCLUDE,
    });
  }
}
