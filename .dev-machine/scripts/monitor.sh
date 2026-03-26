#!/usr/bin/env bash
set -euo pipefail

# ── Bootstrap ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=monitor.conf
source "$SCRIPT_DIR/monitor.conf"

LOG_FILE="$SCRIPT_DIR/monitor.log"
STATUS_FILE="$SCRIPT_DIR/status.yaml"
PID_FILE="$SCRIPT_DIR/monitor.pid"

# Log rotation: keep last 500 lines if over 1000
if [[ -f "$LOG_FILE" ]]; then
  LC=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
  if [[ "$LC" -gt 1000 ]]; then
    tail -500 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
  fi
fi

# PID lock — exit if already running
if [[ -f "$PID_FILE" ]]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Already running (PID $OLD_PID), exiting." >> "$LOG_FILE"
    exit 0
  fi
fi
echo $$ > "$PID_FILE"
trap 'rm -f "$PID_FILE"' EXIT

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >> "$LOG_FILE"; }

# ── YAML helpers ──────────────────────────────────────────────────────────────
# yaml_val FILE DOTTED.KEY  — returns value or empty string
yaml_val() {
  local file="$1" field="$2" key="${2##*.}"
  if command -v yq &>/dev/null; then
    yq -r ".$field // empty" "$file" 2>/dev/null || true
  else
    grep -m1 "^\s*${key}:" "$file" 2>/dev/null \
      | awk -F': ' '{gsub(/["\r]/,"",$2); print $2}' || true
  fi
}

# count_feat FILE STATUS  — count features array entries matching .status
count_feat() {
  local file="$1" st="$2" n=""
  if command -v yq &>/dev/null; then
    n=$(yq "[.features[]? | select(.status == \"$st\")] | length" "$file" 2>/dev/null || true)
  else
    # grep -c exits 1 on zero matches; capture then default
    n=$(grep -c "status: $st" "$file" 2>/dev/null || true)
  fi
  echo "${n:-0}"
}

# count_done FILE  — count completed_features array entries
count_done() {
  local file="$1" n=""
  if command -v yq &>/dev/null; then
    n=$(yq ".completed_features | length" "$file" 2>/dev/null || true)
  else
    n=$(awk '/^completed_features:/{f=1;next} f&&/^[^ ]/{f=0} f&&/^- /{c++} END{print c+0}' \
        "$file" 2>/dev/null || true)
  fi
  echo "${n:-0}"
}

# ── Data collection ───────────────────────────────────────────────────────────
NOW=$(date +%s)

# Container running?
CONTAINER_RUNNING=false
if docker inspect "$CONTAINER_NAME" &>/dev/null; then
  CS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
  [[ "$CS" == "running" ]] && CONTAINER_RUNNING=true || true
fi

# Heartbeat age
HEARTBEAT_AGE_SEC=999999
HB_PATH="$PROJECT_DIR/$HEARTBEAT_FILE"
if [[ -f "$HB_PATH" ]]; then
  HB_MTIME=$(stat -c %Y "$HB_PATH" 2>/dev/null || echo "$NOW")
  HEARTBEAT_AGE_SEC=$(( NOW - HB_MTIME ))
fi

# Git HEAD
HEAD_SHA="unknown"
if [[ -d "$PROJECT_DIR/.git" ]]; then
  HEAD_SHA=$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
fi

# HEAD unchanged duration (tracked across runs)
LAST_HEAD_FILE="$SCRIPT_DIR/.last-head"
LAST_HEAD_TIME_FILE="$SCRIPT_DIR/.last-head-time"
LAST_HEAD=$(cat "$LAST_HEAD_FILE" 2>/dev/null || echo "")
HEAD_UNCHANGED_SEC=0
if [[ "$LAST_HEAD" == "$HEAD_SHA" && "$HEAD_SHA" != "unknown" ]]; then
  LAST_TIME=$(cat "$LAST_HEAD_TIME_FILE" 2>/dev/null || echo "$NOW")
  HEAD_UNCHANGED_SEC=$(( NOW - LAST_TIME ))
else
  printf '%s\n' "$HEAD_SHA" > "$LAST_HEAD_FILE"
  printf '%s\n' "$NOW"      > "$LAST_HEAD_TIME_FILE"
fi

# STATE.yaml — feature counts and session metadata
FEAT_READY=0; FEAT_IN_PROGRESS=0; FEAT_DONE=0; FEAT_BLOCKED=0
ZERO_CHANGE_SESSIONS=0; SESSION_COUNT=0
STATE_PATH="$PROJECT_DIR/$STATE_FILE"
if [[ -f "$STATE_PATH" ]]; then
  FEAT_READY=$(count_feat        "$STATE_PATH" "ready")
  FEAT_IN_PROGRESS=$(count_feat  "$STATE_PATH" "in-progress")
  FEAT_BLOCKED=$(count_feat      "$STATE_PATH" "blocked")
  FEAT_DONE=$(count_done         "$STATE_PATH")
  V=$(yaml_val "$STATE_PATH" "meta.zero_change_sessions"); ZERO_CHANGE_SESSIONS=${V:-0}
  V=$(yaml_val "$STATE_PATH" "meta.session_count");        SESSION_COUNT=${V:-0}
fi

# Escalation / postmortem flags (check both common locations)
ESCALATION_EXISTS=false; POSTMORTEM_EXISTS=false
[[ -f "$PROJECT_DIR/.dev-machine/escalation.json" || -f "$PROJECT_DIR/escalation.json" ]] && ESCALATION_EXISTS=true || true
[[ -f "$PROJECT_DIR/.dev-machine-postmortem" || -f "$PROJECT_DIR/postmortem.md" ]] && POSTMORTEM_EXISTS=true || true

# Stale heartbeat duration tracking
HEARTBEAT_STALE=false; STALE_DURATION=0
STALE_SINCE_FILE="$SCRIPT_DIR/.stale-heartbeat-since"
if [[ "$HEARTBEAT_AGE_SEC" -gt "$HEARTBEAT_MAX_AGE_SEC" ]]; then
  HEARTBEAT_STALE=true
  [[ ! -f "$STALE_SINCE_FILE" ]] && printf '%s\n' "$NOW" > "$STALE_SINCE_FILE" || true
  STALE_SINCE=$(cat "$STALE_SINCE_FILE" 2>/dev/null || echo "$NOW")
  STALE_DURATION=$(( NOW - STALE_SINCE ))
else
  rm -f "$STALE_SINCE_FILE"
fi

# ── Check logic ───────────────────────────────────────────────────────────────
STATUS="healthy"; STOP_REASON="none"; PROBLEMS=""; ACTIONS=""
add_problem() { PROBLEMS="${PROBLEMS:+$PROBLEMS,}$1"; }
add_action()  { ACTIONS="${ACTIONS:+$ACTIONS,}$1"; }

do_stop() {
  STOP_REASON="$1"; STATUS="stopped"; add_action "stop"
  # DRY_RUN is the literal string "true" or "false" — used as a command
  if ! $DRY_RUN; then
    docker compose -f "$PROJECT_DIR/$COMPOSE_FILE" stop 2>/dev/null \
      || docker stop "$CONTAINER_NAME" 2>/dev/null || true
  fi
}

do_restart() {
  STATUS="recovering"; add_action "restart"
  if ! $DRY_RUN; then
    docker compose -f "$PROJECT_DIR/$COMPOSE_FILE" restart 2>/dev/null \
      || docker start "$CONTAINER_NAME" 2>/dev/null || true
  fi
}

if $CONTAINER_RUNNING; then

  # 2a: Token-burn checks — highest priority, evaluated first
  if [[ "$ZERO_CHANGE_SESSIONS" -ge "$MAX_ZERO_CHANGE_SESSIONS" ]]; then
    add_problem "zero_change_limit"
    do_stop "zero_change_sessions=${ZERO_CHANGE_SESSIONS}>=${MAX_ZERO_CHANGE_SESSIONS}"

  elif [[ "$FEAT_READY" -eq 0 && "$FEAT_IN_PROGRESS" -eq 0 ]]; then
    add_problem "no_work"
    do_stop "no ready or in-progress features"

  elif $ESCALATION_EXISTS; then
    add_problem "escalation"
    do_stop "escalation.json present"

  else
    # 2b: Health checks — only when token-burn checks pass
    if $HEARTBEAT_STALE; then
      # Lazy CPU sample — only when heartbeat is stale (avoids docker stats cost on healthy runs)
      CPU_RAW=$(docker stats --no-stream --format '{{.CPUPerc}}' "$CONTAINER_NAME" 2>/dev/null || echo "0%")
      CPU_INT=$(echo "$CPU_RAW" | awk -F'[.%]' '{print ($1=="")?0:$1+0}')

      if [[ "${CPU_INT:-0}" -lt 1 ]]; then
        # 2b.1a: stale heartbeat + CPU < 1% → dead entrypoint
        add_problem "dead_entrypoint"; do_restart
      elif [[ "$STALE_DURATION" -gt 1200 ]]; then
        # 2b.1b: stale heartbeat + high CPU for > 20 min → never-healthy, stop
        add_problem "stuck_cpu"
        do_stop "stale heartbeat + high CPU for ${STALE_DURATION}s (>1200)"
      fi
    fi

    # 2b.2: HEAD unchanged too long → warning (fleet coordinator decides)
    if [[ "$STATUS" == "healthy" && "$HEAD_UNCHANGED_SEC" -gt "$HEAD_STALE_THRESHOLD_SEC" ]]; then
      add_problem "head_stale"; STATUS="warning"
    fi
  fi

else

  # Container NOT running — determine resting state or restart
  if $POSTMORTEM_EXISTS; then
    STATUS="halted"; add_problem "postmortem"
  elif $ESCALATION_EXISTS; then
    STATUS="blocked-escalation"; add_problem "escalation"
  elif [[ "$FEAT_READY" -eq 0 && "$FEAT_IN_PROGRESS" -eq 0 ]]; then
    STATUS="completed"
  else
    do_restart
  fi

fi

PROBLEMS="${PROBLEMS:-none}"
ACTIONS="${ACTIONS:-none}"

# ── Write status.yaml ─────────────────────────────────────────────────────────
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

cat > "$STATUS_FILE" <<YAML
# Machine status -- written by monitor.sh every 3 minutes
# Do not edit -- regenerated on every monitor run
machine: ${MACHINE_NAME}
timestamp: "${TIMESTAMP}"
status: ${STATUS}
container_running: ${CONTAINER_RUNNING}
stop_reason: "${STOP_REASON}"

health:
  heartbeat_age_sec: ${HEARTBEAT_AGE_SEC}
  head: "${HEAD_SHA}"
  head_age_sec: ${HEAD_UNCHANGED_SEC}
  zero_change_sessions: ${ZERO_CHANGE_SESSIONS}
  session_count: ${SESSION_COUNT}

features:
  ready: ${FEAT_READY}
  in_progress: ${FEAT_IN_PROGRESS}
  done: ${FEAT_DONE}
  blocked: ${FEAT_BLOCKED}

escalation: ${ESCALATION_EXISTS}
postmortem: ${POSTMORTEM_EXISTS}

problems: [${PROBLEMS}]
actions: [${ACTIONS}]
YAML

log "status=${STATUS} problems=[${PROBLEMS}] actions=[${ACTIONS}]"
