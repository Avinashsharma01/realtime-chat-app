# Setup Instructions

## Prerequisites

Before starting, make sure you have these installed:

| Software     | Version | Download                                         |
| ------------ | ------- | ------------------------------------------------ |
| Node.js      | ≥ 18    | https://nodejs.org/                              |
| PostgreSQL   | ≥ 14    | https://www.postgresql.org/download/             |
| MongoDB      | ≥ 6     | https://www.mongodb.com/try/download/community   |
| Git          | latest  | https://git-scm.com/downloads                    |

Verify installations:
```bash
node --version    # Should show v18+ or v20+
npm --version     # Comes with Node.js
psql --version    # PostgreSQL CLI
mongosh --version # MongoDB Shell
```

---

## Step 1: PostgreSQL Setup

### Create the Database

```bash
# Open PostgreSQL CLI
psql -U postgres

# Create the database
CREATE DATABASE realtime_chat;

# Verify it was created
\l

# Exit
\q
```

### Important Notes
- Default PostgreSQL user is usually `postgres`
- Default port is `5432`
- If you set a password during installation, remember it for the `.env` file

---

## Step 2: MongoDB Setup

### Start MongoDB

MongoDB should be running as a service. Verify:

```bash
# Check if MongoDB is running
mongosh

# If it connects, you're good. Type:
exit
```

MongoDB doesn't require creating a database manually — it will be created
automatically when the app first connects.

---

## Step 3: Backend Setup

### Install Dependencies

```bash
# Navigate to server directory
cd server

# Install all packages
npm install
```

### Configure Environment Variables

Copy the example `.env` file:
```bash
# Copy .env.example to .env
cp .env.example .env
```

Edit `.env` with your actual values:
```env
# Server Config
PORT=5000
NODE_ENV=development

# PostgreSQL - Update password to match your PostgreSQL password
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/realtime_chat"

# MongoDB
MONGODB_URI="mongodb://localhost:27017/realtime_chat"

# JWT - Change this to a random string in production!
JWT_SECRET="your-unique-secret-key-at-least-32-characters"
JWT_EXPIRES_IN="7d"

# Frontend URL
CLIENT_URL="http://localhost:5173"
```

### Generate Prisma Client & Run Migrations

```bash
# Generate the Prisma client (creates TypeScript types from schema)
npx prisma generate

# Run database migrations (creates tables in PostgreSQL)
npx prisma migrate dev --name init
```

You should see output like:
```
✓ Generated Prisma Client
✓ Created migration `init`
✓ Applied migration `init`
```

### Verify Database Tables

```bash
# Open Prisma Studio (visual database browser)
npx prisma studio
```

This opens a browser window at `http://localhost:5555` where you can see
the created tables: `users`, `chats`, `chat_participants`, `messages`.

### Start the Backend Server

```bash
# Development mode with hot reload
npm run dev
```

Expected output:
```
✅ MongoDB connected successfully
✅ PostgreSQL ready (Prisma auto-connects on first query)
✅ Socket.IO initialized

════════════════════════════════════════════
🚀 Server running on http://localhost:5000
📦 Environment: development
🌐 Frontend URL: http://localhost:5173
════════════════════════════════════════════
```

---

## Step 4: Frontend Setup

### Install Dependencies

Open a **new terminal** (keep the backend running):

```bash
# Navigate to client directory
cd client

# Install all packages
npm install
```

### Start the Frontend

```bash
# Development mode with hot reload
npm run dev
```

Expected output:
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: http://xxx.xxx.xxx.xxx:5173/
```

---

## Step 5: Test the Application

1. Open `http://localhost:5173` in your browser
2. Click "Create one" to register a new account
3. Open a second browser window (or incognito) at `http://localhost:5173`
4. Register a second account
5. In either window, click "+ New" to start a new chat
6. Select the other user
7. Send messages — they should appear in real-time in both windows!

---

## Common Errors and Fixes

### Error: "Cannot connect to PostgreSQL"
```
❌ Error: P1001: Can't reach database server at `localhost:5432`
```
**Fix**: Make sure PostgreSQL is running:
```bash
# Windows
net start postgresql-x64-16    # (version number may vary)

# Or check Services app (services.msc)
```
Also verify your `DATABASE_URL` in `.env` has the correct password.

### Error: "Cannot connect to MongoDB"
```
❌ MongoDB connection failed: MongoServerSelectionError
```
**Fix**: Make sure MongoDB is running:
```bash
# Windows
net start MongoDB

# Or start mongod manually
mongod
```

### Error: "Port 5000 is already in use"
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Fix**: Either:
- Close whatever is using port 5000, or
- Change `PORT` in `.env` to a different number (e.g., 5001)

### Error: "CORS error" in browser console
```
Access to XMLHttpRequest has been blocked by CORS policy
```
**Fix**: Make sure `CLIENT_URL` in `.env` matches your frontend URL exactly:
```env
CLIENT_URL="http://localhost:5173"
```

### Error: "Module not found" or "Cannot find module"
```
Error: Cannot find module '@prisma/client'
```
**Fix**: Run Prisma generate:
```bash
cd server
npx prisma generate
```

### Error: "bcrypt failed to build"
```
Error: node-pre-gyp ERR!
```
**Fix**: bcrypt requires native compilation. Try:
```bash
npm install --build-from-source bcrypt
# Or use bcryptjs (pure JS alternative):
npm uninstall bcrypt
npm install bcryptjs
# Then update imports: import bcrypt from 'bcryptjs';
```

### Error: TypeScript compilation errors
```
error TS2307: Cannot find module '...'
```
**Fix**: Make sure you're running with `tsx` (not `tsc` directly):
```bash
npm run dev    # Uses tsx watch
```

---

## Available Scripts

### Backend (`server/`)

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start with hot reload (tsx watch)    |
| `npm run build`      | Compile TypeScript to JavaScript     |
| `npm start`          | Run compiled JavaScript              |
| `npm run prisma:generate` | Generate Prisma client types    |
| `npm run prisma:migrate`  | Run database migrations         |
| `npm run prisma:studio`   | Open visual database browser    |
| `npm run lint`       | Run ESLint                           |
| `npm run format`     | Format code with Prettier            |

### Frontend (`client/`)

| Command          | Description                      |
| ---------------- | -------------------------------- |
| `npm run dev`    | Start Vite dev server            |
| `npm run build`  | Build for production             |
| `npm run preview`| Preview production build         |
| `npm run lint`   | Run ESLint                       |

---

## Environment Variables Reference

### Backend (`.env`)

| Variable       | Required | Default      | Description                |
| -------------- | -------- | ------------ | -------------------------- |
| `PORT`         | No       | 5000         | Server port                |
| `NODE_ENV`     | No       | development  | Environment mode           |
| `DATABASE_URL` | Yes      | —            | PostgreSQL connection URL  |
| `MONGODB_URI`  | Yes      | —            | MongoDB connection URL     |
| `JWT_SECRET`   | Yes      | —            | Secret for signing tokens  |
| `JWT_EXPIRES_IN`| No      | 7d           | Token expiration time      |
| `CLIENT_URL`   | No       | http://localhost:5173 | Frontend URL (CORS) |

### Frontend (optional `.env`)

| Variable         | Required | Default                | Description         |
| ---------------- | -------- | ---------------------- | ------------------- |
| `VITE_API_URL`   | No       | http://localhost:5000/api | Backend API URL   |
| `VITE_SOCKET_URL`| No       | http://localhost:5000   | Socket.IO URL       |
