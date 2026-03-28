# Database Design

## Overview

This application uses **two databases**, each chosen for its strengths:

| Database   | ORM/ODM  | Purpose                              |
| ---------- | -------- | ------------------------------------ |
| PostgreSQL | Prisma   | Relational data with strict integrity |
| MongoDB    | Mongoose | Flexible metadata and text search     |

---

## PostgreSQL — Primary Database

### Why PostgreSQL?

PostgreSQL is a **relational database** — perfect for data that has clear
relationships between entities:

1. **Users** have accounts with unique emails and usernames
2. **Chats** connect exactly two users
3. **Messages** belong to one chat and one sender
4. **Foreign keys** enforce that a message can't reference a non-existent user
5. **ACID transactions** ensure data consistency
6. **Unique constraints** prevent duplicate accounts

### Tables

#### `users` Table
```sql
┌─────────────┬──────────┬───────────────────────────────┐
│ Column      │ Type     │ Description                   │
├─────────────┼──────────┼───────────────────────────────┤
│ id          │ UUID     │ Primary key (auto-generated)  │
│ username    │ VARCHAR  │ Unique, display name          │
│ email       │ VARCHAR  │ Unique, used for login        │
│ password    │ VARCHAR  │ Bcrypt hash (never plain text)│
│ created_at  │ DATETIME │ Account creation time         │
│ updated_at  │ DATETIME │ Last modification time        │
└─────────────┴──────────┴───────────────────────────────┘
```

#### `chats` Table
```sql
┌─────────────┬──────────┬───────────────────────────────┐
│ Column      │ Type     │ Description                   │
├─────────────┼──────────┼───────────────────────────────┤
│ id          │ UUID     │ Primary key                   │
│ created_at  │ DATETIME │ When the chat was started     │
│ updated_at  │ DATETIME │ Last activity (new message)   │
└─────────────┴──────────┴───────────────────────────────┘
```

#### `chat_participants` Table (Junction Table)
```sql
┌─────────────┬──────────┬───────────────────────────────┐
│ Column      │ Type     │ Description                   │
├─────────────┼──────────┼───────────────────────────────┤
│ id          │ UUID     │ Primary key                   │
│ chat_id     │ UUID     │ Foreign key → chats.id        │
│ user_id     │ UUID     │ Foreign key → users.id        │
└─────────────┴──────────┴───────────────────────────────┘
UNIQUE constraint on (chat_id, user_id) — a user can only be in a chat once
```

#### `messages` Table
```sql
┌─────────────┬──────────┬───────────────────────────────┐
│ Column      │ Type     │ Description                   │
├─────────────┼──────────┼───────────────────────────────┤
│ id          │ UUID     │ Primary key                   │
│ content     │ TEXT     │ The message text              │
│ chat_id     │ UUID     │ Foreign key → chats.id        │
│ sender_id   │ UUID     │ Foreign key → users.id        │
│ created_at  │ DATETIME │ When the message was sent     │
│ updated_at  │ DATETIME │ Last edit time                │
└─────────────┴──────────┴───────────────────────────────┘
```

### Relationships (Entity Relationship Diagram)

```
┌──────────┐       ┌───────────────────┐       ┌──────────┐
│  users   │       │ chat_participants │       │  chats   │
├──────────┤       ├───────────────────┤       ├──────────┤
│ id (PK)  │◄──────│ user_id (FK)      │       │ id (PK)  │
│ username │       │ chat_id (FK)      │──────►│created_at│
│ email    │       │ id (PK)           │       │updated_at│
│ password │       └───────────────────┘       └──────────┘
│created_at│                                        │
│updated_at│       ┌──────────────────┐             │
└──────────┘       │    messages      │             │
      │            ├──────────────────┤             │
      │            │ id (PK)          │             │
      └────────────│ sender_id (FK)   │             │
                   │ chat_id (FK)     │─────────────┘
                   │ content          │
                   │ created_at       │
                   │ updated_at       │
                   └──────────────────┘
```

### Why a Junction Table for Participants?

Instead of storing participants directly in the chats table (e.g., `user1_id`,
`user2_id`), we use a **junction table** (`chat_participants`). This is the
**normalized** approach:

- Scales to group chats (just add more rows)
- Easy to query "all chats for user X"
- Follows database normalization best practices

---

## MongoDB — Secondary Database

### Why MongoDB?

MongoDB is a **document database** — perfect for data that is:

1. **Frequently updated** — Chat metadata changes with every message
2. **Flexible in structure** — Unread counts vary per user
3. **Optimized for reads** — Chat list previews need fast access
4. **Text-searchable** — Built-in full-text indexing

### Collections

#### `ChatMetadata` Collection
```javascript
{
  chatId: "uuid-from-postgresql",     // Links to PostgreSQL chat
  participantIds: ["user-id-1", "user-id-2"], // Quick lookup
  lastMessage: {
    content: "Hey, how are you?",     // Preview text
    senderId: "user-id-1",
    sentAt: ISODate("2024-01-15T10:30:00Z")
  },
  unreadCounts: {                     // Dynamic map: userId → count
    "user-id-1": 0,
    "user-id-2": 3
  },
  metadata: {
    totalMessages: 42,                // Running count
    createdBy: "user-id-1"            // Who initiated
  },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

**Why in MongoDB?**
- The `unreadCounts` map has dynamic keys (user IDs) — fits MongoDB's flexible schema
- Updated with EVERY message (MongoDB handles frequent writes well)
- Used for the chat list sidebar (fast reads without JOINs)

#### `MessageIndex` Collection
```javascript
{
  messageId: "uuid-from-postgresql",  // Links to PostgreSQL message
  chatId: "uuid",
  senderId: "uuid",
  content: "Hey, how are you?",       // Indexed for text search
  keywords: ["hey", "how", "are", "you"],
  createdAt: ISODate("...")
}
```

**Why in MongoDB?**
- MongoDB has **built-in text indexing** (`db.collection.createIndex({ content: "text" })`)
- Text search with relevance scoring via `$text` operator
- No need for external search tools (Elasticsearch) for this scale
- Keeps the PostgreSQL messages table lean (no search-specific columns)

---

## Normalization vs Denormalization

### PostgreSQL: Normalized

Our PostgreSQL schema follows **Third Normal Form (3NF)**:
- No repeating groups
- No partial dependencies
- No transitive dependencies

**Example**: A user's name is stored ONCE in `users`. When we need it
alongside a message, we JOIN. This prevents inconsistencies.

### MongoDB: Denormalized

Our MongoDB schema is **intentionally denormalized**:
- `ChatMetadata.participantIds` duplicates data from `chat_participants`
- `MessageIndex.content` duplicates data from `messages`

**Why?** Because MongoDB queries are faster without JOINs (document databases
don't have efficient JOINs). The trade-off is:
- **Pro**: Fast reads (no expensive JOINs)
- **Con**: Data can become inconsistent (must update in sync)

We accept this trade-off because:
1. Chat metadata is supplementary (the source of truth is PostgreSQL)
2. Message index is a search optimization (rebuild-able from PostgreSQL data)

---

## Data Placement Decision Summary

| Data            | Database   | Reason                                    |
| --------------- | ---------- | ----------------------------------------- |
| User accounts   | PostgreSQL | Unique constraints, relationships, auth   |
| Chat records    | PostgreSQL | Relational to users via junction table    |
| Messages        | PostgreSQL | Belong to chats and users (foreign keys)  |
| Chat metadata   | MongoDB    | Flexible schema, frequent updates         |
| Message search  | MongoDB    | Built-in text indexing and search          |
