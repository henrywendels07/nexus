#!/bin/bash
set -e

echo "🚀 NEXUS Update Script"
echo "======================"

cd /opt/nexus

git pull

docker-compose pull
docker-compose up -d --build

docker-compose restart nexus

echo "✅ Update complete!"
docker-compose ps
