#!/bin/bash
set -e
echo "🚀 Installing NEXUS - AI Command Center..."
if [ "$EUID" -ne 0 ]; then echo "⚠️ Please run as root or with sudo"; exit 1; fi
echo "📦 Checking prerequisites..."
if ! command -v node &> /dev/null; then curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs; fi
if ! command -v docker &> /dev/null; then curl -fsSL https://get.docker.com | sh; fi
if ! command -v ollama &> /dev/null; then curl -fsSL https://ollama.com/install.sh | sh && ollama pull llama3; fi
if [ -d "/opt/nexus" ]; then cd /opt/nexus && git pull; else git clone https://github.com/henrywendels07/nexus.git /opt/nexus && cd /opt/nexus; fi
npm run install-deps
cat > /etc/systemd/system/nexus.service << 'EOF'
[Unit]
Description=NEXUS AI Command Center
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nexus
ExecStart=npm run dev
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable nexus && systemctl start nexus
echo "✅ NEXUS installed! Access at: http://$(curl -s ifconfig.me):5173"
