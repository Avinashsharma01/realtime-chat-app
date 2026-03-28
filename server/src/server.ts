// ============================================================================
// Server Entry Point
// ============================================================================
// This is where everything comes together:
//   1. Connect to MongoDB
//   2. Create HTTP server from Express app
//   3. Initialize Socket.IO for real-time communication
//   4. Start listening for connections
//
// The server uses Node's built-in `http.createServer()` instead of
// Express's `app.listen()` because Socket.IO needs access to the
// raw HTTP server to attach its WebSocket upgrade handler.
// ============================================================================

import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { connectMongoDB, disconnectDatabases } from './config/db';
import { initializeSocket } from './socket';

/**
 * Starts the server by connecting to databases and initializing services.
 */
const startServer = async (): Promise<void> => {
  try {
    // Step 1: Connect to MongoDB (PostgreSQL connects automatically via Prisma)
    await connectMongoDB();
    console.log('✅ PostgreSQL ready (Prisma auto-connects on first query)');

    // Step 2: Create HTTP server from Express app
    const httpServer = createServer(app);

    // Step 3: Attach Socket.IO to the HTTP server
    initializeSocket(httpServer);
    console.log('✅ Socket.IO initialized');

    // Step 4: Start listening
    httpServer.listen(env.PORT, () => {
      console.log('');
      console.log('════════════════════════════════════════════');
      console.log(`🚀 Server running on http://localhost:${env.PORT}`);
      console.log(`📦 Environment: ${env.NODE_ENV}`);
      console.log(`🌐 Frontend URL: ${env.CLIENT_URL}`);
      console.log('════════════════════════════════════════════');
      console.log('');
    });

    // ── Graceful Shutdown ─────────────────────────────────────────────────
    // Handle SIGINT (Ctrl+C) and SIGTERM (process manager stop)
    const shutdown = async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await disconnectDatabases();
      httpServer.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
