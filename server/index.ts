import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupOllamaRoutes } from './routes/ollama.js';
import { setupSystemRoutes } from './routes/system.js';
import { setupDockerRoutes } from './routes/docker.js';
import { setupFileRoutes } from './routes/files.js';
import { setupAdvancedRoutes } from './routes/advanced.js';
import { startSystemMonitor } from './services/systemMonitor.js';
import { startDockerMonitor } from './services/dockerMonitor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);

// Configure Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://your-domain.com'
    : '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Make io available to routes
app.set('io', io);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
}

// API Routes
app.use('/api/ollama', setupOllamaRoutes(io));
app.use('/api/system', setupSystemRoutes(io));
app.use('/api/docker', setupDockerRoutes(io));
app.use('/api/files', setupFileRoutes());
app.use('/api', setupAdvancedRoutes(io));

// Health check
app.get('/api/health', async (req, res) => {
  const si = await import('systeminformation');
  const [cpu, mem] = await Promise.all([si.currentLoad(), si.mem()]);
  
  res.json({
    status: 'online',
    version: '2.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    system: {
      cpu: `${cpu.currentLoad.toFixed(1)}%`,
      memory: `${((mem.used / mem.total) * 100).toFixed(1)}%`
    }
  });
});

// Serve React app for all other routes (SPA support)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[NEXUS] Client connected: ${socket.id}`);
  
  // Send initial stats
  socket.emit('welcome', {
    version: '2.0.0',
    timestamp: Date.now()
  });

  socket.on('disconnect', () => {
    console.log(`[NEXUS] Client disconnected: ${socket.id}`);
  });

  // Terminal input handling
  socket.on('terminal:input', (data) => {
    // Broadcast to all clients for multi-user terminal sharing
    socket.broadcast.emit('terminal:output', data);
  });

  // RAG search events
  socket.on('rag:search', (data) => {
    socket.emit('rag:results', { query: data.query, results: [] });
  });
});

// Start monitoring services
startSystemMonitor(io);
startDockerMonitor(io);

// Ensure directories exist
import fs from 'fs/promises';
try {
  await fs.mkdir(path.join(__dirname, '../uploads'), { recursive: true });
  await fs.mkdir(path.join(__dirname, '../uploads/rag'), { recursive: true });
  await fs.mkdir(path.join(__dirname, '../data'), { recursive: true });
} catch {}

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║   ███╗   ███╗███████╗███████╗████████╗ ██████╗██╗      ██╗██╗   ║');
  console.log('║   ████╗ ████║██╔════╝██╔════╝╚══██╔══╝██╔════╝██║      ██║██║   ║');
  console.log('║   ██╔████╔██║█████╗  █████╗     ██║   ██║     ██║      ██║██║   ║');
  console.log('║   ██║╚██╔╝██║██╔══╝  ██╔══╝     ██║   ██║     ██║      ██║██║   ║');
  console.log('║   ██║ ╚═╝ ██║███████╗███████╗   ██║   ╚██████╗███████╗ ██║██║   ║');
  console.log('║   ╚═╝     ╚═╝╚══════╝╚══════╝   ╚═╝    ╚═════╝╚══════╝ ╚═╝╚═╝   ║');
  console.log('║                                                               ║');
  console.log('║              AI COMMAND CENTER - VERSION 2.0                 ║');
  console.log('║                                                               ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  🚀 Server running on port ${PORT}                               ║`);
  console.log(`║  🌐 Environment: ${(process.env.NODE_ENV || 'development').padEnd(40)}║`);
  console.log(`║  📊 API: http://localhost:${PORT}/api                               ║`);
  console.log(`║  💚 Health: http://localhost:${PORT}/api/health                     ║`);
  console.log(`║  📈 Metrics: http://localhost:${PORT}/api/metrics                   ║`);
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
});

export { io, app, httpServer };