#!/bin/bash
set -e

echo "🔒 NEXUS Security Setup"
echo "========================"

# Install UFW if not present
if ! command -v ufw &> /dev/null; then
  echo "📦 Installing UFW..."
  apt update && apt install -y ufw
fi

# Set default policies
echo "📝 Configuring firewall rules..."
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (prevent lockout)
echo "🔑 Allowing SSH (port 22)..."
ufw allow 22/tcp comment 'SSH'

# Allow HTTP/HTTPS
echo "🌐 Allowing HTTP/HTTPS (ports 80, 443)..."
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow custom ports (NEXUS)
echo "🚀 Allowing NEXUS ports (3000, 3001, 11434)..."
ufw allow 3000/tcp comment 'NEXUS Frontend'
ufw allow 3001/tcp comment 'NEXUS API'
ufw allow 11434/tcp comment 'Ollama'

# Enable firewall
echo "✅ Enabling firewall..."
echo "y" | ufw enable

# Show status
echo ""
echo "📊 Firewall Status:"
ufw status numbered

# Install Fail2ban
echo ""
echo "📦 Installing Fail2ban..."
apt install -y fail2ban

# Configure Fail2ban for NEXUS
cat > /etc/fail2ban/jail.local << 'EOF'
[nexus-api]
enabled = true
port = 3001
filter = nexus-api
logpath = /var/log/nginx/access.log
maxretry = 10
findtime = 10
bantime = 3600
action = iptables-allports

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600
EOF

# Create Fail2ban filter
cat > /etc/fail2ban/filter.d/nexus-api.conf << 'EOF'
[Definition]
failregex = ^<HOST>.*" 401
            ^<HOST>.*Invalid token
ignoreregex =
EOF

systemctl enable fail2ban
systemctl start fail2ban

echo ""
echo "✅ Security setup complete!"
echo ""
echo "📊 Fail2ban Status:"
systemctl status fail2ban --no-pager | head -5
