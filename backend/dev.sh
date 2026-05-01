
COMPOSE_FILE="_infrastructure/docker/development/docker-compose.dev.yml"
PROJECT_NAME="marketplace"

case "$1" in
  up)
    echo "Starting all services..."
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d "${@:2}"
    ;;

  down)
    echo "Stopping all services..."
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME down "${@:2}"
    ;;

  restart)
    SERVICE=$2
    if [ -z "$SERVICE" ]; then
      echo "Restarting all services..."
      docker compose -f $COMPOSE_FILE -p $PROJECT_NAME restart
    else
      echo "Restarting $SERVICE..."
      docker compose -f $COMPOSE_FILE -p $PROJECT_NAME restart $SERVICE
    fi
    ;;

  logs)
    SERVICE=$2
    if [ -z "$SERVICE" ]; then
      docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f --tail=100
    else
      docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f --tail=100 $SERVICE
    fi
    ;;

  ps)
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
    ;;

  build)
    SERVICE=$2
    if [ -z "$SERVICE" ]; then
      echo "Rebuilding all services..."
      docker compose -f $COMPOSE_FILE -p $PROJECT_NAME build --no-cache
    else
      echo "Rebuilding $SERVICE..."
      docker compose -f $COMPOSE_FILE -p $PROJECT_NAME build --no-cache $SERVICE
    fi
    ;;

  fresh)
    echo "Tearing down and rebuilding everything from scratch..."
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME down -v --remove-orphans
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d --build
    ;;

  exec)
    SERVICE=$2
    shift 2
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME exec $SERVICE "$@"
    ;;

  *)
    echo "Usage: ./dev.sh [command] [service?]"
    echo ""
    echo "Commands:"
    echo "  up              Start all services"
    echo "  up payment      Start only payment service"
    echo "  down            Stop all services"
    echo "  down -v         Stop all and delete volumes"
    echo "  restart         Restart all services"
    echo "  restart payment Restart only payment service"
    echo "  logs            Tail logs for all services"
    echo "  logs payment    Tail logs for payment service only"
    echo "  ps              Show running containers and their status"
    echo "  build           Rebuild all images (no cache)"
    echo "  build payment   Rebuild only payment image"
    echo "  fresh           Full teardown + rebuild + start"
    echo "  exec payment sh Open shell in payment container"
    ;;
esac