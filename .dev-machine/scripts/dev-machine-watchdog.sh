#!/usr/bin/env bash
# ridecast2 Dev Machine Watchdog (every 15 min via cron on macOS HOST)
# Checks container health, restarts if needed.

PROJECT_DIR="/Users/chrispark/Projects/ridecast2"
COMPOSE_FILE="$PROJECT_DIR/.dev-machine/docker-compose.dev-machine.yaml"
LOG_FILE="$PROJECT_DIR/.dev-machine/dev-machine-watchdog.log"
COMMIT_MARKER="$PROJECT_DIR/.watchdog-last-commit"
HEARTBEAT_FILE="$PROJECT_DIR/.dev-machine-heartbeat"
HEARTBEAT_MAX_AGE=3600

cd "$PROJECT_DIR" || exit 1

touch "$LOG_FILE" 2>/dev/null || { echo "FATAL: cannot write to $LOG_FILE" >&2; exit 1; }

# Log rotation
if [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE")" -gt 500 ]; then
    tail -200 "$LOG_FILE" > "$LOG_FILE.tmp"
    mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

log() {
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*" >> "$LOG_FILE"
}

log "--- watchdog check start ---"

# 1. Is the container running?
CONTAINER_STATUS=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.loads(sys.stdin.read())
    if isinstance(data, list):
        data = data[0] if data else {}
    print(data.get('State', 'unknown'))
except:
    print('unknown')
" 2>/dev/null || echo "unknown")

if [ "$CONTAINER_STATUS" != "running" ]; then
    log "RESTART: container not running (state: $CONTAINER_STATUS)"
    docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    docker compose -f "$COMPOSE_FILE" up -d dev-machine 2>> "$LOG_FILE"
    log "Container restarted"
    exit 0
fi

log "Container is running"

# 2. Is the container making progress?
CURRENT_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
LAST_KNOWN=""
if [ -f "$COMMIT_MARKER" ]; then
    LAST_KNOWN=$(cat "$COMMIT_MARKER")
fi

if [ "$CURRENT_HEAD" != "$LAST_KNOWN" ]; then
    log "Progress detected: HEAD moved to $CURRENT_HEAD"
    echo "$CURRENT_HEAD" > "$COMMIT_MARKER"
else
    CPU=$(docker stats --no-stream --format '{{.CPUPerc}}' ridecast2-dev-machine 2>/dev/null | tr -d '%' || echo "0")
    CPU_INT=${CPU%%.*}
    CPU_INT=${CPU_INT:-0}

    if [ "$CPU_INT" -lt 1 ]; then
        ZERO_FILE="$PROJECT_DIR/.watchdog-zero-count"
        ZERO_COUNT=0
        if [ -f "$ZERO_FILE" ]; then
            ZERO_COUNT=$(cat "$ZERO_FILE")
        fi
        ZERO_COUNT=$((ZERO_COUNT + 1))
        echo "$ZERO_COUNT" > "$ZERO_FILE"

        if [ "$ZERO_COUNT" -ge 4 ]; then
            heartbeat_stale=true
            if [ -f "$HEARTBEAT_FILE" ]; then
                heartbeat_mtime=$(stat -f '%m' "$HEARTBEAT_FILE" 2>/dev/null || echo "0")
                now=$(date +%s)
                heartbeat_age=$((now - heartbeat_mtime))
                if [ "$heartbeat_age" -lt "$HEARTBEAT_MAX_AGE" ]; then
                    heartbeat_stale=false
                    log "SKIP RESTART: entrypoint heartbeat is fresh (${heartbeat_age}s ago)"
                fi
            fi

            if [ "$heartbeat_stale" = true ]; then
                log "RESTART: idle for $ZERO_COUNT checks with stale heartbeat"
                docker compose -f "$COMPOSE_FILE" down 2>> "$LOG_FILE"
                sleep 5
                docker compose -f "$COMPOSE_FILE" up -d dev-machine 2>> "$LOG_FILE"
                echo "0" > "$ZERO_FILE"
                log "Container restarted after idle detection"
            fi
        else
            log "WARN: no progress and 0% CPU (check $ZERO_COUNT of 4)"
        fi
    else
        log "No new commits but CPU at ${CPU}% -- container is working"
        echo "0" > "$PROJECT_DIR/.watchdog-zero-count" 2>/dev/null
    fi
fi

# 3. Log summary
MEM=$(docker stats --no-stream --format '{{.MemUsage}}' ridecast2-dev-machine 2>/dev/null || echo "unknown")
UNPUSHED=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "?")
log "Stats: CPU=${CPU:-?}%, MEM=$MEM, unpushed=$UNPUSHED, HEAD=$CURRENT_HEAD"

log "--- watchdog check end ---"
