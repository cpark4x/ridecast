#!/usr/bin/env bash
# ridecast2 Dev Machine Health Monitor
# Runs every 10 minutes via cron on the macOS HOST.
# Detects failure patterns, auto-remediates common issues.

PROJECT_DIR="/Users/chrispark/Projects/ridecast2"
MONITOR_LOG="$PROJECT_DIR/.dev-machine/dev-machine-monitor.log"
CONTAINER="ridecast2-dev-machine"
IMAGE_NAME="ridecast2-dev-machine:latest"
BUILD_COMMAND="npm run build"
MAX_LOG_LINES=500

log() {
    echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*" >> "$MONITOR_LOG"
}

# Log rotation
if [ -f "$MONITOR_LOG" ] && [ "$(wc -l < "$MONITOR_LOG")" -gt "$MAX_LOG_LINES" ]; then
    tail -200 "$MONITOR_LOG" > "$MONITOR_LOG.tmp"
    mv "$MONITOR_LOG.tmp" "$MONITOR_LOG"
fi

log "--- monitor check ---"

# Container status
container_status=$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "missing")

# Auto-commit orphaned work if container stopped
cd "$PROJECT_DIR" 2>/dev/null || true
DIRTY=$(git status --porcelain 2>/dev/null | head -1)
if [ -n "$DIRTY" ] && [ "$container_status" != "running" ]; then
    git add -A 2>/dev/null || true
    git commit -m "chore: auto-save orphaned work (monitor recovery)" 2>/dev/null || true
    log "AUTO-COMMIT: saved orphaned work from stopped container"
fi

# STATE.yaml-aware status
if [ -f "$PROJECT_DIR/.dev-machine/STATE.yaml" ]; then
    _state_vars=$(python3 -c "
import yaml, sys
try:
    state = yaml.safe_load(open('$PROJECT_DIR/.dev-machine/STATE.yaml'))
    features = state.get('features', {})
    remaining = sum(1 for f in features.values() if isinstance(f, dict) and f.get('status') in ('ready', 'in-progress', 'blocked'))
    blockers = len(state.get('blockers', []))
    in_progress = [k for k, v in features.items() if isinstance(v, dict) and v.get('status') == 'in-progress']
    print('REMAINING=' + str(remaining))
    print('BLOCKERS=' + str(blockers))
    print('IN_PROGRESS=' + str(len(in_progress)))
except Exception:
    print('REMAINING=?')
    print('BLOCKERS=?')
    print('IN_PROGRESS=?')
" 2>/dev/null) || true
    eval "${_state_vars:-REMAINING=?}" 2>/dev/null || true
    log "STATE: remaining=${REMAINING:-?} blockers=${BLOCKERS:-?} in_progress=${IN_PROGRESS:-?}"

    # Reset stale in-progress features if container is down
    if [ "$container_status" != "running" ] && [ "${IN_PROGRESS:-0}" != "?" ] && [ "${IN_PROGRESS:-0}" -gt 0 ] 2>/dev/null; then
        python3 -c "
import yaml
state = yaml.safe_load(open('$PROJECT_DIR/.dev-machine/STATE.yaml'))
changed = False
for k, v in state.get('features', {}).items():
    if isinstance(v, dict) and v.get('status') == 'in-progress':
        v['status'] = 'ready'
        changed = True
if changed:
    with open('$PROJECT_DIR/.dev-machine/STATE.yaml', 'w') as f:
        yaml.dump(state, f, default_flow_style=False, sort_keys=False)
" 2>/dev/null && log "HEALED: reset stale in-progress features to ready"
    fi
fi

# Exit early if container not running
if [ "$container_status" != "running" ]; then
    log "ALERT: Container not running (status: $container_status)"
    log "--- monitor check end ---"
    exit 0
fi

# Current stats
cpu=$(docker stats "$CONTAINER" --no-stream --format '{{.CPUPerc}}' 2>/dev/null || echo "?")
mem=$(docker stats "$CONTAINER" --no-stream --format '{{.MemUsage}}' 2>/dev/null || echo "?")
head_commit=$(cd "$PROJECT_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "?")
unpushed=$(cd "$PROJECT_DIR" && git rev-list --count @{u}..HEAD 2>/dev/null || echo "?")

# Heartbeat freshness (macOS stat)
heartbeat_age="n/a"
if [ -f "$PROJECT_DIR/.dev-machine-heartbeat" ]; then
    heartbeat_mtime=$(stat -f '%m' "$PROJECT_DIR/.dev-machine-heartbeat" 2>/dev/null || echo "0")
    now=$(date +%s)
    heartbeat_age=$((now - heartbeat_mtime))
fi

# HEAD movement tracking
LAST_HEAD_FILE="$PROJECT_DIR/.monitor-last-head"
last_head=$(cat "$LAST_HEAD_FILE" 2>/dev/null || echo "")
head_moved="no"
if [ "$head_commit" != "$last_head" ] && [ -n "$last_head" ]; then
    head_moved="yes"
fi
echo "$head_commit" > "$LAST_HEAD_FILE"

push_alert=""
if [ "$unpushed" != "?" ] && [ "$unpushed" -gt 10 ]; then
    push_alert=" ALERT:unpushed>10"
fi

log "STATUS: cpu=$cpu mem=$mem head=$head_commit unpushed=$unpushed moved=$head_moved heartbeat_age=${heartbeat_age}s$push_alert"

# Auto-push if too many unpushed commits
if [ "$unpushed" != "?" ] && [ "$unpushed" -gt 10 ]; then
    log "AUTO-FIX: $unpushed unpushed commits. Pushing..."
    cd "$PROJECT_DIR" 2>/dev/null || true
    if git push 2>/dev/null; then
        log "AUTO-FIX: Push successful."
    else
        log "AUTO-FIX: Push FAILED."
    fi
fi

log "--- monitor check end ---"
