// ============================================================================
// Message Service
// ============================================================================
// Handles message-related business logic:
//   - Sending messages (saves to PostgreSQL + indexes in MongoDB)
//   - Fetching messages with pagination
//   - Full-text search using MongoDB's text index
//
// This is the best example of the dual-database approach:
//   - PostgreSQL: Stores the authoritative message data with relationships
//   - MongoDB: Maintains a search index for fast text queries
//
// When a message is sent, it's saved to BOTH databases simultaneously.
// ============================================================================

import { prisma } from '../config/db';
import { ChatMetadata } from '../models/chatMetadata.model';
import { MessageIndex } from '../models/messageIndex.model';

export class MessageService {
  /**
   * Sends a new message in a chat.
   *
   * Flow:
   *   1. Save the message to PostgreSQL (authoritative data)
   *   2. Update the chat's timestamp in PostgreSQL
   *   3. Update the chat metadata in MongoDB (lastMessage, totalMessages)
   *   4. Create a search index entry in MongoDB
   *   5. Return the saved message with sender details
   *
   * Both the Socket.IO handler and the REST API call this method.
   */
  static async sendMessage(chatId: string, senderId: string, content: string) {
    // Step 1: Save message to PostgreSQL
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        content,
      },
      include: {
        sender: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    // Step 2: Update chat's updatedAt (so it sorts to top of chat list)
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Step 3: Update MongoDB chat metadata
    await ChatMetadata.findOneAndUpdate(
      { chatId },
      {
        lastMessage: {
          content,
          senderId,
          sentAt: message.createdAt,
        },
        $inc: { 'metadata.totalMessages': 1 }, // Increment message count
      },
      { upsert: true }, // Create if doesn't exist
    );

    // Step 4: Create search index in MongoDB
    await MessageIndex.create({
      messageId: message.id,
      chatId,
      senderId,
      content,
      // Extract keywords: lowercase, split by whitespace, filter short words
      keywords: content
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 2),
      createdAt: message.createdAt,
    });

    return message;
  }

  /**
   * Fetches messages for a chat with pagination.
   *
   * Messages are ordered chronologically (oldest first) so the UI
   * can display them in the correct order.
   *
   * @param chatId - The chat to fetch messages for
   * @param page   - Page number (1-based)
   * @param limit  - Number of messages per page
   */
  static async getChatMessages(
    chatId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit;

    // Fetch messages from PostgreSQL
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { chatId },
        include: {
          sender: {
            select: { id: true, username: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' }, // Chronological order
        skip,
        take: limit,
      }),
      prisma.message.count({ where: { chatId } }),
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Full-text search for messages within a specific chat.
   *
   * Uses MongoDB's $text operator which leverages the text index
   * defined in the MessageIndex model. Results are sorted by
   * text search relevance score.
   *
   * Flow:
   *   1. Search MongoDB's MessageIndex collection
   *   2. Get the matching message IDs
   *   3. Fetch full message data from PostgreSQL
   *
   * This demonstrates why MongoDB is used for search:
   *   - Built-in text indexing and relevance scoring
   *   - No need for additional search infrastructure
   */
  static async searchMessages(chatId: string, query: string) {
    // Step 1: Search in MongoDB
    const indexedMessages = await MessageIndex.find({
      chatId,
      $text: { $search: query },
    })
      .sort({ score: { $meta: 'textScore' } })
      .limit(50);

    if (indexedMessages.length === 0) {
      return [];
    }

    // Step 2: Get the PostgreSQL message IDs
    const messageIds = indexedMessages.map((m) => m.messageId);

    // Step 3: Fetch full messages from PostgreSQL
    return prisma.message.findMany({
      where: { id: { in: messageIds } },
      include: {
        sender: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Soft-deletes a message (sets deletedAt timestamp and clears content).
   *
   * Only the message sender can delete their own messages.
   * The message remains in the database but is marked as deleted
   * so the UI can show "This message was deleted" placeholder.
   *
   * @param messageId - The ID of the message to delete
   * @param userId    - The ID of the user requesting deletion
   * @returns The updated message, or null if not found / not authorized
   */
  static async deleteMessage(messageId: string, userId: string) {
    // Verify the message exists and belongs to the user
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) return null;
    if (message.senderId !== userId) return null;

    // Soft-delete: set deletedAt and replace content
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        content: 'This message was deleted',
      },
      include: {
        sender: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    // Also remove from MongoDB search index
    await MessageIndex.deleteOne({ messageId });

    return updated;
  }
}
