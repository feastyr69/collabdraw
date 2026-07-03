import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { neon } from '@neondatabase/serverless';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import boardsRouter from './routes/boards';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Setup Neon DB
const sql = neon(process.env.NEON_DATABASE_URL || '');

// Init tables
sql`
  CREATE TABLE IF NOT EXISTS boards (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    owner_id INTEGER REFERENCES users(id),
    state JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`.catch(err => console.error('Failed to create boards table:', err));

// Mount Routers
app.use('/api/auth', authRouter(sql));
app.use('/api/boards', boardsRouter(sql));

// Setup Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => {
  console.log('Connected to Redis');
});

// Track dirty boards for periodic saving
const dirtyBoards = new Set<string>();

// Socket.io logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-board', async (boardId: string) => {
    socket.join(boardId);
    console.log(`User ${socket.id} joined board ${boardId}`);

    // Fetch state from Redis
    let stateStr = await redis.get(`board:${boardId}`);
    if (!stateStr) {
      // Fallback to DB
      const result = await sql`SELECT state FROM boards WHERE id = ${boardId}`;
      const dbState = result.length > 0 ? result[0].state : [];
      stateStr = JSON.stringify(dbState);
      await redis.set(`board:${boardId}`, stateStr);
    }
    
    // Send current state to the joining user
    socket.emit('board-state', JSON.parse(stateStr || '[]'));
  });

  socket.on('draw-element', async ({ boardId, element }) => {
    // Broadcast to others in the room
    socket.to(boardId).emit('element-added', element);

    // Update Redis
    const stateStr = await redis.get(`board:${boardId}`);
    const state = stateStr ? JSON.parse(stateStr) : [];
    state.push(element);
    await redis.set(`board:${boardId}`, JSON.stringify(state));
    dirtyBoards.add(boardId);
  });
  
  socket.on('clear-board', async (boardId: string) => {
    socket.to(boardId).emit('board-cleared');
    await redis.set(`board:${boardId}`, JSON.stringify([]));
    dirtyBoards.add(boardId);
  });

  socket.on('remove-element', async ({ boardId, elementId }) => {
    socket.to(boardId).emit('element-removed', elementId);
    
    const stateStr = await redis.get(`board:${boardId}`);
    if (stateStr) {
      const state = JSON.parse(stateStr);
      const newState = state.filter((el: any) => el.id !== elementId);
      await redis.set(`board:${boardId}`, JSON.stringify(newState));
      dirtyBoards.add(boardId);
    }
  });

  socket.on('update-element', async ({ boardId, id, updates }) => {
    socket.to(boardId).emit('element-updated', { id, updates });
    
    const stateStr = await redis.get(`board:${boardId}`);
    if (stateStr) {
      const state = JSON.parse(stateStr);
      const newState = state.map((el: any) => el.id === id ? { ...el, ...updates } : el);
      await redis.set(`board:${boardId}`, JSON.stringify(newState));
      dirtyBoards.add(boardId);
    }
  });

  socket.on('sync-board-state', async ({ boardId, elements }) => {
    socket.to(boardId).emit('board-state', elements);
    await redis.set(`board:${boardId}`, JSON.stringify(elements));
    dirtyBoards.add(boardId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Periodic saving to DB (every 10 seconds)
setInterval(async () => {
  if (dirtyBoards.size === 0) return;
  
  const boardsToSave = Array.from(dirtyBoards);
  dirtyBoards.clear();
  
  console.log(`Periodically saving ${boardsToSave.length} boards to DB...`);
  
  for (const boardId of boardsToSave) {
    try {
      const stateStr = await redis.get(`board:${boardId}`);
      if (stateStr) {
        await sql`UPDATE boards SET state = ${stateStr}::jsonb WHERE id = ${boardId}`;
      }
    } catch (err) {
      console.error(`Failed to save board ${boardId} to DB:`, err);
      // Re-add to dirty set if failed
      dirtyBoards.add(boardId);
    }
  }
}, 10000);

app.get('/', async (req, res) => {
  try {
    const [{ now }] = await sql`SELECT NOW()`;
    res.json({ message: 'Backend is running!', db_time: now });
  } catch (error) {
    console.error('DB Error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
