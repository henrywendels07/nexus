import Docker from 'dockerode';
import { Server } from 'socket.io';

let docker: Docker;
let dockerInterval: NodeJS.Timeout | null = null;
const containersState: Map<string, any> = new Map();

export function startDockerMonitor(io: Server) {
  try {
    docker = process.platform === 'win32' ? new Docker({ socketPath: '//./pipe/docker_engine' }) : new Docker({ socketPath: '/var/run/docker.sock' });
    checkDockerStatus(io);
    dockerInterval = setInterval(() => checkDockerStatus(io), 5000);
    console.log('Docker monitor started');
  } catch { console.warn('Docker not available for monitoring'); }
}

async function checkDockerStatus(io: Server) {
  if (!docker) return;
  try {
    const containers = await docker.listContainers({ all: true });
    const containerList = containers.map(c => ({ id: c.Id.substring(0, 12), name: c.Names[0]?.replace(/^\//, '') || c.Id.substring(0, 12), image: c.Image, state: c.State, status: c.Status, ports: c.Ports.map(p => ({ private: p.PrivatePort, public: p.PublicPort, type: p.Type })) }));
    containerList.forEach(container => {
      const prev = containersState.get(container.id);
      if (!prev || prev.state !== container.state) {
        io.emit('container:update', { id: container.id, name: container.name, state: container.state, action: prev ? (container.state === 'running' ? 'started' : 'stopped') : 'created' });
      }
      containersState.set(container.id, container);
    });
    io.emit('docker:containers', containerList);
  } catch { /* Silent fail */ }
}

export function stopDockerMonitor() {
  if (dockerInterval) { clearInterval(dockerInterval); dockerInterval = null; }
}