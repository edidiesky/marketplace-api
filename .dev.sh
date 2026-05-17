#!/bin/bash

# Selleasi dev startup script
# Run from the monorepo root
# Usage: chmod +x dev.sh && ./dev.sh

set -e

COMPOSE_FILE="_infrastructure/docker/dev/docker-compose.dev.yml"
ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Root .env not found. Create it first."
  exit 1
fi

case "${1:-up}" in
  up)
    echo "Starting Selleasi dev environment..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
    echo ""
    echo "Services starting. Check status with: ./dev.sh ps"
    echo ""
    echo "Endpoints:"
    echo "  App:        http://localhost"
    echo "  API:        http://localhost:8000"
    echo "  RabbitMQ:   http://localhost:15672"
    echo "  Grafana:    http://localhost:3001"
    echo "  Prometheus: http://localhost:9091"
    echo "  Kibana:     not included"
    ;;
  down)
    echo "Stopping Selleasi dev environment..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    ;;
  restart)
    echo "Restarting Selleasi dev environment..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
    ;;
  logs)
    SERVICE=${2:-""}
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f $SERVICE
    ;;
  ps)
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    ;;
  clean)
    echo "WARNING: This removes all volumes and containers."
    read -p "Are you sure? (y/N): " confirm
    if [ "$confirm" = "y" ]; then
      docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v --remove-orphans
      echo "Clean complete."
    fi
    ;;
  *)
    echo "Usage: ./dev.sh [up|down|restart|logs [service]|ps|clean]"
    ;;
esac