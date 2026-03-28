# Architecture Overview

## What is this application?

A **real-time chat application** where users can register, log in, and send
instant messages to each other. Messages are delivered in real-time using
WebSockets, persisted in databases, and the entire system is type-safe
with TypeScript.

## Tech Stack Summary

| Layer        | Technology                  | Purpose                              |
| ------------ | --------------------------- | ------------------------------------ |
| Frontend     | React + TypeScript + Vite   | User interface                       |
| Styling      | Tailwind CSS v4             | Utility-first CSS framework          |
| Routing      | React Router v7             | Client-side page navigation          |
| HTTP Client  | Axios                       | REST API calls                       |
| Real-time    | Socket.IO (client)          | WebSocket communication              |
| Backend      | Node.js + Express           | REST API server                      |
| Real-time    | Socket.IO (server)          | WebSocket server                     |
| Primary DB   | PostgreSQL + Prisma         | Relational data (users, chats, msgs) |
| Secondary DB | MongoDB + Mongoose          | Metadata, search indexing            |
| Auth         | JWT + bcrypt                | Authentication & password hashing    |
| Security     | Helmet + CORS               | HTTP security headers                |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                    React + TypeScript                            │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────────┐    │
│  │  Login   │   │ Register │   │       Chat Page           │    │
│  │  Page    │   │  Page    │   │  ┌────────┐ ┌──────────┐  │    │
│  └──────────┘   └──────────┘   │  │ChatList│ │ChatWindow│  │    │
│                                │  └────────┘ └──────────┘  │    │
│                                └──────────────────────────────┘  │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │ AuthContext  │  │SocketContext │  │  Axios API Client  │     │
│  └─────────────┘  └──────────────┘  └────────────────────┘     │
└──────────────────────────┬──────────────────┬───────────────────┘
                           │ HTTP (REST)      │ WebSocket
                           ▼                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                          BACKEND                                 │
│                   Node.js + Express                              │
│                                                                  │
│  ┌──────────────────────────────────────┐  ┌──────────────────┐ │
│  │          REST API Layer              │  │   Socket.IO      │ │
│  │                                      │  │   Real-time      │ │
│  │  Routes → Controllers → Services    │  │                  │ │
│  └──────────────────────────────────────┘  └──────────────────┘ │
│                                                                  │
│  ┌──────────┐  ┌─────────────┐  ┌────────────────────────────┐  │
│  │   Auth   │  │  Middleware  │  │    Online User Tracking    │  │
│  │  (JWT)   │  │  (Helmet,   │  │     (In-Memory Map)        │  │
│  │          │  │   CORS)     │  │                            │  │
│  └──────────┘  └─────────────┘  └────────────────────────────┘  │
└──────────────────────────┬──────────────────┬───────────────────┘
                           │                  │
                           ▼                  ▼
┌──────────────────────────────┐  ┌────────────────────────────────┐
│       PostgreSQL             │  │          MongoDB               │
│       (Prisma ORM)           │  │          (Mongoose)            │
│                              │  │                                │
│  ┌──────────┐ ┌───────────┐ │  │  ┌──────────────┐             │
│  │  users   │ │   chats   │ │  │  │ChatMetadata  │             │
│  ├──────────┤ ├───────────┤ │  │  │- lastMessage │             │
│  │ id       │ │ id        │ │  │  │- unreadCounts│             │
│  │ username │ │ createdAt │ │  │  │- totalMsgs   │             │
│  │ email    │ │ updatedAt │ │  │  └──────────────┘             │
│  │ password │ └───────────┘ │  │                                │
│  └──────────┘               │  │  ┌──────────────┐             │
│  ┌───────────────────────┐  │  │  │MessageIndex  │             │
│  │  chat_participants    │  │  │  │- content     │             │
│  ├───────────────────────┤  │  │  │- keywords    │             │
│  │ chatId ──→ chats.id   │  │  │  │- text index  │             │
│  │ userId ──→ users.id   │  │  │  └──────────────┘             │
│  └───────────────────────┘  │  │                                │
│  ┌──────────────────────┐   │  │                                │
│  │     messages          │  │  │                                │
│  ├──────────────────────┤   │  │                                │
│  │ chatId ──→ chats.id  │   │  │                                │
│  │ senderId─→ users.id  │   │  │                                │
│  │ content              │   │  │                                │
│  └──────────────────────┘   │  │                                │
└──────────────────────────────┘  └────────────────────────────────┘
```

## Request Flow

### REST API Request:
```
Browser → HTTP Request → Express Router → Middleware (Auth) → Controller → Service → Database → Response
```

### Real-time Message:
```
Sender → Socket.IO emit → Server Handler → Save to DB → Emit to Recipient → Recipient receives instantly
```

## Key Design Decisions

### 1. Why Two Databases?

**PostgreSQL** is used for data that has clear relationships:
- Users relate to chats through participants
- Messages belong to chats and users
- We need ACID transactions (e.g., a message must always reference valid users)
- Foreign key constraints prevent orphaned data

**MongoDB** is used for flexible, frequently-updated data:
- Chat metadata (last message preview, unread counts) changes with every message
- Full-text search on message content uses MongoDB's built-in text indexing
- The schema is flexible — unreadCounts is a dynamic map that varies per user

### 2. Why Prisma (not TypeORM)?

Prisma was chosen over TypeORM for several reasons:
- **Type safety**: Prisma generates TypeScript types from the schema automatically
- **Declarative schema**: The `.prisma` file is readable and serves as documentation
- **Migrations**: `prisma migrate` handles database schema changes automatically
- **Query API**: Prisma's query API is intuitive (`prisma.user.findMany(...)`)
- **Prisma Studio**: Built-in GUI for viewing/editing database data

### 3. Why Socket.IO (not raw WebSockets)?

Socket.IO adds features on top of WebSockets:
- **Automatic reconnection** when the connection drops
- **Room/namespace support** for organizing connections
- **Fallback transport** (polling) for environments that block WebSockets
- **Built-in event system** (`socket.emit('event', data)`)
- **Authentication middleware** for verifying connections

### 4. Why Separate Services from Controllers?

The **Controller → Service** pattern separates concerns:
- **Controllers** handle HTTP (extract request data, send responses)
- **Services** handle business logic (database queries, data processing)

This means the same service can be called from both:
- REST API controllers (HTTP requests)
- Socket.IO event handlers (WebSocket events)

For example, `MessageService.sendMessage()` is called by both the REST endpoint
AND the Socket.IO `message:send` handler.

## Folder Structure

```
REAL_TIME_CHAT_APP/
│
├── server/                      # Backend
│   ├── prisma/
│   │   └── schema.prisma        # PostgreSQL schema definition
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts            # Database connections (Prisma + Mongoose)
│   │   │   └── env.ts           # Environment variable configuration
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── chat.controller.ts
│   │   │   ├── message.controller.ts
│   │   │   └── user.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT authentication middleware
│   │   │   └── errorHandler.ts  # Global error handler
│   │   ├── models/
│   │   │   ├── chatMetadata.model.ts   # MongoDB: Chat metadata
│   │   │   └── messageIndex.model.ts   # MongoDB: Message search index
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── chat.routes.ts
│   │   │   ├── message.routes.ts
│   │   │   └── user.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── chat.service.ts
│   │   │   ├── message.service.ts
│   │   │   └── user.service.ts
│   │   ├── socket/
│   │   │   └── index.ts         # Socket.IO setup and event handlers
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript type definitions
│   │   ├── app.ts               # Express app configuration
│   │   └── server.ts            # Server entry point
│   ├── .env                     # Environment variables (git-ignored)
│   ├── .env.example             # Example env vars (committed)
│   ├── package.json
│   └── tsconfig.json
│
├── client/                      # Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatList.tsx     # Sidebar with chat list
│   │   │   ├── ChatWindow.tsx   # Message area with input
│   │   │   ├── MessageBubble.tsx # Single message bubble
│   │   │   └── ProtectedRoute.tsx # Auth guard for routes
│   │   ├── context/
│   │   │   ├── AuthContext.tsx  # Authentication state management
│   │   │   └── SocketContext.tsx # Socket.IO connection management
│   │   ├── pages/
│   │   │   ├── Chat.tsx         # Main chat page (orchestrator)
│   │   │   ├── Login.tsx        # Login form
│   │   │   └── Register.tsx     # Registration form
│   │   ├── services/
│   │   │   ├── api.ts           # Axios instance with interceptors
│   │   │   ├── auth.service.ts  # Auth API calls
│   │   │   ├── chat.service.ts  # Chat API calls
│   │   │   └── message.service.ts # Message API calls
│   │   ├── types/
│   │   │   └── index.ts         # Frontend TypeScript types
│   │   ├── App.tsx              # Root component with routing
│   │   ├── App.css              # (empty — using Tailwind)
│   │   ├── index.css            # Tailwind import + base styles
│   │   └── main.tsx             # React entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── docs/                        # Documentation
    ├── 01-architecture-overview.md
    ├── 02-database-design.md
    ├── 03-auth-flow.md
    ├── 04-realtime-chat.md
    ├── 05-application-flow.md
    └── 06-setup-instructions.md
```
