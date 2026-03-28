# Real-Time Chat Application — Complete Developer Course

> **A deep-dive guide** into building a production-grade real-time chat app
> with **React, Node.js, PostgreSQL, MongoDB, Socket.IO, and TypeScript**.

---

## Table of Contents

1. [Course Overview](#1-course-overview)
2. [Architecture & Why We Chose It](#2-architecture--why-we-chose-it)
3. [Technology Stack Deep Dive](#3-technology-stack-deep-dive)
4. [Project Structure Explained](#4-project-structure-explained)
5. [Module 1 — Database Design (PostgreSQL + MongoDB)](#5-module-1--database-design-postgresql--mongodb)
6. [Module 2 — Backend Foundation (Express + TypeScript)](#6-module-2--backend-foundation-express--typescript)
7. [Module 3 — Authentication System (JWT + Bcrypt)](#7-module-3--authentication-system-jwt--bcrypt)
8. [Module 4 — Chat & Message APIs](#8-module-4--chat--message-apis)
9. [Module 5 — Real-Time Engine (Socket.IO)](#9-module-5--real-time-engine-socketio)
10. [Module 6 — Frontend Foundation (React + Vite + Tailwind)](#10-module-6--frontend-foundation-react--vite--tailwind)
11. [Module 7 — State Management (Context + Hooks)](#11-module-7--state-management-context--hooks)
12. [Module 8 — Chat UI Components](#12-module-8--chat-ui-components)
13. [Module 9 — Group Chat Feature (Full Stack)](#13-module-9--group-chat-feature-full-stack)
14. [Module 10 — Responsive Design](#14-module-10--responsive-design)
15. [Module 11 — Production Hardening & UX Improvements](#15-module-11--production-hardening--ux-improvements)
16. [Key Patterns & Best Practices](#16-key-patterns--best-practices)
17. [Data Flow Diagrams](#17-data-flow-diagrams)
18. [Common Pitfalls & Debugging](#18-common-pitfalls--debugging)
19. [Glossary of Terms](#19-glossary-of-terms)

---

## 1. Course Overview

### What We Built

A **full-stack real-time chat application** that supports:

- **User Registration & Login** — secure authentication with JWT tokens
- **User Profiles** — avatar, bio, and username editing
- **1-on-1 Chats** — private conversations between two users
- **Group Chats** — create groups, add/remove members, admin roles
- **Real-Time Messaging** — messages appear instantly via WebSockets
- **Message Deletion** — soft-delete your own messages in real time
- **Emoji Picker** — quick-access grid of 32 common emojis
- **Typing Indicators** — see when someone is typing (debounced)
- **Online/Offline Status** — see who's currently active (multi-tab aware)
- **Toast Notifications** — success/error/warning/info popups
- **Confirmation Dialogs** — safe destructive actions (delete, leave, remove)
- **Notification Sounds** — audio beep for incoming messages
- **Responsive UI** — works on desktop, tablet, and mobile
- **Production Hardening** — CORS lock-down, body limits, env validation, DB indexes

### Prerequisites

Before starting, you should understand:

- **JavaScript basics** (variables, functions, arrays, objects, async/await)
- **HTML/CSS fundamentals**
- **What a server and API is** (at a high level)
- **How to use a terminal** (running commands)

Everything else—TypeScript, React, Node.js, databases—is taught in detail.

---

## 2. Architecture & Why We Chose It

### The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  React 19 + TypeScript + Tailwind CSS + Vite                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Login   │  │ Register │  │   Chat   │  │ Group Modal  │   │
│  │  Page    │  │   Page   │  │   Page   │  │ & Info Panel │   │
│  └──────────┘  └──────────┘  └────┬─────┘  └──────────────┘   │
│                                    │                            │
│  ┌─────────────────────────────────┴──────────────────────┐    │
│  │              Services (API calls + Socket.IO)           │    │
│  └────────────────────┬────────────────┬──────────────────┘    │
└───────────────────────┼────────────────┼────────────────────────┘
                        │ HTTP (REST)    │ WebSocket
                        ▼                ▼
┌───────────────────────┴────────────────┴────────────────────────┐
│                         SERVER (Node.js)                        │
│  Express + TypeScript + Socket.IO                               │
│                                                                 │
│  ┌────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Routes │→ │ Controllers│→ │ Services │→ │  Databases   │   │
│  └────────┘  └────────────┘  └──────────┘  └──────┬───────┘   │
│                                                     │           │
│  ┌──────────────────────────────────────────────────┘           │
│  ▼                                                              │
│  ┌─────────────┐         ┌─────────────┐                       │
│  │ PostgreSQL  │         │  MongoDB    │                       │
│  │ (Prisma)    │         │ (Mongoose)  │                       │
│  │             │         │             │                       │
│  │ Users       │         │ ChatMeta    │                       │
│  │ Chats       │         │ MessageIdx  │                       │
│  │ Messages    │         │ (Search)    │                       │
│  │ Participants│         │             │                       │
│  └─────────────┘         └─────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### Why Two Databases?

This is the most unique architectural decision. Here's the reasoning:

| Feature | PostgreSQL | MongoDB |
|---------|-----------|---------|
| **Data Relationships** | Excellent (foreign keys, joins) | Weak (no true joins) |
| **Data Integrity** | ACID transactions guarantee consistency | Eventually consistent |
| **Flexible Documents** | Rigid schema | Schema-less, easy to change |
| **Text Search** | Basic | Built-in full-text search |
| **Best For** | Users, chats, messages (relational) | Metadata, search indexes |

- **PostgreSQL** stores the **authoritative data** — users, chats, messages, participants. These have clear relationships (a message belongs to a chat AND a user), and we need strict consistency (a message can't reference a non-existent user).

- **MongoDB** stores **supplementary data** — chat metadata (last message preview, total message count) and message search indexes. This data CAN be rebuilt from PostgreSQL if needed. MongoDB's flexible documents make it easy to add new fields without migrations.

### Why a Layered Backend?

We use the **Controller → Service → Database** pattern:

```
HTTP Request
    │
    ▼
  Route        → Matches URL to a controller method
    │
    ▼
  Controller   → Validates input, calls service, sends HTTP response
    │
    ▼
  Service      → Contains business logic, talks to databases
    │
    ▼
  Database     → PostgreSQL (Prisma) / MongoDB (Mongoose)
```

**Why not put everything in one file?**

- **Separation of concerns**: Each layer has one job
- **Testability**: You can test services without HTTP
- **Reusability**: The Socket.IO handler and REST API BOTH call the same `MessageService.sendMessage()` method
- **Maintainability**: Changing the database doesn't require changing controllers

---

## 3. Technology Stack Deep Dive

### 3.1 TypeScript — The Language

**What**: A superset of JavaScript that adds static types.

**Why we use it EVERYWHERE** (both client and server):

```typescript
// WITHOUT TypeScript — you won't catch this until runtime:
function sendMessage(chatId, content) {
  // Is chatId a string? A number? Can content be null?
  // Who knows! 🤷
}

// WITH TypeScript — errors caught BEFORE running:
function sendMessage(chatId: string, content: string): Promise<Message> {
  // TypeScript ensures chatId is always a string
  // The return type is explicit — you know what you get back
}
```

TypeScript catches bugs at **compile time** (when you write code) instead of **runtime** (when users use the app). In a chat app with multiple data types flowing between client, server, and databases, this is invaluable.

**Key TypeScript concepts used in this project**:

```typescript
// 1. INTERFACES — define the shape of data
interface User {
  id: string;
  username: string;
  email: string;
}

// 2. TYPE ANNOTATIONS — declare what a variable holds
const users: User[] = [];           // Array of Users
let selectedChat: Chat | null = null; // Chat or null

// 3. GENERICS — reusable type patterns
const response = await api.get<{ users: User[] }>('/users');
// Now TypeScript knows response.data.users is User[]

// 4. IMPORT TYPE — import types without runtime cost
import type { Message } from '../types';

// 5. EXTENDING INTERFACES — add properties to existing types
interface AuthRequest extends Request {
  user?: UserPayload; // Add user to Express Request
}
```

### 3.2 React 19 — The UI Framework

**What**: A JavaScript library for building user interfaces using components.

**Why React**:
- **Component model** — break UI into reusable pieces (ChatList, MessageBubble, etc.)
- **Declarative** — describe WHAT the UI should look like, React handles HOW to update it
- **Huge ecosystem** — React Router, Socket.IO client, etc.
- **Industry standard** — most in-demand frontend skill

**Key React concepts used**:

```tsx
// 1. FUNCTIONAL COMPONENTS — a function that returns JSX
export const MessageBubble = ({ message, isOwn }: Props) => {
  return <div className={isOwn ? 'blue' : 'white'}>{message.content}</div>;
};

// 2. useState — manage component state
const [messages, setMessages] = useState<Message[]>([]);

// 3. useEffect — run side effects (API calls, subscriptions)
useEffect(() => {
  fetchMessages(); // Runs when component mounts
}, []);            // Empty array = run once

// 4. useCallback — memoize functions to prevent unnecessary re-renders
const handleSend = useCallback((content: string) => {
  socket.emit('message:send', { chatId, content });
}, [socket, chatId]);

// 5. useContext — access shared state without prop drilling
const { user, logout } = useAuth(); // Custom hook that uses useContext
```

### 3.3 Vite 7 — The Build Tool

**What**: A modern frontend build tool that's extremely fast.

**Why Vite instead of Create React App (CRA)**:

| Feature | CRA (legacy) | Vite |
|---------|-------------|------|
| Dev start time | 10-30 seconds | < 1 second |
| Hot reload | Full page rebuild | Instant module swap |
| Build output | Webpack bundle | Optimized Rollup bundle |
| Configuration | Hidden, hard to customize | Simple vite.config.ts |
| Status | Deprecated | Actively maintained |

```typescript
// vite.config.ts — simple, clean configuration
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

### 3.4 Tailwind CSS v4 — Styling

**What**: A utility-first CSS framework.

**Why Tailwind instead of regular CSS**:

```tsx
// REGULAR CSS — requires separate file, naming conventions, specificity wars
<div className="chat-message chat-message--own chat-message--large">

// TAILWIND — styles right in the JSX, predictable, composable
<div className="bg-blue-500 text-white px-4 py-2 rounded-2xl max-w-xs">
```

**Benefits**:
- **No naming CSS classes** — no BEM, no CSS modules
- **No switching files** — styles co-located with components
- **Consistent design** — predefined spacing, colors, fonts
- **Responsive** — `md:px-6 lg:px-8` adapts per screen size
- **Small production build** — unused styles are removed automatically

**Tailwind v4 difference**: Uses `@import "tailwindcss"` instead of v3's `@tailwind base/components/utilities` directives.

### 3.5 Express 4 — The Web Framework

**What**: A minimal Node.js web framework for building APIs.

**Why Express**:
- **Simplest way** to create an HTTP server in Node.js
- **Middleware pattern** — plug in features (CORS, auth, logging) like building blocks
- **Huge ecosystem** — every utility library supports Express
- **Low abstraction** — you understand what's happening

```typescript
// Express is just: receive request → process → send response
app.get('/api/users', authenticate, async (req, res) => {
  const users = await prisma.user.findMany();
  res.json({ users });
});
```

**The Middleware Chain**:

```
Request → Helmet → CORS → JSON Parser → Morgan → Route Handler → Error Handler → Response
         (security) (cross-origin) (body)  (logging)  (your code)   (catch errors)
```

Each middleware can:
- Modify the request (e.g., `authenticate` adds `req.user`)
- Send a response early (e.g., auth fails → 401)
- Call `next()` to pass to the next middleware

### 3.6 Prisma — PostgreSQL ORM

**What**: An ORM (Object-Relational Mapper) that lets you interact with PostgreSQL using TypeScript.

**Why Prisma instead of raw SQL**:

```typescript
// RAW SQL — error-prone, no type safety
const result = await pool.query(
  'SELECT * FROM users WHERE id = $1', [userId]
);
const user = result.rows[0]; // What type is this? Any!

// PRISMA — type-safe, auto-completion
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, username: true, email: true },
});
// TypeScript KNOWS user has id, username, email (not password!)
```

**The Prisma workflow**:

```
1. Define schema in prisma/schema.prisma
        ↓
2. Run `npx prisma migrate dev` → creates SQL migration + updates DB
        ↓
3. Run `npx prisma generate` → generates TypeScript client
        ↓
4. Import and use: const user = await prisma.user.findUnique(...)
```

### 3.7 Mongoose — MongoDB ODM

**What**: An ODM (Object-Document Mapper) for MongoDB.

**Why Mongoose**:
- Defines a schema for documents (MongoDB itself is schema-less)
- Provides validation and middleware hooks
- Familiar query API

```typescript
// Define a schema — what a ChatMetadata document looks like
const chatMetadataSchema = new Schema<IChatMetadata>({
  chatId:    { type: String, required: true, unique: true },
  isGroup:   { type: Boolean, default: false },
  groupName: { type: String },
  lastMessage: {
    content:  String,
    senderId: String,
    sentAt:   Date,
  },
  metadata: {
    totalMessages: { type: Number, default: 0 },
    createdBy:     String,
  },
});

// Use it — MongoDB stores this as a JSON-like document
await ChatMetadata.findOneAndUpdate(
  { chatId },
  { lastMessage: { content, senderId, sentAt: new Date() } },
  { upsert: true },  // Create if not exists
);
```

### 3.8 Socket.IO — Real-Time Communication

**What**: A library that enables real-time, bidirectional communication between client and server.

**Why Socket.IO instead of raw WebSockets**:

| Feature | Raw WebSocket | Socket.IO |
|---------|--------------|-----------|
| Auto-reconnect | No | Yes |
| Room support | No | Built-in |
| Event naming | No (raw data only) | `socket.emit('eventName', data)` |
| Fallback | WebSocket only | HTTP long-polling fallback |
| Binary support | Manual | Automatic |
| Acknowledgements | Manual | Built-in |

```typescript
// Socket.IO makes real-time SIMPLE:
// Server
socket.on('message:send', async (data) => {
  const message = await MessageService.sendMessage(...);
  io.to(`group:${chatId}`).emit('message:receive', message);
});

// Client
socket.emit('message:send', { chatId, content: 'Hello!' });
socket.on('message:receive', (message) => {
  setMessages(prev => [...prev, message]);
});
```

### 3.9 JWT (JSON Web Tokens) — Authentication

**What**: A token format that securely stores user identity.

**How it works**:

```
1. User logs in with email + password
        ↓
2. Server verifies credentials
        ↓
3. Server creates a JWT containing { id, username, email }
   Signed with a SECRET key that only the server knows
        ↓
4. Token sent to client → stored in localStorage
        ↓
5. Client sends token with EVERY request:
   Authorization: Bearer eyJhbGci...
        ↓
6. Server verifies the signature → trusts the { id, username, email }
   No need to query the database on every request!
```

**JWT Structure** (three parts separated by dots):

```
header.payload.signature
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyIsInVzZXJuYW1lIjoiam9obiJ9.abc123signature

Header:    { "alg": "HS256" }           → Algorithm used
Payload:   { "id": "123", "username": "john" }  → User data
Signature: HMAC-SHA256(header + payload, SECRET)  → Proof of authenticity
```

### 3.10 Bcrypt — Password Hashing

**What**: A one-way hashing algorithm designed for passwords.

**Why we NEVER store plain text passwords**:

```
Plain: "password123"
        ↓ bcrypt hash (with salt rounds = 10)
Hashed: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

This hash CANNOT be reversed back to "password123"
To verify: bcrypt.compare("password123", hash) → true
```

**Salt rounds** = how many times to hash. Higher = more secure but slower.
We use **10 rounds** — a good balance (takes ~100ms to hash).

---

## 4. Project Structure Explained

```
REAL_TIME_CHAT_APP/
│
├── server/                          # ── BACKEND ──
│   ├── package.json                 # Dependencies + scripts
│   ├── tsconfig.json                # TypeScript config
│   ├── .env                         # Environment variables (secrets!)
│   │
│   ├── prisma/
│   │   └── schema.prisma            # PostgreSQL schema definition
│   │
│   └── src/
│       ├── server.ts                # Entry point — starts everything
│       ├── app.ts                   # Express setup (middleware + routes)
│       │
│       ├── config/
│       │   ├── env.ts               # Environment variable loader
│       │   └── db.ts                # Database connections (Prisma + Mongoose)
│       │
│       ├── types/
│       │   └── index.ts             # Shared TypeScript interfaces
│       │
│       ├── middleware/
│       │   ├── auth.ts              # JWT verification middleware
│       │   └── errorHandler.ts      # Global error catcher
│       │
│       ├── routes/
│       │   ├── auth.routes.ts       # /api/auth/* → register, login, me
│       │   ├── user.routes.ts       # /api/users/* → list, search, profile
│       │   ├── chat.routes.ts       # /api/chats/* → CRUD chats + groups
│       │   └── message.routes.ts    # /api/messages/* → send, fetch, search, delete
│       │
│       ├── controllers/
│       │   ├── auth.controller.ts   # HTTP handler for auth endpoints
│       │   ├── user.controller.ts   # HTTP handler for user endpoints
│       │   ├── chat.controller.ts   # HTTP handler for chat endpoints
│       │   └── message.controller.ts# HTTP handler for message endpoints
│       │
│       ├── services/
│       │   ├── auth.service.ts      # Business logic: register, login
│       │   ├── user.service.ts      # Business logic: find users
│       │   ├── chat.service.ts      # Business logic: create/manage chats
│       │   └── message.service.ts   # Business logic: send/fetch messages
│       │
│       ├── models/
│       │   ├── chatMetadata.model.ts   # MongoDB: chat metadata schema
│       │   └── messageIndex.model.ts   # MongoDB: message search index
│       │
│       └── socket/
│           └── index.ts             # Socket.IO: real-time event handlers
│
├── client/                          # ── FRONTEND ──
│   ├── package.json                 # Dependencies + scripts
│   ├── vite.config.ts               # Vite build configuration
│   ├── tsconfig.json                # TypeScript config
│   ├── index.html                   # HTML entry point
│   │
│   └── src/
│       ├── main.tsx                 # React entry point
│       ├── App.tsx                  # Router + providers setup
│       ├── index.css                # Global CSS (Tailwind import + animations)
│       │
│       ├── types/
│       │   └── index.ts             # Frontend TypeScript interfaces
│       │
│       ├── services/
│       │   ├── api.ts               # Axios instance (base URL + interceptors)
│       │   ├── auth.service.ts      # API calls: register, login, me
│       │   ├── chat.service.ts      # API calls: create chats, groups, etc.
│       │   ├── message.service.ts   # API calls: send/fetch/delete messages
│       │   └── user.service.ts      # API calls: update profile
│       │
│       ├── context/
│       │   ├── definitions.ts       # Context objects (for Fast Refresh)
│       │   ├── AuthContext.tsx       # Authentication state provider
│       │   └── SocketContext.tsx     # Socket.IO connection provider
│       │
│       ├── hooks/
│       │   ├── useAuth.ts           # Hook to access AuthContext
│       │   ├── useSocket.ts         # Hook to access SocketContext
│       │   └── useToast.ts          # Hook to access toast notifications
│       │
│       ├── pages/
│       │   ├── Login.tsx            # Login form
│       │   ├── Register.tsx         # Registration form
│       │   └── Chat.tsx             # Main chat page (orchestrator)
│       │
│       └── components/
│           ├── ProtectedRoute.tsx   # Redirects unauthenticated users
│           ├── ChatList.tsx         # Sidebar: list of conversations
│           ├── ChatWindow.tsx       # Chat area: messages + input + emoji
│           ├── MessageBubble.tsx    # Single message bubble + delete
│           ├── CreateGroupModal.tsx # Modal for creating group chats
│           ├── GroupInfoPanel.tsx   # Panel for group management
│           ├── Toast.tsx            # Toast notification provider + UI
│           ├── ConfirmDialog.tsx    # Reusable confirmation modal
│           └── ProfileModal.tsx     # User profile editor modal
```

### Why This Structure?

Every folder has a **single responsibility**:

- **routes/** — "What URL triggers what?"
- **controllers/** — "How do we handle this HTTP request?"
- **services/** — "What's the actual business logic?"
- **models/** — "What does our MongoDB data look like?"
- **middleware/** — "What checks run before the handler?"
- **context/** — "What global state does the React app need?"
- **hooks/** — "How do components access that global state?"
- **pages/** — "What are the top-level views?"
- **components/** — "What reusable UI pieces exist?"
- **services/** (frontend) — "How does the frontend talk to the backend?"

---

## 5. Module 1 — Database Design (PostgreSQL + MongoDB)

### 5.1 Prisma Schema (PostgreSQL)

The Prisma schema is the **single source of truth** for our relational database.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**`generator client`** — tells Prisma to generate a TypeScript client library.
**`datasource db`** — connects to PostgreSQL using the `DATABASE_URL` environment variable.

#### User Model

```prisma
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String   @unique
  password  String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  chatParticipants ChatParticipant[]
  sentMessages     Message[]
  createdGroups    Chat[]  @relation("GroupCreator")

  @@map("users")
}
```

**Line-by-line**:

| Code | What It Does |
|------|-------------|
| `@id` | Primary key |
| `@default(uuid())` | Auto-generate a UUID when creating a user |
| `@unique` | No two users can have the same username/email |
| `@map("created_at")` | Use snake_case in PostgreSQL, camelCase in TypeScript |
| `@@map("users")` | Table name in PostgreSQL will be `users` |
| `ChatParticipant[]` | One user → many chat participations (relation) |
| `@relation("GroupCreator")` | Named relation — differentiates from other Chat relations |

#### Chat Model

```prisma
model Chat {
  id          String   @id @default(uuid())
  isGroup     Boolean  @default(false) @map("is_group")
  name        String?                          // ? means nullable
  createdById String?  @map("created_by_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  createdBy    User?             @relation("GroupCreator", fields: [createdById], references: [id], onDelete: SetNull)
  participants ChatParticipant[]
  messages     Message[]

  @@map("chats")
}
```

**Key design decision**: A single `Chat` model handles BOTH 1-on-1 and group chats.
- `isGroup = false` → 2 participants, no name
- `isGroup = true` → 2+ participants, has a name, has a creator

This avoids having two separate tables/APIs for a very similar concept.

#### ChatParticipant (Junction Table)

```prisma
model ChatParticipant {
  id     String @id @default(uuid())
  chatId String @map("chat_id")
  userId String @map("user_id")
  role   String @default("member")

  chat Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([chatId, userId])
  @@map("chat_participants")
}
```

**Why a junction table?** Users and chats have a **many-to-many** relationship:
- A user can be in many chats
- A chat can have many users

The junction table creates this link. Each row says "User X is in Chat Y with role Z."

`@@unique([chatId, userId])` — a user can only appear in a chat ONCE.
`onDelete: Cascade` — if a chat is deleted, all its participants are too.

#### Message Model

```prisma
model Message {
  id        String   @id @default(uuid())
  content   String
  chatId    String   @map("chat_id")
  senderId  String   @map("sender_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  chat   Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  sender User @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@map("messages")
}
```

Every message belongs to exactly ONE chat and ONE sender. This is a classic foreign key relationship.

### 5.2 Entity Relationship Diagram

```
┌──────────┐          ┌───────────────────┐         ┌──────────┐
│  User    │──────1:N──│ ChatParticipant  │──N:1─────│  Chat   │
│          │          │                   │          │          │
│ id (PK)  │          │ id (PK)          │          │ id (PK)  │
│ username │          │ chatId (FK → Chat)│          │ isGroup  │
│ email    │          │ userId (FK → User)│          │ name     │
│ password │          │ role             │          │ createdBy│
│ createdAt│          └───────────────────┘          │ createdAt│
│ updatedAt│                                        │ updatedAt│
└──────┬───┘                                        └────┬─────┘
       │                                                  │
       │ 1:N (sender)                              1:N    │
       │                                                  │
       │            ┌──────────┐                          │
       └────────────│ Message  │──────────────────────────┘
                    │          │
                    │ id (PK)  │
                    │ content  │
                    │ chatId   │ (FK → Chat)
                    │ senderId │ (FK → User)
                    │ createdAt│
                    └──────────┘
```

### 5.3 MongoDB Models

#### ChatMetadata

```typescript
// What: Stores quick-access metadata about each chat
// Why: Avoids expensive SQL JOINs for the chat list sidebar
interface IChatMetadata {
  chatId: string;
  participantIds: string[];
  isGroup: boolean;
  groupName?: string;
  lastMessage?: {
    content: string;
    senderId: string;
    sentAt: Date;
  };
  metadata?: {
    totalMessages: number;
    createdBy: string;
  };
}
```

#### MessageIndex

```typescript
// What: Search index for finding messages by content
// Why: MongoDB's text search is faster than PostgreSQL's LIKE '%word%'
interface IMessageIndex {
  messageId: string;
  chatId: string;
  senderId: string;
  content: string;
  keywords: string[];      // Pre-extracted individual words
  createdAt: Date;
}
```

### 5.4 Prisma Migrations

Migrations are **version-controlled database changes**:

```bash
# When you change schema.prisma, run:
npx prisma migrate dev --name describe_your_change

# This creates a SQL file in prisma/migrations/ and applies it
# It also regenerates the TypeScript client
```

Every migration is a SQL file that gets applied in order, so your database evolves safely.

---

## 6. Module 2 — Backend Foundation (Express + TypeScript)

### 6.1 Entry Point: server.ts

```typescript
// server.ts — Where everything starts

import { createServer } from 'http';
import app from './app';
import { connectMongoDB, disconnectDatabases } from './config/db';
import { initializeSocket } from './socket';

const startServer = async (): Promise<void> => {
  // Step 1: Connect to MongoDB
  await connectMongoDB();

  // Step 2: Create HTTP server from Express app
  const httpServer = createServer(app);

  // Step 3: Attach Socket.IO
  initializeSocket(httpServer);

  // Step 4: Start listening
  httpServer.listen(5000, () => {
    console.log('🚀 Server running on http://localhost:5000');
  });
};

startServer();
```

**Why `createServer(app)` instead of `app.listen()`?**

Socket.IO needs the raw HTTP server to intercept WebSocket upgrade requests. Express's `app.listen()` creates a server internally but doesn't expose it.

```
app.listen(5000)           → Express creates server internally (no access)
createServer(app)          → We create server ourselves (can pass to Socket.IO)
```

### 6.2 Express App: app.ts

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

// ── Middleware Stack ──
app.use(helmet());                    // Security headers
app.use(cors({ origin: CLIENT_URL, credentials: true })); // Allow frontend
app.use(express.json());              // Parse JSON bodies
app.use(morgan('dev'));               // Log requests

// ── Routes ──
app.use('/api/auth', authRoutes);     // POST /api/auth/login, etc.
app.use('/api/users', userRoutes);    // GET /api/users
app.use('/api/chats', chatRoutes);    // POST /api/chats, etc.
app.use('/api/messages', messageRoutes);

// ── Health Check ──
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// ── Error Handler (MUST be last) ──
app.use(errorHandler);
```

**Understanding Middleware Order**:

1. **Helmet** first — sets security headers on ALL responses
2. **CORS** — enables cross-origin requests (frontend is on a different port)
3. **express.json()** — parses JSON request bodies so `req.body` works
4. **Morgan** — logs every request for debugging
5. **Routes** — your actual API endpoints
6. **Error handler** — catches any errors thrown by routes

### 6.3 Environment Configuration: env.ts

```typescript
import dotenv from 'dotenv';
dotenv.config(); // Load .env file

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
} as const;
```

**Why centralize env vars?**

- All config is in ONE file — easy to audit
- TypeScript types on every variable
- Default values for development
- Other files import `env.PORT` instead of `process.env.PORT`

**The `.env` file** (never committed to git):

```env
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/realtime_chat
MONGODB_URI=mongodb://localhost:27017/realtime_chat
JWT_SECRET=your-super-secret-key-change-this
CLIENT_URL=http://localhost:5173
```

### 6.4 Database Connections: db.ts

```typescript
import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';

// PostgreSQL — Prisma auto-connects on first query
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// MongoDB — explicit connection
export const connectMongoDB = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ MongoDB connected');
};
```

**Why Prisma auto-connects but Mongoose doesn't?**

- **Prisma** follows a "lazy connection" pattern — it connects when the first query is executed
- **Mongoose** requires an explicit `connect()` call — this lets us fail fast if MongoDB is down

### 6.5 Shared Types: types/index.ts

```typescript
// All shared interfaces in one place

export interface UserPayload {
  id: string;
  username: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: UserPayload;  // Attached by auth middleware
}

export interface SocketMessageData {
  chatId: string;
  content: string;
  recipientId?: string;  // For 1-on-1
  isGroup?: boolean;     // For group chats
}
```

**Why centralize types?**

Controllers, services, middleware, and socket handlers all need these types. Defining them in one place prevents drift and duplication.

---

## 7. Module 3 — Authentication System (JWT + Bcrypt)

### 7.1 The Complete Auth Flow

```
                         REGISTRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Client                    Server                    Database
  │                          │                          │
  │ POST /api/auth/register  │                          │
  │ { username, email, pw }  │                          │
  │─────────────────────────►│                          │
  │                          │ Check if user exists     │
  │                          │─────────────────────────►│
  │                          │◄─────────────────────────│
  │                          │                          │
  │                          │ Hash password (bcrypt)   │
  │                          │                          │
  │                          │ Create user record       │
  │                          │─────────────────────────►│
  │                          │◄─────────────────────────│
  │                          │                          │
  │                          │ Generate JWT token       │
  │                          │                          │
  │ { user, token }          │                          │
  │◄─────────────────────────│                          │
  │                          │                          │
  │ Store token in           │                          │
  │ localStorage             │                          │


                            LOGIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Client                    Server                    Database
  │                          │                          │
  │ POST /api/auth/login     │                          │
  │ { email, password }      │                          │
  │─────────────────────────►│                          │
  │                          │ Find user by email       │
  │                          │─────────────────────────►│
  │                          │◄────── user record ──────│
  │                          │                          │
  │                          │ bcrypt.compare(          │
  │                          │   password, user.hash)   │
  │                          │ → true ✓                 │
  │                          │                          │
  │                          │ Generate JWT token       │
  │                          │                          │
  │ { user, token }          │                          │
  │◄─────────────────────────│                          │
  │                          │                          │
  │ Store token in           │                          │
  │ localStorage             │                          │


                    AUTHENTICATED REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Client                    Server                    Database
  │                          │                          │
  │ GET /api/chats           │                          │
  │ Header: Bearer <token>   │                          │
  │─────────────────────────►│                          │
  │                          │ auth middleware:         │
  │                          │ jwt.verify(token)        │
  │                          │ → { id, username, email }│
  │                          │ → req.user = decoded     │
  │                          │                          │
  │                          │ Route handler runs       │
  │                          │ using req.user.id        │
  │                          │─────────────────────────►│
  │                          │◄─────────────────────────│
  │ { chats: [...] }         │                          │
  │◄─────────────────────────│                          │
```

### 7.2 Auth Service: Business Logic

```typescript
// services/auth.service.ts

export class AuthService {

  // Generate a JWT token
  static generateToken(user: UserPayload): string {
    return jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '7d' },
    );
  }

  // Register a new user
  static async register(input: RegisterInput) {
    // 1. Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
    });
    if (existing) throw new Error('User already exists');

    // 2. Hash the password (NEVER store plain text!)
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // 3. Create user in the database
    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        password: hashedPassword,
      },
      select: { id: true, username: true, email: true, createdAt: true },
    });

    // 4. Generate JWT
    const token = this.generateToken({ id: user.id, username: user.username, email: user.email });

    return { user, token };
  }

  // Login
  static async login(input: LoginInput) {
    // 1. Find user by email
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new Error('Invalid credentials');

    // 2. Compare passwords
    const isValid = await bcrypt.compare(input.password, user.password);
    if (!isValid) throw new Error('Invalid credentials');

    // 3. Generate token
    const token = this.generateToken({ id: user.id, username: user.username, email: user.email });

    return {
      user: { id: user.id, username: user.username, email: user.email },
      token,
    };
  }
}
```

**Security Notes**:
- `bcrypt.hash(password, 10)` — the `10` means 2^10 = 1024 iterations of hashing. Makes brute-force attacks very slow.
- We use the same "Invalid credentials" message for both "user not found" and "wrong password" — this prevents **email enumeration** (attackers can't tell if an email exists).
- The `select` clause explicitly excludes the password hash from the returned user object.

### 7.3 Auth Controller: HTTP Layer

```typescript
// controllers/auth.controller.ts

export class AuthController {

  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password } = req.body;

      // Validate input
      if (!username || !email || !password) {
        res.status(400).json({ message: 'All fields are required' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ message: 'Password must be at least 6 characters' });
        return;
      }

      // Delegate to service
      const result = await AuthService.register({ username, email, password });

      // Send success response
      res.status(201).json({
        message: 'Registration successful',
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({ message: error.message }); // 409 Conflict
        return;
      }
      next(error); // Pass to error handler
    }
  }
}
```

**Key Pattern**: The controller does THREE things:
1. **Extract and validate** data from the request
2. **Call the service** for business logic
3. **Send the HTTP response** (with proper status codes)

It does NOT contain any database queries or business rules.

### 7.4 Auth Middleware: Route Protection

```typescript
// middleware/auth.ts

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // 1. Extract token from "Bearer <token>"
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    // 2. Verify the token
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;

    // 3. Attach user data to request
    req.user = decoded;

    next(); // 4. Proceed to route handler
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
```

**Usage in routes**:

```typescript
// Public — anyone can access
router.post('/login', AuthController.login);

// Protected — must have valid JWT
router.get('/me', authenticate, AuthController.me);
//                 ^^^^^^^^^^^^
//                 This runs BEFORE the handler
//                 If no valid token → 401, handler never runs
```

### 7.5 Routes: URL Mapping

```typescript
// routes/auth.routes.ts

const router = Router();

router.post('/register', AuthController.register);  // POST /api/auth/register
router.post('/login',    AuthController.login);      // POST /api/auth/login
router.get('/me',        authenticate, AuthController.me); // GET /api/auth/me

export default router;

// In app.ts:
app.use('/api/auth', authRoutes);
// This means: /api/auth + /register = /api/auth/register
```

---

## 8. Module 4 — Chat & Message APIs

### 8.1 Chat Service: Core Logic

The chat service demonstrates the most complex business logic, especially for groups.

#### Creating a 1-on-1 Chat

```typescript
static async getOrCreateChat(userId: string, participantId: string) {
  // Check if a 1-on-1 chat already exists between these two users
  const existingChat = await prisma.chat.findFirst({
    where: {
      isGroup: false,  // Only look at 1-on-1 chats
      AND: [
        { participants: { some: { userId } } },            // User A is in it
        { participants: { some: { userId: participantId } } }, // User B is in it
      ],
    },
    include: CHAT_INCLUDE,
  });

  if (existingChat) return existingChat; // Don't create duplicates!

  // Create new chat with both users as participants
  const newChat = await prisma.chat.create({
    data: {
      isGroup: false,
      participants: {
        create: [{ userId }, { userId: participantId }],
      },
    },
    include: CHAT_INCLUDE,
  });

  // Also create MongoDB metadata
  await ChatMetadata.create({
    chatId: newChat.id,
    participantIds: [userId, participantId],
    isGroup: false,
  });

  return newChat;
}
```

**Why "get or create"?** If users A and B already have a chat, clicking "start chat" again should open the existing one, not create a duplicate.

#### Creating a Group Chat

```typescript
static async createGroup(
  creatorId: string,
  name: string,
  participantIds: string[],
) {
  // Ensure creator is included, remove duplicates
  const allIds = [...new Set([creatorId, ...participantIds])];

  const group = await prisma.chat.create({
    data: {
      isGroup: true,
      name,
      createdById: creatorId,
      participants: {
        create: allIds.map((uid) => ({
          userId: uid,
          role: uid === creatorId ? 'admin' : 'member', // Creator is admin
        })),
      },
    },
    include: CHAT_INCLUDE,
  });

  // Sync MongoDB
  await ChatMetadata.create({
    chatId: group.id,
    participantIds: allIds,
    isGroup: true,
    groupName: name,
  });

  return group;
}
```

**Key decisions**:
- **Creator is always admin** — automatic, not manual
- **`[...new Set([creatorId, ...participantIds])]`** — deduplicates. If the creator accidentally includes their own ID, it won't fail.
- **Both databases updated** — PostgreSQL has the chat, MongoDB has the metadata

### 8.2 Message Service: Dual-Database Write

```typescript
static async sendMessage(chatId: string, senderId: string, content: string) {
  // 1. Save to PostgreSQL (authoritative source)
  const message = await prisma.message.create({
    data: { chatId, senderId, content },
    include: {
      sender: { select: { id: true, username: true, email: true } },
    },
  });

  // 2. Update chat timestamp (for sorting chat list)
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  // 3. Update MongoDB metadata (last message preview)
  await ChatMetadata.findOneAndUpdate(
    { chatId },
    {
      lastMessage: { content, senderId, sentAt: message.createdAt },
      $inc: { 'metadata.totalMessages': 1 },
    },
    { upsert: true },
  );

  // 4. Create search index entry
  await MessageIndex.create({
    messageId: message.id,
    chatId,
    senderId,
    content,
    keywords: content.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
    createdAt: message.createdAt,
  });

  return message;
}
```

**Why update both databases?**

| Database | What's Stored | Why |
|----------|--------------|-----|
| PostgreSQL | The actual message record | Source of truth, foreign key integrity |
| MongoDB `ChatMetadata` | Last message preview | So the chat list sidebar can show "last message" without JOINing messages table |
| MongoDB `MessageIndex` | Searchable keywords | Fast text search without `LIKE '%word%'` on PostgreSQL |

**This method is called from TWO places**:
1. The REST API (`POST /api/messages`)
2. The Socket.IO handler (`socket.on('message:send')`)

Both paths use the same service — no duplicated logic.

### 8.3 Chat Controller: REST Endpoints

```typescript
// All chat endpoints in one controller

// POST /api/chats — create 1-on-1 chat
static async createChat(req, res) { ... }

// GET /api/chats — list user's chats
static async getChats(req, res) { ... }

// POST /api/chats/group — create group
static async createGroup(req, res) { ... }

// PUT /api/chats/:id/rename — rename group
static async renameGroup(req, res) { ... }

// POST /api/chats/:id/members — add member
static async addMember(req, res) { ... }

// DELETE /api/chats/:id/members/:userId — remove member
static async removeMember(req, res) { ... }

// PUT /api/chats/:id/members/:userId/admin — promote to admin
static async makeAdmin(req, res) { ... }

// POST /api/chats/:id/leave — leave group
static async leaveGroup(req, res) { ... }
```

### 8.4 Route Design

```typescript
// routes/chat.routes.ts

const router = Router();

router.post('/',      authenticate, ChatController.createChat);    // 1-on-1
router.get('/',       authenticate, ChatController.getChats);
router.post('/group', authenticate, ChatController.createGroup);   // Group

// ⚠️ IMPORTANT: /group MUST come BEFORE /:id
// Otherwise Express treats "group" as an :id parameter!

router.get('/:id',                    authenticate, ChatController.getChatById);
router.put('/:id/rename',            authenticate, ChatController.renameGroup);
router.post('/:id/members',          authenticate, ChatController.addMember);
router.delete('/:id/members/:userId', authenticate, ChatController.removeMember);
router.put('/:id/members/:userId/admin', authenticate, ChatController.makeAdmin);
router.post('/:id/leave',            authenticate, ChatController.leaveGroup);
```

**Route order matters!** Express matches routes top-to-bottom. If `/:id` were before `/group`, a request to `/api/chats/group` would match `/:id` with `id = "group"`.

---

## 9. Module 5 — Real-Time Engine (Socket.IO)

### 9.1 How WebSockets Differ From HTTP

```
                        HTTP (Request-Response)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Client              Server
  │                    │
  │── GET /messages ──►│     Client initiates
  │◄── { data } ──────│     Server responds
  │    (connection closes)
  │                    │
  │── GET /messages ──►│     Client asks again (polling)
  │◄── { data } ──────│
  │                    │
  ▲ Client must keep asking — wastes bandwidth if nothing changed!


                       WebSocket (Bidirectional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Client              Server
  │                    │
  │── Upgrade req ────►│     Initial HTTP handshake
  │◄── 101 Switching ─│     Connection upgraded
  │                    │
  │◄── new message ───│     Server PUSHES data anytime
  │◄── user online ───│     Without client asking!
  │── typing start ──►│     Client can send too
  │◄── typing start ──│     Server relays to others
  │                    │
  ▲ Connection stays open — instant bidirectional communication!
```

### 9.2 Socket.IO Server Setup

```typescript
// socket/index.ts

const onlineUsers = new Map<string, string>();
// Map: userId → socketId
// "user123" → "abc-socket-id-xyz"

export const initializeSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
    },
  });

  // ── Authentication Middleware ──
  // Runs ONCE per connection (not per event)
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
      socket.data.user = decoded;  // Attach user to socket
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });
```

**Socket.IO authentication** works differently from Express:
- Express: Token in `Authorization` header on EVERY request
- Socket.IO: Token in `handshake.auth` on INITIAL connection only

### 9.3 Connection Handler

```typescript
  io.on('connection', async (socket) => {
    const user: UserPayload = socket.data.user;

    // Track user as online
    onlineUsers.set(user.id, socket.id);

    // Auto-join all group rooms
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

    // Broadcast online status
    io.emit('user:online', { userId: user.id });     // Tell everyone
    socket.emit('users:online', Array.from(onlineUsers.keys())); // Tell this user
```

**Socket.IO Rooms** are like channels:

```
Room: "group:chat-123"
Members: [socketA, socketB, socketC]

io.to("group:chat-123").emit(...)  → sends to ALL in the room
socket.to("group:chat-123").emit(...)  → sends to all EXCEPT the sender
```

### 9.4 Message Handler

```typescript
    socket.on('message:send', async (data: SocketMessageData) => {
      const { chatId, content, recipientId, isGroup } = data;

      // Save message to BOTH databases
      const message = await MessageService.sendMessage(chatId, user.id, content);

      if (isGroup) {
        // GROUP: broadcast to the entire room
        io.to(`group:${chatId}`).emit('message:receive', message);
      } else {
        // 1-ON-1: send to sender + specific recipient
        socket.emit('message:receive', message);  // Echo to sender

        if (recipientId) {
          const recipientSocketId = onlineUsers.get(recipientId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('message:receive', message);
          }
        }
      }
    });
```

**Group vs 1-on-1 delivery**:

```
1-ON-1:
  Sender ──send──► Server ──deliver──► Recipient (specific socket)
                          ──echo────► Sender (own socket)

GROUP:
  Sender ──send──► Server ──broadcast──► Room "group:chat123"
                                         ├── Member A socket
                                         ├── Member B socket
                                         └── Sender socket
```

### 9.5 Typing Indicators

```typescript
    socket.on('typing:start', ({ chatId, recipientId, isGroup }: TypingData) => {
      if (isGroup) {
        // Tell everyone in the group EXCEPT the sender
        socket.to(`group:${chatId}`).emit('typing:start', {
          chatId,
          userId: user.id,
          username: user.username,
        });
      } else if (recipientId) {
        // Tell only the specific recipient
        const recipientSocketId = onlineUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('typing:start', {
            chatId,
            userId: user.id,
          });
        }
      }
    });
```

**Note**: `socket.to()` sends to everyone in the room EXCEPT the sender.
`io.to()` sends to everyone including the target. We use `socket.to()` for typing so you don't see your own "typing..." indicator.

### 9.6 Socket Events Summary

| Event | Direction | Purpose |
|-------|-----------|---------|
| `users:online` | Server → Client | List of all active user IDs (on connect) |
| `user:online` | Server → All | A user came online |
| `user:offline` | Server → All | A user went offline |
| `message:send` | Client → Server | User sends a message |
| `message:receive` | Server → Client(s) | Deliver a message |
| `message:error` | Server → Client | Message failed to send |
| `typing:start` | Both directions | User started typing |
| `typing:stop` | Both directions | User stopped typing |
| `group:join` | Client → Server | Join a group chat room |

---

## 10. Module 6 — Frontend Foundation (React + Vite + Tailwind)

### 10.1 React Entry Point: main.tsx

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

**`StrictMode`** — helps find problems in development by running certain checks twice. Does nothing in production.

### 10.2 App Component: Routing + Providers

```tsx
// App.tsx — the provider tree + router

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

**The Provider Tree** (nesting order matters!):

```
BrowserRouter           → Enables URL-based routing
  └── AuthProvider      → Provides user, token, login(), logout()
         └── SocketProvider  → Provides socket, onlineUsers
                └── Routes   → Renders the correct page component
```

`SocketProvider` is INSIDE `AuthProvider` because the socket connection needs the auth token. The socket connects when `token` changes (user logs in).

### 10.3 Axios API Client: api.ts

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor ──
// Automatically add JWT token to EVERY request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor ──
// Handle 401 (expired/invalid token) globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

**Why interceptors?**

Without interceptors, you'd need to add the token to EVERY single API call:

```typescript
// WITHOUT interceptors — repetitive and error-prone
const response = await axios.get('/api/chats', {
  headers: { Authorization: `Bearer ${token}` },
});

// WITH interceptors — automatic, can't forget
const response = await api.get('/chats'); // Token added automatically!
```

### 10.4 Frontend Services

```typescript
// services/chat.service.ts

export const chatService = {
  // 1-on-1
  async createChat(participantId: string): Promise<Chat> {
    const { data } = await api.post<{ chat: Chat }>('/chats', { participantId });
    return data.chat;
  },

  async getChats(): Promise<Chat[]> {
    const { data } = await api.get<{ chats: Chat[] }>('/chats');
    return data.chats;
  },

  // Groups
  async createGroup(name: string, participantIds: string[]): Promise<Chat> {
    const { data } = await api.post<{ chat: Chat }>('/chats/group', { name, participantIds });
    return data.chat;
  },

  async renameGroup(chatId: string, name: string): Promise<Chat> {
    const { data } = await api.put<{ chat: Chat }>(`/chats/${chatId}/rename`, { name });
    return data.chat;
  },

  async addMember(chatId: string, userId: string): Promise<Chat> {
    const { data } = await api.post<{ chat: Chat }>(`/chats/${chatId}/members`, { userId });
    return data.chat;
  },

  async removeMember(chatId: string, userId: string) {
    const { data } = await api.delete(`/chats/${chatId}/members/${userId}`);
    return data;
  },

  async leaveGroup(chatId: string) {
    const { data } = await api.post(`/chats/${chatId}/leave`);
    return data;
  },

  async makeAdmin(chatId: string, userId: string): Promise<Chat> {
    const { data } = await api.put<{ chat: Chat }>(`/chats/${chatId}/members/${userId}/admin`);
    return data.chat;
  },
};
```

**Pattern**: Each service method:
1. Makes an API call using the pre-configured `api` instance
2. Extracts the data from the response
3. Returns typed data (TypeScript knows the return type)

---

## 11. Module 7 — State Management (Context + Hooks)

### 11.1 The Problem: Prop Drilling

```
Without Context:

App
└── AuthState: { user }
    ├── Navbar → needs user → pass as prop
    ├── Sidebar
    │   └── ChatList → needs user → pass through Sidebar!
    └── Content
        └── ChatWindow → needs user → pass through Content!

Every intermediate component must pass props it doesn't use.
This is called "prop drilling" and it's painful.
```

### 11.2 The Solution: React Context

```
With Context:

AuthProvider (stores user)
├── Navbar → useAuth() → gets user directly
├── Sidebar
│   └── ChatList → useAuth() → gets user directly
└── Content
    └── ChatWindow → useAuth() → gets user directly

ANY component can access auth state. No drilling!
```

### 11.3 Building a Context (Step by Step)

**Step 1 — Define the shape** (types/index.ts):

```typescript
export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

**Step 2 — Create the context object** (context/definitions.ts):

```typescript
import { createContext } from 'react';

// The context object — starts with undefined (no provider yet)
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
```

**Why definitions.ts?** React Fast Refresh requires that a file exports EITHER components OR non-components. If we create the context in the same file as `AuthProvider`, Fast Refresh breaks.

**Step 3 — Create the provider** (context/AuthContext.tsx):

```tsx
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Step 4 — Create the hook** (hooks/useAuth.ts):

```typescript
import { useContext } from 'react';
import { AuthContext } from '../context/definitions';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

**Step 5 — Use it anywhere**:

```tsx
const ChatList = () => {
  const { user, logout } = useAuth();
  return <div>Welcome {user?.username}! <button onClick={logout}>Logout</button></div>;
};
```

### 11.4 Socket Context: Depends on Auth

```tsx
// context/SocketContext.tsx

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();  // ← Uses AUTH context
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!token || !user) return; // Don't connect without auth

    const newSocket = io('http://localhost:5000', {
      auth: { token }, // Send JWT during handshake
    });

    newSocket.on('users:online', (ids) => setOnlineUsers(ids));
    newSocket.on('user:online', ({ userId }) => {
      setOnlineUsers((prev) => prev.includes(userId) ? prev : [...prev, userId]);
    });
    newSocket.on('user:offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    setSocket(newSocket);

    return () => { newSocket.disconnect(); }; // Cleanup on unmount
  }, [token, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
```

**The lifecycle**:

```
User logs in → token set in AuthContext
                    ↓
            SocketProvider sees token change
                    ↓
            Creates new Socket.IO connection with token
                    ↓
            Server authenticates → connection established
                    ↓
            Server sends 'users:online' → onlineUsers updated
                    ↓
            Any component with useSocket() sees online users

User logs out → token cleared
                    ↓
            SocketProvider cleanup: socket.disconnect()
                    ↓
            Server fires 'disconnect' → removes from onlineUsers
                    ↓
            Server broadcasts 'user:offline' to everyone
```

---

## 12. Module 8 — Chat UI Components

### 12.1 Chat.tsx — The Orchestrator

Chat.tsx is the **most important frontend file**. It:
- Holds ALL state (chats, messages, selectedChat, etc.)
- Manages ALL event handlers
- Renders child components with the right props

```tsx
export const Chat = () => {
  const { user, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();

  // ── State ──
  const [chats, setChats] = useState<ChatType[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // ── Effects ──
  // 1. Fetch chats + users on mount
  // 2. Fetch messages when selecting a chat
  // 3. Join group room when selecting a group
  // 4. Listen for real-time messages

  // ── Handlers (passed to child components) ──
  // handleSendMessage, handleStartChat, handleCreateGroup
  // handleRenameGroup, handleAddMember, handleRemoveMember
  // handleMakeAdmin, handleLeaveGroup

  return (
    <div className="flex h-dvh bg-gray-100">
      <ChatList ... />
      <ChatWindow ... />
      {showGroupInfo && <GroupInfoPanel ... />}
      {showCreateGroup && <CreateGroupModal ... />}
    </div>
  );
};
```

**Why one component manages all state?**

This is the **"lifting state up"** pattern. Since ChatList and ChatWindow both need to know about `selectedChat`, `chats`, and `messages`, the state lives in their common parent.

### 12.2 ChatList — Sidebar Component

```tsx
interface ChatListProps {
  chats: Chat[];
  users: User[];
  selectedChat: Chat | null;
  currentUserId: string;
  onlineUsers: string[];
  onSelectChat: (chat: Chat) => void;
  onStartChat: (userId: string) => void;
  onCreateGroup: () => void;   // Opens the Create Group modal
  onLogout: () => void;
}
```

**How it renders different chat types**:

```tsx
// For each chat in the list:
{chats.map((chat) => {
  const isGroup = chat.isGroup;
  const displayName = isGroup
    ? chat.name || 'Unnamed Group'
    : getOtherParticipant(chat)?.username || 'Unknown';
  const avatarColor = isGroup ? 'bg-purple-100' : 'bg-blue-100';

  return (
    <div onClick={() => onSelectChat(chat)}>
      <div className={avatarColor}>{displayName[0]}</div>
      <span>{displayName}</span>
      {isGroup && <span className="badge">Group</span>}
    </div>
  );
})}
```

### 12.3 ChatWindow — Message Area

```tsx
interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  currentUserId: string;
  onlineUsers: string[];
  onSendMessage: (content: string) => void;
  socket: Socket | null;
  showBackButton?: boolean;       // Mobile only
  onBack?: () => void;           // Mobile only
  onOpenGroupInfo?: () => void;  // Group only
}
```

**Typing indicator logic** (multiuser support for groups):

```tsx
// Map of userId → username for people currently typing
const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());

// Build display text
const typingText = (() => {
  if (typingUsers.size === 0) return null;
  const names = Array.from(typingUsers.values());
  if (names.length === 1) return `${names[0]} is typing...`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
  return `${names[0]} and ${names.length - 1} others are typing...`;
})();
```

### 12.4 MessageBubble — Individual Message

```tsx
interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean; // true for group chats
}

export const MessageBubble = ({ message, isOwn, showSenderName = false }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
    <div
      className={`max-w-xs px-4 py-2 rounded-2xl ${
        isOwn
          ? 'bg-blue-500 text-white rounded-br-sm'    // Own: blue, right
          : 'bg-white text-gray-800 rounded-bl-sm'    // Other: white, left
      }`}
    >
      {!isOwn && showSenderName && (
        <p className="text-xs font-semibold text-blue-600">{message.sender?.username}</p>
      )}
      <p>{message.content}</p>
      <p className="text-xs">{formattedTime}</p>
    </div>
  </div>
);
```

**Why `showSenderName`?** In 1-on-1 chats, you always know who sent the message (it's the other person). In groups, multiple people send messages, so we show the sender's name above each bubble.

### 12.5 ProtectedRoute — Auth Guard

```tsx
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user)   return <Navigate to="/login" replace />;

  return children;
};
```

Used in the router: `<Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />`

If the user isn't logged in, they're automatically redirected to `/login` instead of seeing the chat page.

---

## 13. Module 9 — Group Chat Feature (Full Stack)

### 13.1 What Makes Groups Different

| Aspect | 1-on-1 Chat | Group Chat |
|--------|------------|------------|
| Participants | Exactly 2 | 2 or more |
| Name | Shows other user's name | Has a custom group name |
| Roles | None | Admin / Member |
| Message delivery | Direct (to specific socket) | Broadcast (to room) |
| Typing | One person typing | Multiple people typing |
| UI | Blue avatar | Purple avatar |
| Management | Not needed | Add/remove members, rename |

### 13.2 Database Changes for Groups

```prisma
// Added to Chat model:
isGroup     Boolean  @default(false)   // Differentiates group from 1-on-1
name        String?                     // Group name
createdById String?                     // Who created the group

// Added to ChatParticipant model:
role   String @default("member")        // "admin" or "member"
```

### 13.3 Backend: Group Endpoints

```
POST   /api/chats/group                 → Create a group
PUT    /api/chats/:id/rename            → Rename (admin only)
POST   /api/chats/:id/members           → Add member (admin only)
DELETE /api/chats/:id/members/:userId   → Remove member (admin only)
PUT    /api/chats/:id/members/:userId/admin → Promote to admin
POST   /api/chats/:id/leave             → Leave group
```

### 13.4 Socket.IO: Room-Based Broadcasting

```typescript
// When a user connects, auto-join their group rooms:
const userChats = await prisma.chat.findMany({
  where: { isGroup: true, participants: { some: { userId: user.id } } },
});
for (const chat of userChats) {
  socket.join(`group:${chat.id}`);
}

// When sending a group message:
io.to(`group:${chatId}`).emit('message:receive', message);
// This sends to ALL sockets in the room — all group members
```

### 13.5 Frontend: Create Group Flow

```
User clicks "New Group Chat" in ChatList
        ↓
showCreateGroup = true → CreateGroupModal renders
        ↓
User enters name + selects participants
        ↓
handleCreateGroup(name, participantIds) called
        ↓
chatService.createGroup() → POST /api/chats/group
        ↓
Server creates group + returns full chat object
        ↓
Chat added to chats[], selected, modal closes
        ↓
socket.emit('group:join', chatId) → joins the room
        ↓
User can now send messages to the group!
```

### 13.6 Frontend: Group Management Flow

```
User clicks "ℹ" button in ChatWindow header
        ↓
showGroupInfo = true → GroupInfoPanel renders (slide-in animation)
        ↓
Panel shows: group name, member list, management buttons
        ↓
Admin actions:
  ├── Rename → handleRenameGroup → PUT /api/chats/:id/rename
  ├── Add member → handleAddMember → POST /api/chats/:id/members
  ├── Remove member → handleRemoveMember → DELETE /api/chats/:id/members/:userId
  └── Promote to admin → handleMakeAdmin → PUT /api/chats/:id/members/:userId/admin

Any member:
  └── Leave group → handleLeaveGroup → POST /api/chats/:id/leave
                    → removes chat from list, deselects
```

### 13.7 Group Message Send Flow

```typescript
// In Chat.tsx handleSendMessage:

if (selectedChat.isGroup) {
  socket.emit('message:send', {
    chatId: selectedChat.id,
    content,
    isGroup: true,        // Tell server to broadcast to room
  });
} else {
  socket.emit('message:send', {
    chatId: selectedChat.id,
    content,
    recipientId: otherParticipant.userId, // Tell server who to send to
  });
}
```

---

## 14. Module 10 — Responsive Design

### 14.1 The Mobile Challenge

On desktop, the sidebar and chat window sit side-by-side:

```
┌──────────┬────────────────────────────┐
│          │                            │
│  Chat    │      Chat Window           │
│  List    │      (messages)            │
│          │                            │
│          │                            │
└──────────┴────────────────────────────┘
```

On mobile, there's not enough horizontal space. We show ONE at a time:

```
┌──────────┐     ┌────────────────────────┐
│          │     │ ◄ Back                  │
│  Chat    │ or  │                        │
│  List    │     │   Chat Window          │
│          │     │   (messages)           │
│          │     │                        │
└──────────┘     └────────────────────────┘
```

### 14.2 How It Works

```tsx
// Track screen size
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// Conditional rendering
{isMobile ? (
  selectedChat ? (
    <ChatWindow ... showBackButton onBack={handleBackToList} />
  ) : (
    <ChatList ... />
  )
) : (
  <>
    <ChatList ... />
    <ChatWindow ... />
  </>
)}
```

### 14.3 Tailwind Responsive Utilities

```tsx
// Padding: 12px on mobile, 16px on tablet+
<div className="p-3 md:p-4">

// Max width: xs on mobile, md on large screens
<div className="max-w-xs lg:max-w-md">

// Hidden on mobile, visible on desktop
<div className="hidden md:block">

// Full width on mobile, fixed width on desktop
<div className="w-full md:w-80">
```

**Breakpoints**: `sm` = 640px, `md` = 768px, `lg` = 1024px, `xl` = 1280px

---

## 15. Module 11 — Production Hardening & UX Improvements

This module covers **11 improvements** that take the app from a working prototype to a more robust, user-friendly application. Each section explains the *why*, the *how*, and the actual code.

---

### 15.1 CORS Lock-Down & Body Size Limits

**Problem**: `app.use(cors())` allows **any** website to call your API. This is fine during development but dangerous in production — a malicious site could make authenticated requests on behalf of your users.

**Solution**: Restrict CORS to your frontend's origin and cap request body sizes to prevent abuse.

```typescript
// server/src/app.ts

// CORS — only allow requests from our frontend
app.use(
  cors({
    origin: env.CLIENT_URL, // e.g., "http://localhost:5173"
    credentials: true,       // Allow cookies/auth headers
  }),
);

// Body Parsing — limit payload size to 10KB
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

**Why 10KB?** Chat messages are short text. A 10KB limit prevents attackers from flooding your server with multi-megabyte JSON payloads while being more than enough for normal use.

---

### 15.2 Environment Variable Validation

**Problem**: If you forget to set `DATABASE_URL` in your `.env` file, the app starts up but crashes later with a cryptic Prisma error.

**Solution**: Validate all critical environment variables **at startup** and fail immediately with clear error messages.

```typescript
// server/src/config/env.ts

(function validateEnv() {
  const errors: string[] = [];

  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL is required (PostgreSQL connection string)');
  }
  if (!env.MONGODB_URI) {
    errors.push('MONGODB_URI is required (MongoDB connection string)');
  }
  if (
    env.NODE_ENV === 'production' &&
    env.JWT_SECRET === 'default-secret-change-me'
  ) {
    errors.push('JWT_SECRET must be set in production (do not use the default)');
  }

  if (errors.length > 0) {
    console.error('\n❌ Environment validation failed:');
    errors.forEach((e) => console.error(`   • ${e}`));
    console.error('\nPlease check your .env file and try again.\n');
    process.exit(1);
  }
})();
```

**Key concept**: *Fail fast* — it's better to crash immediately with a clear message than to start running and fail later with a confusing error.

---

### 15.3 Socket.IO Authorization & Multi-Tab Support

#### Authorization on `message:send`

**Problem**: Any connected socket could send messages to any chat, even ones they don't belong to.

**Solution**: Verify the user is a participant before saving the message:

```typescript
// server/src/socket/index.ts — inside message:send handler

// Authorization: verify user is a participant in this chat
const participant = await prisma.chatParticipant.findUnique({
  where: { chatId_userId: { chatId, userId: user.id } },
});
if (!participant) {
  socket.emit('message:error', { error: 'You are not a member of this chat' });
  return;
}
```

#### Multi-Tab Tracking

**Problem**: If a user opens the app in two browser tabs and closes one, they appear offline (because that socket disconnected).

**Solution**: Track a **Set of socket IDs** per user instead of a single socket ID:

```typescript
// userId → Set<socketId>  (supports multiple tabs/devices)
const onlineUsers = new Map<string, Set<string>>();

// On connect: add this socket to the user's set
if (!onlineUsers.has(user.id)) {
  onlineUsers.set(user.id, new Set());
}
onlineUsers.get(user.id)!.add(socket.id);

// On disconnect: only mark offline when ALL tabs are closed
socket.on('disconnect', () => {
  const sockets = onlineUsers.get(user.id);
  if (sockets) {
    sockets.delete(socket.id);
    if (sockets.size === 0) {
      onlineUsers.delete(user.id);
      io.emit('user:offline', { userId: user.id });
    }
  }
});
```

**Why a Set?** `Set` automatically prevents duplicate socket IDs and provides O(1) add/delete/lookup.

---

### 15.4 Message Deletion (Soft Delete)

Instead of permanently removing messages, we use **soft deletion** — setting a `deletedAt` timestamp and replacing the content. The message row stays in the database for audit purposes, but the UI shows "This message was deleted".

#### Database Schema Change

```prisma
// server/prisma/schema.prisma

model Message {
  // ... existing fields ...
  deletedAt DateTime? @map("deleted_at")  // null = active, set = deleted
}
```

#### Service Layer

```typescript
// server/src/services/message.service.ts

static async deleteMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) return null;
  if (message.senderId !== userId) return null; // Only sender can delete

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date(),
      content: 'This message was deleted',
    },
    include: { sender: { select: { id: true, username: true, email: true } } },
  });

  // Remove from MongoDB search index too
  await MessageIndex.deleteOne({ messageId });
  return updated;
}
```

#### REST Endpoint

```typescript
// server/src/routes/message.routes.ts
router.delete('/:messageId', authenticate, MessageController.deleteMessage);
```

#### Socket.IO Event

A new `message:delete` event lets deletions happen in real time:

```typescript
// server/src/socket/index.ts

socket.on('message:delete', async ({ messageId, chatId, isGroup, recipientId }) => {
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
});
```

#### Frontend: MessageBubble Delete Button

```tsx
// client/src/components/MessageBubble.tsx

// Hover-to-reveal delete button (own messages only)
{isOwn && !isDeleted && onDelete && hovered && (
  <button
    onClick={onDelete}
    className="self-center mr-1 p-1.5 rounded-full text-gray-400
               hover:text-red-500 hover:bg-red-50 transition-colors"
    title="Delete message"
  >
    🗑️
  </button>
)}

// Deleted message styling
{isDeleted ? (
  <p className="text-sm italic">🚫 This message was deleted</p>
) : (
  <p className="wrap-break-word text-sm">{message.content}</p>
)}
```

---

### 15.5 REST API Authorization Checks

**Problem**: The API endpoints didn't verify that the requesting user actually belongs to the chat they're querying.

**Solution**: A reusable `verifyMembership()` helper in the message controller:

```typescript
// server/src/controllers/message.controller.ts

async function verifyMembership(
  req: AuthRequest,
  res: Response,
  chatId: string,
): Promise<boolean> {
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.user!.id } },
  });
  if (!participant) {
    res.status(403).json({ message: 'You are not a member of this chat' });
    return false;
  }
  return true;
}

// Usage in every handler:
static async getChatMessages(req, res, next) {
  const { chatId } = req.params;
  if (!(await verifyMembership(req, res, chatId))) return;
  // ... proceed normally
}
```

---

### 15.6 Database Indexes

Indexes speed up frequent queries by letting the database skip scanning every row.

```prisma
// server/prisma/schema.prisma

model ChatParticipant {
  // ...
  @@index([userId])              // "Which chats does this user belong to?"
}

model Message {
  // ...
  @@index([chatId, createdAt])   // Paginated messages per chat
  @@index([senderId])            // "Messages sent by user"
}
```

**Without indexes**: Every query scans the entire table (O(n)).
**With indexes**: The database jumps directly to the matching rows (O(log n)).

Apply the migration:

```bash
cd server
npx prisma migrate dev --name add-indexes
```

---

### 15.7 Toast Notifications

Replace `console.error` with user-visible notifications. The implementation uses React Context + Provider pattern.

#### Context & Hook

```typescript
// client/src/hooks/useToast.ts

export interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
```

#### Provider Component

```tsx
// client/src/components/Toast.tsx

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Fixed top-right container */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-100 flex flex-col gap-2">
          {toasts.map((item) => (
            <SingleToast key={item.id} item={item} onRemove={removeToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};
```

Each toast auto-dismisses after 4 seconds and supports 4 variants: `success` (green), `error` (red), `warning` (amber), `info` (blue).

#### Wrap the App

```tsx
// client/src/App.tsx
<ToastProvider>
  <Routes>...</Routes>
</ToastProvider>
```

#### Usage

```tsx
const { showToast } = useToast();

// Replace console.error:
showToast('Failed to load chats. Please refresh the page.', 'error');

// Success feedback:
showToast('Profile updated successfully', 'success');
```

**Why a separate `useToast.ts` file?** React's Fast Refresh requires that files exporting React components don't also export hooks or non-component values. Separating the Context and hook into their own file avoids the warning.

---

### 15.8 Confirmation Dialogs

Destructive actions — deleting messages, removing members, leaving groups — should require explicit confirmation.

```tsx
// client/src/components/ConfirmDialog.tsx

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

export const ConfirmDialog = ({ title, message, confirmLabel, onConfirm, onCancel, variant = 'danger' }) => (
  <div className="fixed inset-0 z-90 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
    <div className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6">
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onConfirm} className="bg-red-500 text-white">{confirmLabel}</button>
    </div>
  </div>
);
```

Usage pattern with state:

```tsx
// In Chat.tsx
const [confirmDialog, setConfirmDialog] = useState<{
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
} | null>(null);

// Trigger:
setConfirmDialog({
  title: 'Delete Message',
  message: 'Are you sure? This cannot be undone.',
  confirmLabel: 'Delete',
  onConfirm: () => {
    setConfirmDialog(null);
    socket.emit('message:delete', { messageId, chatId, ... });
  },
});

// Render:
{confirmDialog && (
  <ConfirmDialog
    {...confirmDialog}
    onCancel={() => setConfirmDialog(null)}
  />
)}
```

---

### 15.9 Emoji Picker

A lightweight, dependency-free emoji picker built into the chat input area.

```tsx
// client/src/components/ChatWindow.tsx

const EMOJI_LIST = [
  '😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡',
  '👍', '👎', '❤️', '🔥', '🎉', '✅', '👋', '🙏',
  '😊', '😏', '🤗', '😴', '🤯', '😱', '🥳', '💪',
  '👏', '🤝', '💯', '⭐', '🌟', '✨', '💬', '📝',
];

// Toggle button
<button onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>

// Dropdown grid (anchored above the input)
{showEmojiPicker && (
  <div className="absolute bottom-12 left-0 bg-white border rounded-xl shadow-xl p-3 w-72 z-50">
    <div className="grid grid-cols-8 gap-1">
      {EMOJI_LIST.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            setInputValue((prev) => prev + emoji);
            setShowEmojiPicker(false);
          }}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
        >
          {emoji}
        </button>
      ))}
    </div>
  </div>
)}
```

**Outside-click dismissal** uses a `useEffect` with `mousedown` listener and a ref.

---

### 15.10 Typing Indicator Debounce

**Problem**: Without debouncing, every keystroke emits a `typing:start` event — flooding the socket server.

**Solution**: Emit `typing:start` **once**, then set a 2-second timeout. If the user keeps typing, the timeout resets. When they stop, `typing:stop` fires.

```tsx
// client/src/components/ChatWindow.tsx

const [isTyping, setIsTyping] = useState(false);
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleInputChange = (value: string) => {
  setInputValue(value);

  // Emit typing:start only once (not on every keystroke)
  if (!isTyping) {
    setIsTyping(true);
    emitTypingStart();
  }

  // Reset the stop timer
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    setIsTyping(false);
    emitTypingStop();
  }, 2000);
};
```

**Before debounce**: typing "hello" emits 5 `typing:start` events.
**After debounce**: typing "hello" emits 1 `typing:start` and 1 `typing:stop` (after 2s of silence).

---

### 15.11 Notification Sounds

Play a short beep when a message arrives from another user, using the **Web Audio API** (no audio file needed).

```tsx
// client/src/pages/Chat.tsx

const playNotificationSound = () => {
  try {
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 800;         // 800Hz tone
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioCtx.currentTime + 0.3,              // Fade over 300ms
    );
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch {
    // Audio not available — silently ignore
  }
};

// In the message handler:
if (message.senderId !== user?.id) {
  playNotificationSound();
}
```

**Why Web Audio API instead of an `<audio>` tag?** No external audio file needed, works in all modern browsers, and gives programmatic control over frequency and volume.

---

### 15.12 User Profile System

#### Backend: Schema, Service & Route

```prisma
// server/prisma/schema.prisma
model User {
  // ... existing fields ...
  avatar    String?    // Profile picture URL
  bio       String?    // Short biography
}
```

```typescript
// server/src/services/user.service.ts
static async updateProfile(
  userId: string,
  data: { username?: string; avatar?: string; bio?: string },
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: SAFE_USER_SELECT, // Never return password
  });
}
```

```typescript
// server/src/routes/user.routes.ts
router.put('/profile', authenticate, UserController.updateProfile);
```

#### Frontend: ProfileModal Component

```tsx
// client/src/components/ProfileModal.tsx

export const ProfileModal = ({ onClose }) => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const [username, setUsername] = useState(user?.username || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [bio, setBio] = useState(user?.bio || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updatedUser = await userService.updateProfile({
      username: username.trim(),
      avatar: avatar.trim() || undefined,
      bio: bio.trim() || undefined,
    });
    setUser(updatedUser);
    showToast('Profile updated successfully', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Avatar preview, username, avatar URL, and bio fields */}
      <form onSubmit={handleSubmit}>...</form>
    </div>
  );
};
```

The `setUser` function was added to `AuthContext` so the profile modal can update the user state immediately after saving.

#### Frontend: API Service

```typescript
// client/src/services/user.service.ts

export const userService = {
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await api.put('/users/profile', data);
    return response.data.data;
  },
};
```

---

### 15.13 Summary of All Socket.IO Events

After all improvements, the complete event map is:

| Direction | Event | Purpose |
|-----------|-------|---------|
| Client → Server | `message:send` | Send a message (with auth check) |
| Client → Server | `message:delete` | Delete own message |
| Client → Server | `typing:start` | Notify typing started  |
| Client → Server | `typing:stop` | Notify typing stopped |
| Client → Server | `group:join` | Join a group room |
| Server → Client | `message:receive` | New message arrived |
| Server → Client | `message:deleted` | A message was soft-deleted |
| Server → Client | `message:error` | Something went wrong |
| Server → Client | `typing:start` | Someone started typing |
| Server → Client | `typing:stop` | Someone stopped typing |
| Server → Client | `user:online` | A user came online |
| Server → Client | `user:offline` | A user went offline |
| Server → Client | `users:online` | Full list of online users (on connect) |
| Server → Client | `group:updated` | Group metadata changed |

---

## 16. Key Patterns & Best Practices

### 16.1 Separation of Concerns

Every file does ONE thing:

| File | Responsibility |
|------|---------------|
| `routes/*.ts` | URL → Handler mapping |
| `controllers/*.ts` | HTTP request/response handling |
| `services/*.ts` | Business logic + database queries |
| `middleware/*.ts` | Cross-cutting concerns (auth, errors) |
| `models/*.ts` | MongoDB schema definitions |
| `context/*.tsx` | React global state |
| `hooks/*.ts` | Context access helpers |
| `services/*.ts` (frontend) | API call wrappers |
| `pages/*.tsx` | Top-level views + state management |
| `components/*.tsx` | Reusable UI pieces |

### 16.2 Error Handling Strategy

**Backend**: Three layers of error handling:

```
1. Controller validation → 400 Bad Request
   if (!email) res.status(400).json({ message: 'Email required' });

2. Service business errors → Thrown as Error, caught by controller
   throw new Error('User already exists'); → caught → 409 Conflict

3. Unexpected errors → Global error handler
   next(error) → errorHandler middleware → 500 Internal Server Error
```

**Frontend**: Two layers:

```
1. API interceptor → 401 errors auto-redirect to login
2. try/catch in handlers → log error, show fallback
```

### 16.3 Avoiding Duplicates

Several techniques prevent data inconsistency:

```typescript
// Database: unique constraint
@@unique([chatId, userId])  // Can't add same user twice

// JavaScript: Set for deduplication
const allIds = [...new Set([creatorId, ...participantIds])];

// React: check before adding to state
setChats((prev) => {
  if (prev.some((c) => c.id === chat.id)) return prev; // Already exists
  return [chat, ...prev];
});

// Socket.IO: check before adding message
setMessages((prev) => {
  if (prev.some((m) => m.id === message.id)) return prev; // Avoid duplicate
  return [...prev, message];
});
```

### 16.4 Security Best Practices Used

| Practice | Implementation |
|----------|---------------|
| Password hashing | Bcrypt with 10 salt rounds |
| Token-based auth | JWT with 7-day expiry |
| Input validation | Controller checks before processing |
| SQL injection prevention | Prisma parameterized queries |
| XSS prevention | React auto-escapes JSX content |
| CORS | Whitelist only the frontend URL |
| Security headers | Helmet middleware |
| No password in responses | Prisma `select` excludes password |
| Generic error messages | "Invalid credentials" (not "wrong password") |

### 16.5 Performance Patterns

```typescript
// 1. Parallel fetching
const [chats, users] = await Promise.all([
  chatService.getChats(),
  api.get('/users'),
]);

// 2. Memoized callbacks (prevent child re-renders)
const handleSend = useCallback((content: string) => {
  socket.emit('message:send', { ... });
}, [socket, selectedChat]);

// 3. MongoDB upsert (create or update in one query)
await ChatMetadata.findOneAndUpdate(
  { chatId },       // Find
  { lastMessage },  // Update
  { upsert: true }, // Create if not found
);

// 4. Prisma include (fetch related data in one query, no N+1)
prisma.chat.findMany({
  include: {
    participants: { include: { user: true } },
    messages: { take: 1, orderBy: { createdAt: 'desc' } },
  },
});
```

---

## 17. Data Flow Diagrams

### 17.1 Sending a Message (1-on-1)

```
User types "Hello" → clicks Send
        │
        ▼
ChatWindow.handleSubmit()
  → onSendMessage("Hello")
        │
        ▼
Chat.handleSendMessage("Hello")
  → socket.emit('message:send', {
      chatId: "chat-123",
      content: "Hello",
      recipientId: "user-456"
    })
        │
        ▼ (WebSocket)
Server socket handler
  → MessageService.sendMessage("chat-123", "user-789", "Hello")
  │    ├── prisma.message.create(...)      → PostgreSQL
  │    ├── prisma.chat.update(updatedAt)   → PostgreSQL
  │    ├── ChatMetadata.findOneAndUpdate() → MongoDB
  │    └── MessageIndex.create(...)        → MongoDB
  │
  → socket.emit('message:receive', message)          → Sender
  → io.to(recipientSocketId).emit('message:receive') → Recipient
        │
        ▼
Both clients: socket.on('message:receive')
  → setMessages(prev => [...prev, message])
  → setChats(prev => update chat preview)
        │
        ▼
React re-renders: new message appears in ChatWindow
```

### 17.2 Sending a Message (Group)

```
User types "Hello team" → clicks Send
        │
        ▼
Chat.handleSendMessage("Hello team")
  → socket.emit('message:send', {
      chatId: "group-123",
      content: "Hello team",
      isGroup: true          ← Key difference
    })
        │
        ▼ (WebSocket)
Server socket handler
  → MessageService.sendMessage(...)      → Both databases
  → io.to("group:group-123").emit(...)   → ALL members in room
        │
        ▼
ALL group member clients:
  → socket.on('message:receive')
  → Message appears with sender name (showSenderName={true})
```

### 17.3 Login & Socket Connection

```
User enters email + password → clicks Login
        │
        ▼
Login.tsx → authService.login(email, password)
  → POST /api/auth/login
        │
        ▼
Server: AuthController.login → AuthService.login
  → prisma.user.findUnique({ email })
  → bcrypt.compare(password, hash)
  → jwt.sign({ id, username, email })
  → Response: { user, token }
        │
        ▼
AuthContext: setUser(user), setToken(token)
  → localStorage.setItem('token', token)
        │
        ▼
SocketProvider: useEffect detects token changed
  → io(SERVER_URL, { auth: { token } })
        │
        ▼ (WebSocket handshake)
Server: io.use() middleware
  → jwt.verify(token)
  → socket.data.user = decoded
  → next() ✓
        │
        ▼
Server: io.on('connection')
  → onlineUsers.set(userId, socketId)
  → Auto-join group rooms
  → io.emit('user:online', { userId })
  → socket.emit('users:online', [...])
        │
        ▼
All clients: SocketContext updates onlineUsers
  → Green dots appear next to online users
```

---

## 18. Common Pitfalls & Debugging

### 18.1 CORS Errors

```
Error: Access to XMLHttpRequest at 'http://localhost:5000' from
origin 'http://localhost:5173' has been blocked by CORS policy
```

**Cause**: Backend isn't allowing requests from the frontend origin.
**Fix**: Set `CLIENT_URL` env variable to `http://localhost:5173`.

### 18.2 "Database does not exist"

```
Error: P1003: Database `realtime_chat` does not exist
```

**Fix**: Create the database manually:
```bash
psql -U postgres
CREATE DATABASE realtime_chat;
\q
```

### 18.3 Socket Not Connecting

**Symptoms**: No green dots, messages don't appear in real-time.
**Check**:
1. Is `VITE_SOCKET_URL` set correctly?
2. Is the token being sent? Check `socket.handshake.auth` on server.
3. Are there CORS errors in the browser console?

### 18.4 Messages Not Appearing

**Debug checklist**:
1. **Server receives message?** Check server console for `message:send` event.
2. **Database saved?** Check PostgreSQL for new message record.
3. **Socket emitted?** Add `console.log` before `io.to().emit()`.
4. **Client received?** Check browser console for `message:receive` event.
5. **State updated?** React DevTools → check `messages` state.

### 18.5 TypeScript Errors

**Common issues**:

```typescript
// 1. "Property 'user' does not exist on type 'Request'"
// Fix: Use AuthRequest instead of Request
static async handler(req: AuthRequest, res: Response) { ... }

// 2. "Type 'string | undefined' is not assignable to type 'string'"
// Fix: Use optional chaining + nullish coalescing
const name = chat.name ?? 'Unknown';
const username = user?.username || 'Unknown';

// 3. "Argument of type '...' is not assignable to parameter of type '...'"
// Fix: Check that your return types match. If a service returns
// { chat, message }, destructure correctly in the handler.
```

### 18.6 React Fast Refresh Warning

```
Warning: Fast Refresh only works when a file only exports components.
```

**Fix**: Separate `createContext()` calls into a `definitions.ts` file that exports ONLY the context objects (not components).

---

## 19. Glossary of Terms

| Term | Meaning |
|------|---------|
| **API** | Application Programming Interface — how systems communicate |
| **ACID** | Atomicity, Consistency, Isolation, Durability — database transaction guarantees |
| **Bcrypt** | Password hashing algorithm |
| **CORS** | Cross-Origin Resource Sharing — browser security for cross-domain requests |
| **Context (React)** | Mechanism to share state without prop drilling |
| **Debounce** | Delay execution until input stops for a set period — prevents flooding |
| **DTO** | Data Transfer Object — shape of data passed between layers |
| **Express** | Node.js web framework for building APIs |
| **Fail Fast** | Crash immediately with a clear error instead of running in a broken state |
| **Foreign Key** | A field that references another table's primary key |
| **Hook (React)** | Function starting with `use` that accesses React features |
| **Index (Database)** | Data structure that speeds up queries at the cost of extra storage |
| **Interceptor** | Code that runs before/after every HTTP request (Axios) |
| **JSX** | JavaScript XML — HTML-like syntax in React components |
| **JWT** | JSON Web Token — compact token for authentication |
| **Junction Table** | Links two tables in a many-to-many relationship |
| **Middleware** | Code that runs between request and response in Express |
| **Migration** | Version-controlled database schema change |
| **Mongoose** | MongoDB ODM for Node.js |
| **ODM** | Object-Document Mapper — maps code objects to MongoDB documents |
| **ORM** | Object-Relational Mapper — maps code objects to SQL tables |
| **Prisma** | TypeScript-first ORM for PostgreSQL/MySQL/SQLite |
| **Prop Drilling** | Passing props through many layers of components |
| **Provider (React)** | Component that makes context available to descendants |
| **REST** | Representational State Transfer — API design style using HTTP methods |
| **Room (Socket.IO)** | A channel that multiple sockets can join |
| **Salt** | Random data added before hashing to prevent rainbow table attacks |
| **Socket** | An open connection between client and server |
| **Soft Delete** | Marking a record as deleted (via timestamp) instead of removing it from the database |
| **Toast Notification** | A brief, auto-dismissing popup message to give user feedback |
| **UUID** | Universally Unique Identifier — 128-bit random ID |
| **Upsert** | Update if exists, insert if not |
| **Vite** | Modern frontend build tool |
| **Web Audio API** | Browser API for generating and processing audio programmatically |
| **WebSocket** | Protocol for persistent, bidirectional client-server communication |

---

## Quick Reference: npm Scripts

### Server

```bash
cd server
npm run dev          # Start with auto-reload (tsx watch)
npm run build        # Compile TypeScript to JavaScript
npm start            # Run compiled code (production)
npx prisma studio    # Visual database browser
npx prisma migrate dev --name <name>  # Create + apply migration
```

### Client

```bash
cd client
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

---

**Congratulations!** You've now studied every layer of a modern full-stack real-time application — from database design through production hardening. The best way to solidify this knowledge is to:

1. **Read the actual source code** alongside this guide
2. **Add a feature** (e.g., message reactions, file sharing, read receipts)
3. **Break something intentionally**, then debug it using the patterns you learned
4. **Rebuild part of it from scratch** without looking at the original code
5. **Review the Module 11 improvements** — understanding *why* each change matters is as valuable as knowing *how* to implement it

Happy coding! 🚀
