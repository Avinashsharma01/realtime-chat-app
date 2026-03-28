// ============================================================================
// MessageIndex — MongoDB Model
// ============================================================================
// Stores a searchable index of messages in MongoDB.
//
// WHY MONGODB FOR THIS?
//   - MongoDB has built-in full-text search ($text indexes)
//   - PostgreSQL full-text search requires additional setup (tsvector, etc.)
//   - This keeps the main messages table in PostgreSQL lean and fast
//   - Keyword extraction and flexible indexing fit MongoDB's document model
//
// HOW IT WORKS:
//   When a message is saved to PostgreSQL, a corresponding index document
//   is created here with the message content and extracted keywords.
//   Text search queries hit this collection, then the matching message IDs
//   are used to fetch the full messages from PostgreSQL.
// ============================================================================

import mongoose, { Schema, Document } from 'mongoose';

// ── TypeScript Interface ────────────────────────────────────────────────────

export interface IMessageIndex extends Document {
  messageId: string;    // References PostgreSQL message.id
  chatId: string;       // Which chat this message belongs to
  senderId: string;     // Who sent this message
  content: string;      // Message text (indexed for full-text search)
  keywords: string[];   // Extracted keywords for tag-based search
  createdAt: Date;
}

// ── Mongoose Schema ─────────────────────────────────────────────────────────

const messageIndexSchema = new Schema<IMessageIndex>(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,   // One index doc per message
    },
    chatId: {
      type: String,
      required: true,
      index: true,     // Fast filtering by chat
    },
    senderId: {
      type: String,
      required: true,
      index: true,     // Fast filtering by sender
    },
    content: {
      type: String,
      required: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We manage createdAt ourselves
  },
);

// ── Text Index ──────────────────────────────────────────────────────────────
// Create a compound text index on content and keywords for full-text search.
// This enables MongoDB's $text operator for searching messages.
messageIndexSchema.index({ content: 'text', keywords: 'text' });

// ── Export Model ────────────────────────────────────────────────────────────
export const MessageIndex = mongoose.model<IMessageIndex>(
  'MessageIndex',
  messageIndexSchema,
);
