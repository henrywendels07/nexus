import { Router } from 'express';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'crypto';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const execAsync = promisify(exec);
const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// RAG - Vector Storage
const documents: Map<string, { id: string; content: string; embedding: number[]; metadata: any; createdAt: number }> = new Map();

// Simple embedding generator (in production, use Ollama embeddings)
function generateEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(384).fill(0);
  words.forEach((word, i) => {
    const hash = crypto.createHash('md5').update(word).digest();
    for (let j = 0; j < 8 && j < hash.length; j++) {
      embedding[(i * 8 + j) % 384] += hash[j] / 255;
    }
  });
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(v => v / (magnitude || 1));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magA * magB || 1);
}

export function setupAdvancedRoutes(io: Server) {
  // ============ RAG SYSTEM ============
  
  // Upload document for RAG
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/rag')),
      filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
    }),
    limits: { fileSize: 50 * 1024 * 1024 }
  });

  router.post('/rag/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      
      const content = await fs.readFile(req.file.path, 'utf8');
      const id = uuidv4();
      const embedding = generateEmbedding(content);
      
      documents.set(id, {
        id,
        content: content.slice(0, 10000), // Limit content size
        embedding,
        metadata: {
          filename: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype
        },
        createdAt: Date.now()
      });

      // Clean up uploaded file
      await fs.unlink(req.file.path);

      res.json({ success: true, id, chunks: 1 });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process document' });
    }
  });

  // Text-based document creation
  router.post('/rag/text', async (req, res) => {
    try {
      const { content, metadata = {} } = req.body;
      if (!content) return res.status(400).json({ error: 'Content required' });
      
      const id = uuidv4();
      const embedding = generateEmbedding(content);
      
      documents.set(id, {
        id,
        content,
        embedding,
        metadata: { ...metadata, type: 'text' },
        createdAt: Date.now()
      });

      res.json({ success: true, id, chunks: 1 });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process text' });
    }
  });

  // Semantic search
  router.post('/rag/search', async (req, res) => {
    try {
      const { query, topK = 5, threshold = 0.3 } = req.body;
      if (!query) return res.status(400).json({ error: 'Query required' });
      
      const queryEmbedding = generateEmbedding(query);
      
      const results = Array.from(documents.values())
        .map(doc => ({
          ...doc,
          similarity: cosineSimilarity(queryEmbedding, doc.embedding)
        }))
        .filter(doc => doc.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      res.json({
        query,
        results: results.map(r => ({
          id: r.id,
          content: r.content.slice(0, 500),
          similarity: r.similarity,
          metadata: r.metadata
        })),
        total: results.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // List RAG documents
  router.get('/rag/documents', (req, res) => {
    const docs = Array.from(documents.values()).map(d => ({
      id: d.id,
      content: d.content.slice(0, 200) + '...',
      metadata: d.metadata,
      createdAt: d.createdAt
    }));
    res.json({ documents: docs, total: docs.length });
  });

  // Delete RAG document
  router.delete('/rag/documents/:id', (req, res) => {
    const deleted = documents.delete(req.params.id);
    res.json({ success: deleted });
  });

  // ============ CODE INTERPRETER ============
  
  router.post('/execute/python', async (req, res) => {
    try {
      const { code, timeout = 30 } = req.body;
      if (!code) return res.status(400).json({ error: 'Code required' });
      
      const tempFile = path.join('/tmp', `nexus_${Date.now()}.py`);
      await fs.writeFile(tempFile, code);
      
      const startTime = Date.now();
      const result = await Promise.race([
        execAsync(`python3 "${tempFile}" 2>&1`, { timeout: timeout * 1000 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout * 1000))
      ]);
      
      await fs.unlink(tempFile);
      
      res.json({
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
        duration: Date.now() - startTime
      });
    } catch (error: any) {
      res.json({
        stdout: '',
        stderr: error.stdout || error.message,
        exitCode: error.code || 1,
        duration: 0,
        timedOut: error.message === 'Timeout'
      });
    }
  });

  router.post('/execute/javascript', async (req, res) => {
    try {
      const { code, timeout = 30 } = req.body;
      if (!code) return res.status(400).json({ error: 'Code required' });
      
      const tempFile = path.join('/tmp', `nexus_${Date.now()}.js`);
      await fs.writeFile(tempFile, code);
      
      const startTime = Date.now();
      const result = await Promise.race([
        execAsync(`node "${tempFile}" 2>&1`, { timeout: timeout * 1000 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout * 1000))
      ]);
      
      await fs.unlink(tempFile);
      
      res.json({
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
        duration: Date.now() - startTime
      });
    } catch (error: any) {
      res.json({
        stdout: '',
        stderr: error.stdout || error.message,
        exitCode: error.code || 1,
        duration: 0,
        timedOut: error.message === 'Timeout'
      });
    }
  });

  // ============ SHELL COMMAND EXECUTION ============
  
  router.post('/shell/execute', async (req, res) => {
    try {
      const { command, cwd = process.env.HOME || '/root', timeout = 60 } = req.body;
      if (!command) return res.status(400).json({ error: 'Command required' });
      
      // Security: whitelist allowed commands (extend as needed)
      const dangerous = ['rm -rf /', 'dd if=', ':(){:|:&};:', 'mkfs', 'fdisk'];
      if (dangerous.some(d => command.includes(d))) {
        return res.status(403).json({ error: 'Command not allowed for security' });
      }
      
      const startTime = Date.now();
      const result = await Promise.race([
        execAsync(command, { cwd, maxBuffer: 10 * 1024 * 1024 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout * 1000))
      ]);
      
      res.json({
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
        duration: Date.now() - startTime
      });
    } catch (error: any) {
      res.json({
        stdout: '',
        stderr: error.stdout || error.message,
        exitCode: error.code || 1,
        duration: 0
      });
    }
  });

  // ============ SYSTEM PROCESSES ============
  
  router.get('/processes', async (req, res) => {
    try {
      const { sort = 'cpu', order = 'desc', limit = 50 } = req.query;
      const result = await execAsync('ps aux --no-headers');
      
      let processes = result.stdout.split('\n').filter(Boolean).map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parseInt(parts[1]) || 0,
          user: parts[0] || '',
          cpu: parseFloat(parts[2]) || 0,
          mem: parseFloat(parts[3]) || 0,
          vsz: parseInt(parts[4]) || 0,
          rss: parseInt(parts[5]) || 0,
          tty: parts[6] || '',
          stat: parts[7] || '',
          start: parts[8] || '',
          time: parts[9] || '',
          command: parts.slice(10).join(' ')
        };
      });

      // Sort processes
      processes.sort((a, b) => {
        const aVal = sort === 'cpu' ? a.cpu : sort === 'mem' ? a.mem : a.pid;
        const bVal = sort === 'cpu' ? b.cpu : sort === 'mem' ? b.mem : b.pid;
        return order === 'desc' ? bVal - aVal : aVal - bVal;
      });

      res.json({
        processes: processes.slice(0, parseInt(String(limit))),
        total: processes.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get processes' });
    }
  });

  router.post('/processes/:pid/kill', async (req, res) => {
    try {
      const { pid } = req.params;
      await execAsync(`kill ${pid}`);
      res.json({ success: true, pid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to kill process' });
    }
  });

  // ============ DISK USAGE ANALYZER ============
  
  router.get('/disk/usage', async (req, res) => {
    try {
      const { path: targetPath = '/' } = req.query;
      const result = await execAsync(`du -h --max-depth=1 "${targetPath}" 2>/dev/null | sort -hr`);
      
      const usage = result.stdout.split('\n').filter(Boolean).map(line => {
        const [size, ...pathParts] = line.split('\t');
        return { size, path: pathParts.join('\t') };
      });

      res.json({ usage, total: usage.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze disk usage' });
    }
  });

  // ============ AUTHENTICATION (Simplified) ============
  
  const JWT_SECRET = process.env.JWT_SECRET || 'nexus-secret-key-change-in-production';
  const users = new Map([
    ['admin', { password: 'admin123', role: 'admin', createdAt: Date.now() }]
  ]);

  router.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.get(username);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      token,
      user: { username, role: user.role },
      expiresIn: 86400
    });
  });

  router.post('/auth/register', (req, res) => {
    const { username, password, role = 'user' } = req.body;
    
    if (users.has(username)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    users.set(username, { password, role, createdAt: Date.now() });
    const token = jwt.sign({ username, role }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ token, user: { username, role }, expiresIn: 86400 });
  });

  router.get('/auth/verify', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ valid: false });
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.json({ valid: true, user: decoded });
    } catch {
      res.status(401).json({ valid: false });
    }
  });

  // ============ METRICS (Prometheus format) ============
  
  router.get('/metrics', async (req, res) => {
    try {
      const si = await import('systeminformation');
      const [cpu, mem, disk] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize()
      ]);

      const metrics = `
# HELP nexus_cpu_usage Current CPU usage percentage
# TYPE nexus_cpu_usage gauge
nexus_cpu_usage ${cpu.currentLoad}

# HELP nexus_memory_usage Memory usage in bytes
# TYPE nexus_memory_usage gauge
nexus_memory_usage{type="used"} ${mem.used}
nexus_memory_usage{type="free"} ${mem.free}
nexus_memory_usage{type="total"} ${mem.total}

# HELP nexus_disk_usage Disk usage percentage
# TYPE nexus_disk_usage gauge
nexus_disk_usage{mount="${disk[0]?.mount || '/'}"} ${disk[0]?.use || 0}

# HELP nexus_documents_total Total documents in RAG system
# TYPE nexus_documents_total gauge
nexus_documents_total ${documents.size}
`;

      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      res.status(500).send('Error collecting metrics');
    }
  });

  // ============ HEALTH CHECK ============
  
  router.get('/health', async (req, res) => {
    try {
      const si = await import('systeminformation');
      const [cpu, mem] = await Promise.all([
        si.currentLoad(),
        si.mem()
      ]);

      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: Date.now(),
        services: {
          api: 'up',
          ollama: 'unknown', // Check separately
          docker: 'unknown'  // Check separately
        },
        system: {
          cpu: `${cpu.currentLoad.toFixed(1)}%`,
          memory: `${((mem.used / mem.total) * 100).toFixed(1)}%`
        }
      });
    } catch (error) {
      res.status(503).json({ status: 'unhealthy', error: String(error) });
    }
  });

  return router;
}