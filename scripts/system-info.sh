#!/bin/bash
set -e

echo "📊 NEXUS System Information"
echo "=========================="
echo ""

# System info
echo "🖥️  System Information"
echo "  Hostname: $(hostname)"
echo "  OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "  Kernel: $(uname -r)"
echo "  Uptime: $(uptime -p)"
echo ""

# Resources
echo "💾 Memory Usage"
free -h
echo ""

echo "💿 Disk Usage"
df -h / | tail -1
echo ""

echo "🔧 CPU"
echo "  Model: $(cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d':' -f2 | xargs)"
echo "  Cores: $(nproc)"
echo "  Load: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# Docker
echo "🐳 Docker Status"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  Docker not running"
echo ""

# Ollama
echo "🤖 Ollama Models"
if command -v ollama &> /dev/null; then
  ollama list 2>/dev/null || echo "  No models installed"
else
  echo "  Ollama not installed"
fi
echo ""

# NEXUS Status
echo "🌐 NEXUS Status"
curl -s http://localhost:3001/api/health 2>/dev/null | jq . || echo "  NEXUS API not responding"
