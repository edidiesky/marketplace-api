#!/bin/bash
set -e

COMPOSE_FILE="_infrastructure/docker/development/docker-compose.dev.yml"
ENV_FILE=".env"
DC="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"

[ ! -f "$ENV_FILE" ] && echo "ERROR: .env not found" && exit 1

case "${1:-up}" in
  up)
    $DC up -d
    ;;
  build)
    COMPOSE_PARALLEL_LIMIT=${2:-3} $DC build --no-cache
    ;;
  restart)
    $DC down --remove-orphans
    $DC up -d
    ;;
  logs)
    $DC logs -f ${2:-}
    ;;
  ps)
    $DC ps
    ;;
  clean)
    read -p "Remove all volumes? (y/N): " c
    [ "$c" = "y" ] && $DC down -v --remove-orphans
    ;;
  down)
    $DC down --remove-orphans
    ;;
  fix-deps)
    for dir in backend/*/; do
      pkg="${dir}package.json"
      [ ! -f "$pkg" ] && continue
      echo "Patching $pkg"
      node -e "
        const fs = require('fs');
        const p = JSON.parse(fs.readFileSync('$pkg', 'utf8'));
        const ver = p.devDependencies?.dotenv || '^16.4.5';
        if (p.devDependencies) delete p.devDependencies.dotenv;
        p.dependencies = p.dependencies || {};
        p.dependencies.dotenv = ver;
        fs.writeFileSync('$pkg', JSON.stringify(p, null, 2) + '\n');
      "
      (cd "$dir" && npm install --package-lock-only --silent)
    done
    echo "Done. Run: ./dev.sh build"
    ;;
  *)
    echo "Usage: ./dev.sh [up|down|build [limit]|restart|logs [svc]|ps|clean|fix-deps]"
    ;;
esac