import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupOllamaRoutes } from './routes/ollama.js';
import { setupSystemRoutes } from './routes/system.js';
import { setupDockerRoutes } from './routes/docker.js';
import { setupFileRoutes } from './routes/files.js';
import { startSystemMonitor } from './services/systemMonitor.js';
import { startDockerMonitor } from './services/dockerMonitor.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ['http://localhost:5173', 'http://localhost:3000'], methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.set('io', io);

app.use('/api/ollama', setupOllamaRoutes(io));
app.use('/api/system', setupSystemRoutes(io));
app.use('/api/docker', setupDockerRoutes(io));
app.use('/api/files', setupFileRoutes());
app.get('/api/health', (req, res) => res.json({ status: 'online', uptime: process.uptime() }));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

startSystemMonitor(io);
startDockerMonitor(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 NEXUS Server running on port ${PORT}`);
});

export { io };