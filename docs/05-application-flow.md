# Application Flow — Step by Step

## 1. User Registration Flow

```
Frontend                          Backend                          Database
─────────                         ───────                          ────────

User fills form:                  
  username: "alice"               
  email: "alice@mail.com"         
  password: "pass123"             
                                  
Register.tsx                      
  handleSubmit()                  
  │                               
  ▼                               
AuthContext.register()            
  │                               
  ▼                               
authService.register()            
  │                               
  ▼                               
api.post('/auth/register', data)  
  ──────────────────────────────► POST /api/auth/register         
                                  │                               
                                  ▼                               
                                  AuthController.register()       
                                  │ Validate input                
                                  │                               
                                  ▼                               
                                  AuthService.register()          
                                  │ Check existing user  ────────► SELECT * FROM users
                                  │                      ◄──────── WHERE email OR username
                                  │ Hash password                 
                                  │ bcrypt.hash()                 
                                  │                               
                                  │ Create user         ────────► INSERT INTO users
                                  │                      ◄──────── Return new user
                                  │                               
                                  │ Generate JWT                  
                                  │ jwt.sign()                    
                                  │                               
                                  ▼                               
                                  Return { user, token }          
  ◄──────────────────────────────                                 
                                  
  localStorage.setItem('token')   
  setUser(response.user)          
  navigate('/')                   
```

---

## 2. Login Flow

```
Frontend                          Backend                          Database
─────────                         ───────                          ────────

User fills form:                  
  email: "alice@mail.com"         
  password: "pass123"             
                                  
Login.tsx                         
  handleSubmit()                  
  │                               
  ▼                               
AuthContext.login()               
  │                               
  ▼                               
api.post('/auth/login', data)     
  ──────────────────────────────► POST /api/auth/login            
                                  │                               
                                  ▼                               
                                  AuthController.login()          
                                  │                               
                                  ▼                               
                                  AuthService.login()             
                                  │ Find user by email  ────────► SELECT * FROM users
                                  │                      ◄──────── WHERE email = '...'
                                  │                               
                                  │ Compare passwords             
                                  │ bcrypt.compare()              
                                  │                               
                                  │ Generate JWT                  
                                  │ jwt.sign()                    
                                  │                               
                                  ▼                               
                                  Return { user, token }          
  ◄──────────────────────────────                                 
                                  
  localStorage.setItem('token')   
  setUser(response.user)          
  navigate('/')                   
  │                               
  ▼                               
SocketContext detects token        
  → io.connect(SOCKET_URL)        
  ──────────────────────────────► Socket.IO handshake             
                                  │ Verify JWT                    
                                  │ Add to onlineUsers            
                                  │                               
                                  ▼                               
                                  io.emit('user:online')          
  ◄──────────────────────────────                                 
  → Update onlineUsers state      
```

---

## 3. Sending a Message

```
Frontend                          Backend (Socket.IO)              Database
─────────                         ──────────────────               ────────

Alice types "Hello Bob!"          
ChatWindow.tsx                    
  handleSubmit()                  
  │                               
  ▼                               
Chat.tsx                          
  handleSendMessage("Hello Bob!") 
  │                               
  ▼                               
socket.emit('message:send', {     
  chatId: "chat-123",            
  content: "Hello Bob!",         
  recipientId: "bob-456"         
})                                
  ──────────────────────────────► socket.on('message:send')       
                                  │                               
                                  ▼                               
                                  MessageService.sendMessage()    
                                  │ Save to PostgreSQL  ────────► INSERT INTO messages
                                  │                      ◄──────── Return message + sender
                                  │                               
                                  │ Update chat.updatedAt ──────► UPDATE chats SET ...
                                  │                               
                                  │ Update MongoDB      ────────► ChatMetadata.update()
                                  │ metadata             ◄────────  (lastMessage, totalMsgs)
                                  │                               
                                  │ Create search index ────────► MessageIndex.create()
                                  │                      ◄──────── (content, keywords)
                                  │                               
                                  ▼                               
                                  Send to Alice (confirmation)    
  ◄────────────────────────────── socket.emit('message:receive')  
  │                               │                               
  │                               │ Check: is Bob online?         
  │                               │ onlineUsers.get('bob-456')    
  │                               │ → socket-id found             
  │                               │                               
  │                               ▼                               
  │                               io.to(bobSocket).emit(          
  │                               'message:receive', message)     
  │                               ──────────────────────────────► Bob's Frontend
  │                                                                │
  ▼                                                                ▼
  Add message to UI                                                Add message to UI
  Update chat list preview                                         Update chat list preview
```

---

## 4. Real-Time Message Delivery

### When Recipient Is Online

```
Alice sends message
        │
        ▼
Server saves to DB
        │
        ▼
Server checks: Is Bob online?
        │
        ├── YES → Find Bob's socket ID
        │          io.to(bobSocket).emit(...)
        │          Bob sees message INSTANTLY
        │
        └── NO  → Message stays in DB
                   Bob will see it when he
                   loads the chat next time
```

### When Recipient Comes Online Later

```
Bob logs in
        │
        ▼
Bob's frontend fetches chats
GET /api/chats
→ Returns all chats with last message preview
        │
        ▼
Bob selects Alice's chat
GET /api/messages/chat-123
→ Returns all messages (including ones sent while offline)
```

---

## 5. Complete Frontend → Backend → Database Data Flow

### Loading the Chat Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ After login, Chat.tsx mounts                                        │
│                                                                     │
│ useEffect(() => {                                                   │
│   Promise.all([                                                     │
│     chatService.getChats(),        // GET /api/chats                │
│     api.get('/users')              // GET /api/users                │
│   ])                                                                │
│ }, [])                                                              │
│                                                                     │
│     GET /api/chats                                                  │
│        │                                                            │
│        ▼                                                            │
│     Auth middleware → verify JWT                                    │
│        │                                                            │
│        ▼                                                            │
│     ChatController.getUserChats(req.user.id)                        │
│        │                                                            │
│        ▼                                                            │
│     ChatService.getUserChats()                                      │
│        │                                                            │
│        ├─► PostgreSQL: SELECT chats WHERE participant = userId      │
│        │   JOIN chat_participants, users, messages                   │
│        │   ORDER BY updatedAt DESC                                  │
│        │                                                            │
│        ├─► MongoDB: ChatMetadata.findOne({ chatId })                │
│        │   For each chat (metadata enrichment)                      │
│        │                                                            │
│        ▼                                                            │
│     Return enriched chat list to frontend                           │
│        │                                                            │
│        ▼                                                            │
│     ChatList component renders sidebar                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Selecting a Chat and Loading Messages

```
┌─────────────────────────────────────────────────────────────────────┐
│ User clicks on a chat in the sidebar                                │
│                                                                     │
│ ChatList → onSelectChat(chat) → Chat.tsx → setSelectedChat(chat)    │
│                                                                     │
│ useEffect(() => {                                                   │
│   messageService.getMessages(selectedChat.id)                       │
│ }, [selectedChat.id])                                               │
│                                                                     │
│     GET /api/messages/chat-123?page=1                               │
│        │                                                            │
│        ▼                                                            │
│     Auth middleware → verify JWT                                    │
│        │                                                            │
│        ▼                                                            │
│     MessageController.getChatMessages()                             │
│        │                                                            │
│        ▼                                                            │
│     MessageService.getChatMessages()                                │
│        │                                                            │
│        ├─► PostgreSQL: SELECT messages WHERE chatId = 'chat-123'    │
│        │   JOIN users (sender info)                                 │
│        │   ORDER BY createdAt ASC                                   │
│        │   LIMIT 50 OFFSET 0                                       │
│        │                                                            │
│        ├─► PostgreSQL: COUNT messages (for pagination)              │
│        │                                                            │
│        ▼                                                            │
│     Return { messages, pagination }                                 │
│        │                                                            │
│        ▼                                                            │
│     ChatWindow renders messages                                     │
│     MessageBubble for each message                                  │
│     Auto-scroll to bottom                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Summary: Where Data Lives at Each Step

| Action           | PostgreSQL                | MongoDB                  | Frontend State         |
| ---------------- | ------------------------- | ------------------------ | ---------------------- |
| User registers   | New row in `users`        | —                        | user, token in Context |
| User logs in     | Query `users`             | —                        | user, token in Context |
| Create chat      | New rows in `chats` +     | New `ChatMetadata` doc   | chat added to list     |
|                  | `chat_participants`       |                          |                        |
| Send message     | New row in `messages`,    | Update `ChatMetadata`,   | message added to UI    |
|                  | update `chats.updatedAt`  | new `MessageIndex`       |                        |
| Load chat list   | Query `chats` + JOINs     | Query `ChatMetadata`     | chats array in state   |
| Load messages    | Query `messages` + JOINs  | —                        | messages array in state|
| Search messages  | Query `messages` by IDs   | $text search on index    | results displayed      |
| Go online        | —                         | —                        | onlineUsers updated    |
| Go offline       | —                         | —                        | onlineUsers updated    |
