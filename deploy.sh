#!/bin/bash
set -e

echo "🚀 NEXUS Production Deployment Script"
echo "===================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "⚠️ Please run as root or with sudo"
  exit 1
fi

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo_step() {
  echo -e "${GREEN}✓${NC} $1"
}

echo_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

echo_error() {
  echo -e "${RED}✗${NC} $1"
}

# Detect OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  echo_error "Cannot detect OS"
  exit 1
fi

echo "📦 Detected OS: $OS"

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo "📦 Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo_step "Docker installed"
else
  echo_step "Docker already installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
  echo "📦 Installing Docker Compose..."
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  echo_step "Docker Compose installed"
else
  echo_step "Docker Compose already installed"
fi

# Add current user to docker group
if ! groups $USER | grep -q docker; then
  echo_warning "Adding user to docker group"
  usermod -aG docker $USER
  echo_step "User added to docker group"
fi

# Install Ollama if not present
if ! command -v ollama &> /dev/null; then
  echo "📦 Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
  systemctl enable ollama
  systemctl start ollama
  echo_step "Ollama installed"
  
  echo "📥 Pulling default models..."
  ollama pull llama3
  ollama pull mistral
  echo_step "Default models pulled"
else
  echo_step "Ollama already installed"
fi

# Clone or update repository
if [ -d "/opt/nexus" ]; then
  echo "📦 Updating NEXUS..."
  cd /opt/nexus
  git pull
else
  echo "📦 Cloning NEXUS repository..."
  git clone https://github.com/henrywendels07/nexus.git /opt/nexus
  cd /opt/nexus
fi

# Create necessary directories
mkdir -p /opt/nexus/data /opt/nexus/uploads /opt/nexus/nginx/ssl /opt/nexus/data/certbot/conf /opt/nexus/data/certbot/www

# Copy environment file
if [ ! -f /opt/nexus/.env ]; then
  cp /opt/nexus/.env.example /opt/nexus/.env
  echo_warning "Please edit /opt/nexus/.env and set your JWT_SECRET"
fi

# Build and start containers
echo "🐳 Building and starting Docker containers..."
docker-compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service status
if docker-compose ps | grep -q "Up"; then
  echo_step "Services started successfully"
else
  echo_error "Some services failed to start"
  docker-compose logs
  exit 1
fi

# Setup firewall (optional)
read -p "Would you like to setup UFW firewall? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📦 Setting up firewall..."
  apt install -y ufw
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow ssh
  ufw allow 80/tcp
  ufw allow 443/tcp
  echo "y" | ufw enable
  echo_step "Firewall configured"
fi

# Get IP address
IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "===================================="
echo -e "${GREEN}✅ NEXUS deployed successfully!${NC}"
echo "===================================="
echo ""
echo "🌐 Access NEXUS at: http://${IP}:3000"
echo "📊 API at: http://${IP}:3001"
echo "🤖 Ollama at: http://${IP}:11434"
echo ""
echo "📝 Useful Commands:"
echo "  cd /opt/nexus"
echo "  docker-compose logs -f        # View logs"
echo "  docker-compose restart        # Restart services"
echo "  docker-compose down           # Stop services"
echo "  docker-compose pull            # Update containers"
echo ""
echo "📖 Documentation: https://github.com/henrywendels07/nexus"
echo ""
