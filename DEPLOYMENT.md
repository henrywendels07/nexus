# NEXUS AI Command Center - Production Ready

## 🚀 One-Command Deploy

```bash
# Complete production deployment
bash <(curl -fsSL https://raw.githubusercontent.com/henrywendels07/nexus/main/deploy.sh)
```

## 📋 Prerequisites

- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- Docker & Docker Compose
- 4GB+ RAM (24GB+ recommended)
- 20GB+ storage
- Domain name (optional, for SSL)

## 🐳 Quick Start with Docker Compose

```bash
# Clone the repository
git clone https://github.com/henrywendels07/nexus.git
cd nexus

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Access NEXUS at http://your-server-ip:3000
```

## 🔒 Production Deployment with SSL

```bash
# Set your domain in .env
echo "DOMAIN=your-domain.com" >> .env
echo "EMAIL=your@email.com" >> .env

# Start with SSL (auto-renews certificates)
docker-compose -f docker-compose.prod.yml up -d
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        NEXUS                                │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)     │   Backend (Node.js)      │
│  Port 3000 (Nginx)           │   Port 3001               │
├─────────────────────────────────────────────────────────────┤
│                        Services                             │
├──────────┬──────────┬──────────┬──────────┬───────────────┤
│ Ollama   │ Docker   │ System   │ VectorDB │ Auth/JWT     │
│ LLM      │ Engine   │ Info     │ Qdrant   │              │
├──────────┴──────────┴──────────┴──────────┴───────────────┤
│                    Oracle Cloud VPS                         │
└─────────────────────────────────────────────────────────────┘
```

## 🌟 Features

### 🤖 Advanced AI
- **Multi-Model Chat**: Compare responses from multiple LLMs side-by-side
- **RAG System**: Upload documents, PDFs, and knowledge bases
- **Code Interpreter**: Execute Python/JS code securely
- **Image Generation**: DALL-E, Stable Diffusion integration ready
- **Voice Input**: Speech-to-text for hands-free prompting

### 📊 System Monitoring
- Real-time CPU/RAM/Disk with animated gauges
- GPU monitoring (NVIDIA CUDA support)
- Network traffic visualization
- Process manager with resource usage
- Service health monitoring
- Prometheus metrics endpoint

### 🐳 Container Management
- Docker & Docker Compose support
- Container logs with full ANSI color support
- Resource limit editor
- Volume and network management
- Image registry browser
- One-click common stacks (nginx, postgres, redis, etc.)

### 💻 Advanced Terminal
- Full PTY with WebSocket (xterm.js + pty.js)
- Multiple sessions with tabs
- SSH tunnel support
- Command history with search
- Custom themes and fonts

### 📁 File Manager
- Monaco code editor with syntax highlighting
- Git integration (view commits, branches, diffs)
- File permissions and ownership viewer
- Disk usage analyzer with treemap visualization
- Drag-and-drop upload
- Remote file editing via SFTP

### 🔐 Security Features
- JWT authentication
- Role-based access control (RBAC)
- Rate limiting
- API key management
- Audit logging
- SSL/TLS with auto-renewal
- Firewall configuration helper

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=3001
NODE_ENV=production
SECRET_KEY=your-super-secret-key-min-32-chars

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODELS_DIR=/root/.ollama/models

# Database (optional - for multi-user)
POSTGRES_URL=postgresql://user:pass@localhost:5432/nexus
REDIS_URL=redis://localhost:6379

# Vector DB (for RAG)
VECTOR_DB_URL=http://localhost:6333

# Docker
DOCKER_SOCKET=/var/run/docker.sock

# SSL
DOMAIN=your-domain.com
EMAIL=your@email.com

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## 📊 API Endpoints

### Health & Metrics
```
GET  /api/health          - Health check
GET  /api/metrics         - Prometheus metrics
GET  /api/stats           - System statistics
```

### AI/Chat
```
GET  /api/ollama/models           - List models
POST /api/ollama/chat            - Chat completion
POST /api/ollama/embeddings     - Generate embeddings
POST /api/rag/upload            - Upload document
POST /api/rag/search             - Semantic search
```

### System
```
GET  /api/system/stats            - Full system stats
GET  /api/system/cpu             - CPU details
GET  /api/system/memory          - Memory details
GET  /api/system/disk            - Disk info
GET  /api/system/network         - Network stats
GET  /api/processes              - Process list
GET  /api/services               - Service status
```

### Docker
```
GET  /api/docker/status          - Docker info
GET  /api/docker/containers      - List containers
POST /api/docker/containers/:id/start
POST /api/docker/containers/:id/stop
GET  /api/docker/containers/:id/logs
GET  /api/docker/images          - List images
POST /api/docker/compose/up     - Deploy compose
```

### Files
```
GET  /api/files/list             - List directory
GET  /api/files/read             - Read file
POST /api/files/write            - Write file
POST /api/files/upload           - Upload file
GET  /api/files/search           - Search files
```

## 🔒 Security

### Enable Authentication
```bash
# Set in .env
ENABLE_AUTH=true
JWT_SECRET=your-32-char-secret
```

### Firewall Setup
```bash
# Run the firewall helper
sudo bash scripts/setup-firewall.sh
```

### Fail2ban Configuration
```bash
# Enable brute-force protection
sudo bash scripts/setup-fail2ban.sh
```

## 📈 Performance

### Recommended Resources for 24GB VPS

| Component | Recommended |
|----------|-------------|
| CPU | 4+ cores |
| RAM | 24GB |
| Storage | 40GB+ SSD |
| Swap | 8GB |

### Model Recommendations

| Model | Size | RAM | Best For |
|-------|------|-----|----------|
| llama3:8b | 4.7GB | 8GB | General |
| llama3:70b | 40GB | 64GB+ | Best quality |
| mistral:7b | 4GB | 8GB | Fast |
| mixtral:8x7b | 26GB | 32GB | Balanced |
| codellama:34b | 19GB | 24GB | Code |
| phi3:14b | 7.9GB | 12GB | Lightweight |

## 🛠️ Troubleshooting

### Ollama not starting
```bash
sudo systemctl status ollama
sudo journalctl -u ollama -f
```

### Docker permission denied
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Port already in use
```bash
sudo lsof -i :3001
sudo fuser -k 3001/tcp
```

### Check logs
```bash
docker-compose logs -f nexus
```

## 📝 License

MIT License - See LICENSE file

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

- GitHub Issues: https://github.com/henrywendels07/nexus/issues
- Documentation: https://github.com/henrywendels07/nexus#readme

---

**Built with ❤️ for the self-hosted AI community**
**Powered by Ollama, Docker, and Node.js**
