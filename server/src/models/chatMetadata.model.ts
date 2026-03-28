// ============================================================================
// ChatMetadata — MongoDB Model
// ============================================================================
// Stores metadata about each chat in MongoDB.
//
// WHY MONGODB FOR THIS?
//   - Chat metadata changes frequently (lastMessage, unreadCounts)
//   - The structure is flexible (unreadCounts is a dynamic map)
//   - MongoDB handles frequent updates well without locking issues
//   - No complex joins needed — this is a standalone document
//
// This supplements the PostgreSQL Chat table by storing data that is:
//   - Read frequently (chat list previews)
//   - Updated frequently (every new message updates lastMessage)
//   - Semi-structured (unreadCounts varies per participant)
// ============================================================================

import mongoose, { Schema, Document } from 'mongoose';

// ── TypeScript Interface ────────────────────────────────────────────────────

/** Shape of the last message preview */
interface ILastMessage {
  content: string;
  senderId: string;
  sentAt: Date;
}

/** Shape of the chat metadata document */
export interface IChatMetadata extends Document {
  chatId: string;                          // References PostgreSQL chat.id
  participantIds: string[];                // For quick lookup without joining
  isGroup: boolean;                        // true for group chats
  groupName?: string;                      // Group display name
  lastMessage?: ILastMessage;              // Preview of the most recent message
  unreadCounts: Map<string, number>;       // userId → unread message count
  metadata: {
    totalMessages: number;                 // Running count of all messages
    createdBy: string;                     // Who initiated the chat
  };
  createdAt: Date;
  updatedAt: Date;
}

// ── Mongoose Schema ─────────────────────────────────────────────────────────

const chatMetadataSchema = new Schema<IChatMetadata>(
  {
    chatId: {
      type: String,
      required: true,
      unique: true,    // One metadata doc per chat
      index: true,     // Fast lookups by chatId
    },
    participantIds: {
      type: [String],
      required: true,
      index: true,     // Find all chats for a user quickly
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      default: null,
    },
    lastMessage: {
      content: String,
      senderId: String,
      sentAt: Date,
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: new Map(), // Start with no unread messages
    },
    metadata: {
      totalMessages: { type: Number, default: 0 },
      createdBy: { type: String, required: true },
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
  },
);

// ── Export Model ────────────────────────────────────────────────────────────
export const ChatMetadata = mongoose.model<IChatMetadata>(
  'ChatMetadata',
  chatMetadataSchema,
);
