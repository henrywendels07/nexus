import { Router } from 'express';
import si from 'systeminformation';
import os from 'os';
import { Server } from 'socket.io';

const router = Router();
export function setupSystemRoutes(io: Server) {
  router.get('/stats', async (req, res) => {
    try {
      const [cpu, mem, disk, network] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize(), si.networkStats()]);
      const stats = {
        cpu: { usage: cpu.currentLoad.toFixed(1), cores: cpu.cpus?.length || os.cpus().length },
        memory: { total: mem.total, used: mem.used, free: mem.free, percent: ((mem.used / mem.total) * 100).toFixed(1) },
        disk: disk.map(d => ({ fs: d.fs, size: d.size, used: d.used, available: d.available, percent: d.use.toFixed(1) }))[0] || { size: 0, used: 0, available: 0, percent: '0' },
        network: { rx: network[0]?.rx_sec || 0, tx: network[0]?.tx_sec || 0, totalRx: network[0]?.rx_bytes || 0, totalTx: network[0]?.tx_bytes || 0 },
        uptime: os.uptime(),
        load: os.loadavg()
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get system stats' });
    }
  });

  router.get('/cpu', async (req, res) => {
    try {
      const [currentLoad, cpuSpeed] = await Promise.all([si.currentLoad(), si.cpuSpeed()]);
      res.json({ currentLoad: currentLoad.currentLoad.toFixed(1), cores: currentLoad.cpus?.map(c => ({ load: c.load.toFixed(1), core: c.core })) || [], speed: { min: cpuSpeed.min, max: cpuSpeed.max, avg: cpuSpeed.avg } });
    } catch { res.status(500).json({ error: 'Failed to get CPU info' }); }
  });

  router.get('/memory', async (req, res) => {
    try {
      const mem = await si.mem();
      res.json({ total: mem.total, used: mem.used, free: mem.free, available: mem.available, percent: ((mem.used / mem.total) * 100).toFixed(1) });
    } catch { res.status(500).json({ error: 'Failed to get memory info' }); }
  });

  return router;
}