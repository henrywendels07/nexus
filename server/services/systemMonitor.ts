import si from 'systeminformation';
import os from 'os';
import { Server } from 'socket.io';

let statsInterval: NodeJS.Timeout | null = null;
const history = { timestamps: [] as number[], cpu: [] as number[], memory: [] as number[], network: [] as { rx: number; tx: number }[] };

export function startSystemMonitor(io: Server) {
  emitStats(io);
  statsInterval = setInterval(() => emitStats(io), 2000);
  console.log('System monitor started');
}

async function emitStats(io: Server) {
  try {
    const [load, mem, network, disk] = await Promise.all([si.currentLoad(), si.mem(), si.networkStats(), si.fsSize()]);
    const now = Date.now();
    history.timestamps.push(now);
    history.cpu.push(load.currentLoad);
    history.memory.push((mem.used / mem.total) * 100);
    history.network.push({ rx: network[0]?.rx_sec || 0, tx: network[0]?.tx_sec || 0 });
    if (history.timestamps.length > 60) { history.timestamps.shift(); history.cpu.shift(); history.memory.shift(); history.network.shift(); }


    const stats = {
      timestamp: now,
      cpu: { current: load.currentLoad.toFixed(1), cores: load.cpus?.length || os.cpus().length, perCore: load.cpus?.map(c => c.load.toFixed(1)) || [] },
      memory: { total: mem.total, used: mem.used, free: mem.free, available: mem.available, percent: ((mem.used / mem.total) * 100).toFixed(1) },
      disk: disk.map(d => ({ mount: d.mount, size: d.size, used: d.used, available: d.available, percent: d.use.toFixed(1) }))[0],
      network: { rx: network[0]?.rx_sec || 0, tx: network[0]?.tx_sec || 0, totalRx: network[0]?.rx_bytes || 0, totalTx: network[0]?.tx_bytes || 0 },
      load: os.loadavg(),
      uptime: os.uptime(),
      history
    };
    io.emit('system:stats', stats);
  } catch (error) {
    console.error('Error emitting system stats:', error);
  }
}

export function stopSystemMonitor() {
  if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
}