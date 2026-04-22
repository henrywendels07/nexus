import { Router } from 'express';
import fetch from 'node-fetch';
import { Server } from 'socket.io';

const router = Router();
export function setupOllamaRoutes(io: Server) {
  const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const OLLAMA_API = `${OLLAMA_HOST}/api`;

  router.get('/models', async (req, res) => {
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/tags`);
      const data = await response.json() as { models?: { name: string; size: number; modified_at: string }[] };
      res.json(data.models || []);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch models' });
    }
  });

  router.get('/status', async (req, res) => {
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/tags`);
      if (response.ok) res.json({ status: 'online', host: OLLAMA_HOST });
      else res.json({ status: 'offline', host: OLLAMA_HOST });
    } catch {
      res.json({ status: 'offline', host: OLLAMA_HOST });
    }
  });

  router.post('/chat', async (req, res) => {
    try {
      const { model, messages, temperature = 0.7, stream = false } = req.body;
      const response = await fetch(`${OLLAMA_API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream, options: { temperature, num_predict: 4096 } })
      });


      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const streamChat = async () => {
          try {
            while (true) {
              const { done, value } = await reader!.read();
              if (done) break;
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(Boolean);
              for (const line of lines) {
                try {
                  const data = JSON.parse(line);
                  res.write(`data: ${JSON.stringify(data)}\n\n`);
                  io.emit('ollama:chunk', data);
                } catch { /* Skip invalid */ }
              }
            }
            res.end();
          } catch { res.end(); }
        };
        streamChat();
      } else {
        const data = await response.json();
        res.json(data);
      }
    } catch (error) {
      res.status(500).json({ error: 'Chat failed' });
    }
  });

  router.post('/pull', async (req, res) => {
    try {
      const { name } = req.body;
      const response = await fetch(`${OLLAMA_API}/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, stream: true })
      });
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      response.body?.pipe(res);
    } catch (error) {
      res.status(500).json({ error: 'Model pull failed' });
    }
  });

  router.delete('/models/:model', async (req, res) => {
    try {
      await fetch(`${OLLAMA_API}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: req.params.model })
      });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete model' });
    }
  });

  return router;
}