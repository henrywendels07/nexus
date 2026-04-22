import { Router } from 'express';
import Docker from 'dockerode';
import { Server } from 'socket.io';
import { Readable } from 'stream';

const router = Router();
let docker: Docker;

try {
  docker = process.platform === 'win32' ? new Docker({ socketPath: '//./pipe/docker_engine' }) : new Docker({ socketPath: '/var/run/docker.sock' });
} catch { console.warn('Docker not available'); }

export function setupDockerRoutes(io: Server) {
  router.get('/status', async (req, res) => {
    try {
      if (!docker) throw new Error('Docker not configured');
      const info = await docker.info();
      res.json({ status: 'online', version: info.NCPU, containers: info.Containers, running: info.ContainersRunning });
    } catch (error) {
      res.json({ status: 'offline', error: String(error) });
    }
  });

  router.get('/containers', async (req, res) => {
    try {
      if (!docker) throw new Error('Docker not available');
      const containers = await docker.listContainers({ all: true });
      res.json(containers.map(c => ({ id: c.Id, name: c.Names[0]?.replace(/^\//, ''), image: c.Image, state: c.State, status: c.Status, ports: c.Ports })));
    } catch (error) {
      res.status(500).json({ error: 'Failed to list containers' });
    }
  });

  router.post('/containers/:id/start', async (req, res) => {
    try {
      if (!docker) throw new Error('Docker not available');
      await docker.getContainer(req.params.id).start();
      io.emit('container:update', { id: req.params.id, action: 'start' });
      res.json({ success: true });
    } catch { res.status(500).json({ error: 'Failed to start container' }); }
  });

  router.post('/containers/:id/stop', async (req, res) => {
    try {
      if (!docker) throw new Error('Docker not available');
      await docker.getContainer(req.params.id).stop();
      io.emit('container:update', { id: req.params.id, action: 'stop' });
      res.json({ success: true });
    } catch { res.status(500).json({ error: 'Failed to stop container' }); }
  });

  router.get('/containers/:id/logs', async (req, res) => {
    try {
      if (!docker) throw new Error('Docker not available');
      const logs = await docker.getContainer(req.params.id).logs({ stdout: true, stderr: true, tail: 100, timestamps: true });
      res.json({ logs: logs.toString('utf8') });
    } catch { res.status(500).json({ error: 'Failed to get logs' }); }
  });

  router.delete('/containers/:id', async (req, res) => {
    try {
      if (!docker) throw new Error('Docker not available');
      await docker.getContainer(req.params.id).remove({ force: true });
      io.emit('container:update', { id: req.params.id, action: 'remove' });
      res.json({ success: true });
    } catch { res.status(500).json({ error: 'Failed to remove container' }); }
  });

  router.post('/images/pull', async (req, res) => {
    try {
      if (!docker) throw new Error('Docker not available');
      const { image, tag = 'latest' } = req.body;
      res.setHeader('Content-Type', 'text/event-stream');
      await new Promise<void>((resolve, reject) => {
        docker.pull(`${image}:${tag}`, (err: Error, stream: Readable) => {
          if (err) { reject(err); return; }
          docker.modem.followProgress(stream, (progressErr: Error) => {
            if (progressErr) reject(progressErr); else resolve();
          }, (event: any) => res.write(JSON.stringify(event) + '\n'));
        });
      });
      res.end();
    } catch { res.status(500).json({ error: 'Failed to pull image' }); }
  });


  return router;
}