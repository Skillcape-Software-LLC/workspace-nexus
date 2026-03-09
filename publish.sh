#!/usr/bin/env bash
set -euo pipefail

echo "Building Nexus Docker images..."
docker compose build

echo ""
echo "Done. Run 'docker compose up -d' to start."
