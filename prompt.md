You are an experienced full-stack developer.

Build a complete, working real-time chat application using the MENR stack
with PostgreSQL as the main database. Use TypeScript everywhere
(frontend and backend).

This project is for learning, so the code must be clear, well-structured,
and fully explained. Do not skip details.

--------------------------------
Tech Stack
--------------------------------

Frontend:
- React with TypeScript
- Use Vite react
- React hooks and context
- WebSocket or Socket.IO for real-time chat

Backend:
- Node.js + Express
- TypeScript (strict mode)
- REST APIs plus WebSocket support
- Organized structure: routes, controllers, services, models

Databases:
- PostgreSQL (primary database)
  - users
  - chats
  - messages
- MongoDB (secondary database)
  - chat metadata
  - message indexing or flexible data

Explain clearly:
- Why PostgreSQL is used for some data
- Why MongoDB is used for other data

Database Tools:
- PostgreSQL: Prisma or TypeORM (choose one and explain)
- MongoDB: Mongoose

Auth & Security:
- JWT authentication
- Password hashing with bcrypt
- Protected routes
- Basic security practices

Other Requirements:
- Environment variables (.env)
- ESLint and Prettier
- Proper folder structure
- Strong typing everywhere

--------------------------------
Features
--------------------------------

The app must support:

1. Authentication
   - Register
   - Login
   - Logout
   - JWT-based auth

2. Real-time chat
   - One-to-one messaging
   - Messages saved in database
   - Real-time delivery
   - Timestamps
   - Basic online/offline status

3. UI
   - Chat list
   - Message screen
   - Send and receive messages
   - Simple, clean UI (design is not the focus)

4. Backend APIs
   - Auth routes
   - User routes
   - Chat routes
   - Message routes

--------------------------------
Project Structure
--------------------------------

- Show the full folder structure for frontend and backend
- Provide complete, runnable code for every file
- No pseudo-code
- Use TypeScript interfaces and types everywhere

--------------------------------
Documentation
--------------------------------

For every file:
- Explain what the file does
- Why it exists
- How it connects to other files
- Add inline comments where helpful

After each major section (backend, frontend, database),
add a short conceptual explanation.

--------------------------------
Database Design
--------------------------------

- Show PostgreSQL tables and relationships
- Show MongoDB schemas
- Explain normalization vs denormalization
- Explain data placement decisions

--------------------------------
Application Flow
--------------------------------

Explain step by step:
1. User registration flow
2. Login flow
3. Sending a message
4. Real-time message delivery
5. Frontend → backend → database → frontend data flow

--------------------------------
How to Run
--------------------------------

At the end, include:
- Dependency installation
- PostgreSQL setup
- MongoDB setup
- Example .env files
- How to run backend and frontend
- Common errors and how to fix them

--------------------------------
Style
--------------------------------

- Assume the reader knows basics but wants to understand things properly
- Be clear and structured
- Do not rush
- Do not skip important details

--------------------------------
Output Order
--------------------------------

1. Architecture overview
2. Folder structure
3. Backend code with explanations
4. Frontend code with explanations
5. Database schemas
6. Auth flow explanation
7. Real-time chat explanation
8. Setup instructions

NOTE:- create markdown file for any or every Explaination


Start now.