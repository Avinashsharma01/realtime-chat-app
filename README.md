# Real-Time Chat App

A full-stack real-time chat application with secure authentication, one-to-one and group conversations, typing indicators, live online presence, and profile management.

## Highlights

- Real-time messaging with Socket.IO
- Private (1-on-1) and group chats
- JWT-based authentication and route protection
- Typing indicators and online/offline presence
- Message deletion support
- User profile updates (username, avatar, bio)
- Full-text message search endpoint
- Hybrid data design:
    - PostgreSQL (core relational data)
    - MongoDB (chat metadata and message indexing)

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router v7
- Axios
- Socket.IO Client
- Tailwind CSS v4

### Backend

- Node.js
- Express
- TypeScript
- Socket.IO
- Prisma ORM
- PostgreSQL
- MongoDB + Mongoose
- JWT + bcrypt
- Helmet + CORS

## Monorepo Structure

```text
REAL_TIME_CHAT_APP/
├── client/   # React frontend
├── server/   # Express + Socket.IO backend
└── docs/     # Architecture and setup docs
```

## Prerequisites

Install these before running locally:

- Node.js 18+
- PostgreSQL 14+
- MongoDB 6+
- Git

## Quick Start

### 1) Clone the repository

```bash
git clone https://github.com/Avinashsharma01/realtime-chat-app.git
cd realtime-chat-app
```

### 2) Configure backend environment

```bash
cd server
cp .env.example .env
```

Update values in `.env` if needed (especially database credentials and JWT secret).

### 3) Install backend dependencies and initialize Prisma

```bash
npm install
npm run prisma:generate
npx prisma migrate dev --name init
```

### 4) Start backend

```bash
npm run dev
```

Backend runs at:

- http://localhost:5000

### 5) Install and run frontend (new terminal)

```bash
cd client
npm install
npm run dev
```

Frontend runs at:

- http://localhost:5173

## Environment Variables

Create `server/.env` from `server/.env.example`.

Required/important values:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/realtime_chat"
MONGODB_URI="mongodb://localhost:27017/realtime_chat"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
```

Frontend optional env values:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

If omitted, frontend defaults are already set to localhost values above.

## Available Scripts

### Backend (server)

- `npm run dev` - Start dev server with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Run compiled output
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run Prisma migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run lint` - Lint backend source
- `npm run format` - Format backend source

### Frontend (client)

- `npm run dev` - Start Vite dev server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build
- `npm run lint` - Lint frontend source

## API Overview

Base URL: `http://localhost:5000/api`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Users

- `GET /users`
- `GET /users/search`
- `GET /users/:id`
- `PUT /users/profile`

### Chats

- `GET /chats`
- `POST /chats`
- `POST /chats/group`
- `GET /chats/:id`
- `PUT /chats/:id/rename`
- `POST /chats/:id/members`
- `DELETE /chats/:id/members/:userId`
- `PUT /chats/:id/members/:userId/admin`
- `POST /chats/:id/leave`

### Messages

- `GET /messages/:chatId`
- `POST /messages/:chatId`
- `GET /messages/:chatId/search`
- `DELETE /messages/:messageId`

## Real-Time Events (Socket.IO)

### Client to Server

- `message:send`
- `message:delete`
- `typing:start`
- `typing:stop`
- `group:join`

### Server to Client

- `message:receive`
- `message:deleted`
- `message:error`
- `typing:start`
- `typing:stop`
- `users:online`
- `user:online`
- `user:offline`

## Documentation

Detailed guides are available in the `docs` folder:

- Architecture overview
- Database design
- Auth flow
- Realtime chat flow
- Application flow
- Setup instructions

## Troubleshooting

- PostgreSQL connection issues:
    - Verify PostgreSQL is running and `DATABASE_URL` is correct.
- MongoDB connection issues:
    - Verify MongoDB is running and `MONGODB_URI` is correct.
- CORS issues:
    - Ensure `CLIENT_URL` matches your frontend URL exactly.
- Prisma client errors:
    - Run `npm run prisma:generate` in server.

## License

No license specified yet.
