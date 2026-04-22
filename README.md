# NEXUS - Self-Hosted AI Development Platform

🚀 **The Ultimate Self-Hosted AI Command Center** for Oracle Cloud VPS and any Linux VPS with 24GB+ RAM.

Transform your VPS into a complete AI development environment with local LLM models, real-time system monitoring, Docker management, terminal access, and more - all through a stunning cyberpunk-themed web interface.

![NEXUS Dashboard](https://img.shields.io/badge/NEXUS-AI%20Command%20Center-00D9FF?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-6366F1?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-10B981?style=for-the-badge)

## ✨ Features

### 🤖 AI Chat Interface
- Chat with local LLM models via **Ollama**
- Model selection (Llama 3, Mistral, CodeLlama, Phi3, Gemma, Mixtral, etc.)
- Real-time streaming responses
- Markdown rendering with code syntax highlighting
- Conversation history with search
- System prompt customization

### 📊 System Dashboard
- Real-time CPU/RAM/Disk monitoring with animated gauges
- Network traffic visualization
- Running services status
- Uptime and load averages
- Interactive charts with historical data
- Temperature monitoring (if available)

### 🐳 Docker Management
- Container list with status indicators
- Start/Stop/Restart/Remove containers
- View logs with streaming
- Pull images from registry
- Container resource usage monitoring
- One-click common actions

### 💻 Terminal Emulator
- Web-based terminal (xterm.js)
- Multiple tabs support
- Connection status indicator
- Command history

### 📁 File Manager
- Browser-based file explorer
- Upload/Download files
- Preview for images, code, markdown
- Directory creation and navigation
- Search functionality

### ⚙️ Settings
- Ollama model management (pull/delete models)
- Theme customization
- API access control
- Data export/import/backup

## 🎨 Design

- **Cyberpunk-inspired dark theme** with electric cyan accents
- Glass-morphism panels with backdrop blur
- Animated gauges and glowing effects
- Responsive sidebar navigation
- Professional Orbitron typography

## 🚀 Quick Start

### Prerequisites

1. **Oracle Cloud VPS** (or any Linux VPS) with:
   - Ubuntu 20.04+ / Debian 11+
   - 4GB+ RAM (24GB recommended for larger models)
   - 20GB+ storage
   - Node.js 18+
   - Docker (optional but recommended)

2. **Ollama** installed and running
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull llama3
   ```

### One-Command Installation

```bash
curl -fsSL https://raw.githubusercontent.com/henrywendels07/nexus/main/install.sh | bash
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/henrywendels07/nexus.git
cd nexus

# Install dependencies
npm run install-deps

# Start the application
npm run dev
```

The app will be available at:
- **Frontend:** http://your-vps-ip:5173
- **Backend API:** http://your-vps-ip:3001

### Production Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3001
OLLAMA_HOST=http://localhost:11434
HOME=/root
NODE_ENV=production
```

## 📁 Project Structure

```
nexus/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand stores
│   │   └── App.tsx          # Main app
│   ├── public/
│   └── package.json
├── server/                  # Express backend
│   ├── routes/              # API routes
│   ├── services/            # Background services
│   └── index.ts             # Server entry
├── SPEC.md                  # Design specification
└── package.json             # Root config
```

## 🛠️ API Reference

### Ollama Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ollama/models` | List available models |
| GET | `/api/ollama/status` | Check Ollama status |
| POST | `/api/ollama/chat` | Send chat message |
| POST | `/api/ollama/pull` | Pull a model |
| DELETE | `/api/ollama/models/:name` | Delete a model |

### System Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/stats` | Get system stats |
| GET | `/api/system/cpu` | CPU details |
| GET | `/api/system/memory` | Memory details |

### Docker Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/docker/status` | Docker status |
| GET | `/api/docker/containers` | List containers |
| POST | `/api/docker/containers/:id/start` | Start container |
| POST | `/api/docker/containers/:id/stop` | Stop container |

## 🌟 Recommended Models

For a 24GB VPS, we recommend:

| Model | Size | Best For |
|-------|------|----------|
| `llama3` | 4.7GB | General purpose, coding |
| `mistral` | 4GB | Fast, efficient |
| `codellama` | 3.8GB | Code generation |
| `phi3` | 2.3GB | Lightweight tasks |
| `gemma:2b` | 1.4GB | Very lightweight |

## 🔒 Security

- Run behind a reverse proxy with SSL
- Enable firewall: `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`
- Consider using fail2ban for brute-force protection

## 📝 License

MIT License - feel free to use, modify, and distribute.

---

**Built with ❤️ for the self-hosted AI community**