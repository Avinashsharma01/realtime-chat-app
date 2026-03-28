# Real-Time Chat — How It Works

## Overview

Real-time messaging is implemented using **Socket.IO**, which provides
a persistent WebSocket connection between each client and the server.
This is fundamentally different from REST API calls:

| Feature     | REST API (HTTP)           | Socket.IO (WebSocket)         |
| ----------- | ------------------------- | ----------------------------- |
| Connection  | Open → Send → Close       | Open once, stays open         |
| Direction   | Client → Server only      | Bidirectional (both ways)     |
| Latency     | Higher (new connection)   | Lower (reuse connection)      |
| Use case    | CRUD operations           | Real-time events              |

---

## How Socket.IO Works

### Connection Lifecycle

```
1. Client opens the app  ──────────────────────────────────────────────
   │
   ▼
2. Client connects to Socket.IO server
   io('http://localhost:5000', { auth: { token: 'jwt...' } })
   │
   ▼
3. Server authenticates the connection
   io.use((socket, next) => {
     verify(socket.handshake.auth.token)
     → Valid? next()
     → Invalid? next(new Error('...'))
   })
   │
   ▼
4. Server registers the connection
   onlineUsers.set(userId, socketId)
   io.emit('user:online', { userId })        // Tell everyone
   socket.emit('users:online', [...])         // Send full list to new user
   │
   ▼
5. Connection stays open ─── messages flow both ways ───
   │
   ▼
6. User closes the app / disconnects
   onlineUsers.delete(userId)
   io.emit('user:offline', { userId })       // Tell everyone
```

### Online User Tracking

The server maintains an **in-memory Map**:

```typescript
// Map<userId, socketId>
const onlineUsers = new Map();

// When user connects:
onlineUsers.set('user-123', 'socket-abc');

// When checking if online:
const isOnline = onlineUsers.has('user-123'); // true

// When sending to specific user:
const socketId = onlineUsers.get('user-123');
io.to(socketId).emit('message:receive', data);
```

**Limitation**: This is in-memory, so it resets when the server restarts.
For production with multiple servers, you'd use Redis to share this state.

---

## Message Sending Flow

```
┌──────────────┐                ┌──────────────┐                ┌──────────────┐
│   Sender     │                │    Server    │                │  Recipient   │
│   (Alice)    │                │              │                │   (Bob)      │
└──────┬───────┘                └──────┬───────┘                └──────┬───────┘
       │                               │                               │
       │  socket.emit('message:send',  │                               │
       │  { chatId, content,           │                               │
       │    recipientId: bob })        │                               │
       │ ─────────────────────────────►│                               │
       │                               │                               │
       │                               │  1. Save to PostgreSQL       │
       │                               │     (messages table)          │
       │                               │                               │
       │                               │  2. Update MongoDB            │
       │                               │     (ChatMetadata)            │
       │                               │     (MessageIndex)            │
       │                               │                               │
       │                               │  3. Create response with      │
       │                               │     sender info               │
       │                               │                               │
       │  socket.emit('message:receive'│                               │
       │  { id, content, sender, ... })│                               │
       │ ◄─────────────────────────────│                               │
       │  (confirmation to sender)     │                               │
       │                               │                               │
       │                               │  4. Check if Bob is online    │
       │                               │     onlineUsers.get(bobId)    │
       │                               │                               │
       │                               │  io.to(bobSocket).emit(       │
       │                               │  'message:receive', message)  │
       │                               │ ─────────────────────────────►│
       │                               │                               │
       │                               │                               │  5. Frontend adds
       │                               │                               │     message to UI
       │                               │                               │
```

### What if the recipient is offline?

The message is still saved to the database. When the recipient logs in
and opens the chat, messages are loaded via the REST API:
```
GET /api/messages/:chatId
```

This ensures no messages are lost — Socket.IO provides **immediate delivery**
when both users are online, while the database provides **persistent storage**.

---

## Event Reference

### Client → Server Events

| Event            | Data                                  | Purpose                    |
| ---------------- | ------------------------------------- | -------------------------- |
| `message:send`   | `{ chatId, content, recipientId }`    | Send a new message         |
| `typing:start`   | `{ chatId, recipientId }`             | Notify started typing      |
| `typing:stop`    | `{ chatId, recipientId }`             | Notify stopped typing      |

### Server → Client Events

| Event            | Data                                  | Purpose                    |
| ---------------- | ------------------------------------- | -------------------------- |
| `message:receive`| `{ id, content, sender, chatId, ... }`| New message arrived        |
| `message:error`  | `{ error: string }`                   | Message sending failed     |
| `user:online`    | `{ userId }`                          | A user came online         |
| `user:offline`   | `{ userId }`                          | A user went offline        |
| `users:online`   | `string[]` (array of userIds)         | Full list of online users  |
| `typing:start`   | `{ chatId, userId }`                  | Someone is typing          |
| `typing:stop`    | `{ chatId, userId }`                  | Someone stopped typing     |

---

## Typing Indicators

Typing indicators work with a **debounce pattern**:

```
User types "H"
→ Emit 'typing:start'
→ Set 2-second timeout

User types "e"  (within 2 seconds)
→ Clear old timeout
→ Set new 2-second timeout

User types "l"  (within 2 seconds)
→ Clear old timeout
→ Set new 2-second timeout

... 2 seconds pass with no typing ...
→ Timeout fires
→ Emit 'typing:stop'
```

This prevents flooding the server with events for every keystroke.

---

## Frontend Socket Integration

### SocketContext (React Context)

```
AuthContext provides token
        │
        ▼
SocketContext checks: has token?
        │
        ├─ YES → Connect to Socket.IO with token
        │          Listen for online/offline events
        │          Provide socket + onlineUsers to children
        │
        └─ NO → Don't connect (or disconnect if connected)
```

### Chat Page (Real-time Message Handling)

```typescript
// Chat.tsx listens for new messages
useEffect(() => {
  socket.on('message:receive', (message) => {
    // 1. Add to displayed messages (if this chat is selected)
    // 2. Update chat list sidebar (show latest message preview)
    // 3. Re-sort chats (most recent activity first)
  });
}, [socket, selectedChat]);
```

### Message Deduplication

Since the sender receives their own message back as confirmation,
we use ID-based deduplication:

```typescript
setMessages((prev) => {
  // Don't add if message with same ID already exists
  if (prev.some((m) => m.id === message.id)) return prev;
  return [...prev, message];
});
```

---

## Socket.IO vs Raw WebSocket

We use Socket.IO instead of the raw WebSocket API because it provides:

1. **Automatic reconnection**: If the connection drops (network change,
   server restart), Socket.IO automatically attempts to reconnect.

2. **Event-based API**: Instead of parsing raw strings, we use named events:
   ```typescript
   // Socket.IO (clean)
   socket.emit('message:send', { chatId, content });
   socket.on('message:receive', (msg) => { ... });

   // Raw WebSocket (manual parsing)
   ws.send(JSON.stringify({ type: 'message:send', chatId, content }));
   ws.onmessage = (e) => {
     const data = JSON.parse(e.data);
     if (data.type === 'message:receive') { ... }
   };
   ```

3. **Rooms support**: Target specific users:
   ```typescript
   io.to(socketId).emit('message:receive', data); // Send to one user
   ```

4. **Middleware**: Authentication before connection is established:
   ```typescript
   io.use((socket, next) => {
     // Verify token BEFORE allowing the connection
   });
   ```

5. **Fallback**: If WebSocket is blocked, Socket.IO falls back to HTTP
   long-polling (works through corporate firewalls).
