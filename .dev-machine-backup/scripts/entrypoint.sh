#!/usr/bin/env bash
# ridecast2 Dev Machine Container Entrypoint
# Retry loop with Cloudflare resilience, idle detection, and failure caps.
set -euo pipefail

AMPLIFIER_DIR="$HOME/.amplifier"
MAX_BACKOFF=300
CF_BACKOFF=900
INITIAL_BACKOFF=30
SUCCESS_RESET=600
CF_CRASH_THRESHOLD=120
INTER_SESSION_COOLDOWN=60
CF_BACKOFF_MAX=2700
MAX_CONSECUTIVE_FAILURES=${MAX_CONSECUTIVE_FAILURES:-5}
MAX_IDLE_SESSIONS=${MAX_IDLE_SESSIONS:-3}
HEARTBEAT_FILE="/Users/chrispark/Projects/ridecast2/.dev-machine-heartbeat"

touch_heartbeat() {
    touch "$HEARTBEAT_FILE" 2>/dev/null || true
}

show_escalation() {
    local esc_file="/Users/chrispark/Projects/ridecast2/.dev-machine/escalation.json"
    if [ -f "$esc_file" ]; then
        echo ""
        echo "[entrypoint] *** ESCALATION FILE FOUND: human input required ***"
        cat "$esc_file"
        echo ""
    fi
}

check_api() {
    local api_key="${ANTHROPIC_API_KEY:-}"
    if [ -z "$api_key" ]; then
        echo "[preflight] No ANTHROPIC_API_KEY set, skipping check"
        return 0
    fi

    local http_code
    http_code=$(curl -s -o /tmp/cf-check-body.txt -w '%{http_code}' \
        https://api.anthropic.com/v1/models \
        -H "x-api-key: $api_key" \
        -H "anthropic-version: 2023-06-01" \
        --connect-timeout 10 \
        --max-time 15 \
        2>/dev/null) || http_code="000"

    if [ "$http_code" = "403" ]; then
        if grep -q "Just a moment" /tmp/cf-check-body.txt 2>/dev/null; then
            echo "[preflight] CLOUDFLARE CHALLENGE DETECTED (403 + managed challenge)"
            return 1
        fi
    fi

    if [ "$http_code" = "000" ]; then
        echo "[preflight] API unreachable (connection failed)"
        return 1
    fi

    if [ "$http_code" = "529" ] || [ "$http_code" = "503" ]; then
        echo "[preflight] API overloaded ($http_code)"
        return 1
    fi

    echo "[preflight] API reachable (HTTP $http_code)"
    rm -f /tmp/cf-check-body.txt
    return 0
}

# Seed config files
if [ -f /config/keys.env ] && [ ! -f "$AMPLIFIER_DIR/keys.env" ]; then
    cp /config/keys.env "$AMPLIFIER_DIR/keys.env"
    chmod 600 "$AMPLIFIER_DIR/keys.env"
fi

if [ -f /config/settings.yaml ] && [ ! -f "$AMPLIFIER_DIR/settings.yaml" ]; then
    cp /config/settings.yaml "$AMPLIFIER_DIR/settings.yaml"
fi

echo "Amplifier config ready at $AMPLIFIER_DIR"

if [ -f "$AMPLIFIER_DIR/keys.env" ]; then
    set -a
    source "$AMPLIFIER_DIR/keys.env" 2>/dev/null || true
    set +a
fi

# Install project dependencies
cd /Users/chrispark/Projects/ridecast2
if [ -f package-lock.json ] || [ -f package.json ]; then
    echo "Installing Node.js dependencies..."
    npm ci 2>&1 || npm install 2>&1
fi

# Retry loop
backoff=$INITIAL_BACKOFF
attempt=0
consecutive_structural_failures=0
consecutive_idle_sessions=0

while true; do
    attempt=$((attempt + 1))

    echo ""
    echo "=========================================="
    echo "  ridecast2 Dev Machine -- attempt $attempt"
    echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo "=========================================="
    echo ""

    # Pre-flight API check
    touch_heartbeat
    cf_wait_count=0
    cf_current_backoff=$CF_BACKOFF
    while ! check_api; do
        cf_wait_count=$((cf_wait_count + 1))
        touch_heartbeat
        echo "[entrypoint] API not reachable. Waiting ${cf_current_backoff}s... (preflight check $cf_wait_count)"
        sleep $cf_current_backoff
        cf_current_backoff=$((cf_current_backoff * 2))
        if [ $cf_current_backoff -gt $CF_BACKOFF_MAX ]; then
            cf_current_backoff=$CF_BACKOFF_MAX
        fi
    done

    start_time=$(date +%s)
    pre_session_head=$(git -C "/Users/chrispark/Projects/ridecast2" rev-parse HEAD 2>/dev/null || echo "")

    RECIPE_LOG="/tmp/recipe-output-$attempt.log"
    set +e
    "$@" 2>&1 | tee "$RECIPE_LOG"
    exit_code=${PIPESTATUS[0]}
    set -e

    end_time=$(date +%s)
    duration=$((end_time - start_time))

    # Check for mid-session Cloudflare challenge
    cf_mid_session=false
    if grep -q "Just a moment" "$RECIPE_LOG" 2>/dev/null; then
        cf_mid_session=true
        echo "[entrypoint] CLOUDFLARE CHALLENGE detected in recipe output."
    fi

    # Check for internal recipe failure
    if [ $exit_code -eq 0 ] && grep -q "Recipe execution failed" "$RECIPE_LOG" 2>/dev/null; then
        echo "[entrypoint] WARNING: recipe exited 0 but reported internal failure."
        exit_code=1
    fi

    last_log_lines=$(tail -20 "$RECIPE_LOG" 2>/dev/null || echo "(no log)")
    rm -f "$RECIPE_LOG"

    # Test environment broken sentinel
    if [ -f "/Users/chrispark/Projects/ridecast2/.dev-machine-test-env-broken" ]; then
        echo "[entrypoint] TEST-ENV-BROKEN sentinel detected. Halting."
        STATE_FILE="/Users/chrispark/Projects/ridecast2/.dev-machine/STATE.yaml"
        state_mtime=$(stat -c '%Y' "$STATE_FILE" 2>/dev/null || echo "0")
        touch_heartbeat
        while true; do
            sleep 300
            touch_heartbeat
            new_mtime=$(stat -c '%Y' "$STATE_FILE" 2>/dev/null || echo "0")
            if [ ! -f "/Users/chrispark/Projects/ridecast2/.dev-machine-test-env-broken" ] || [ "$new_mtime" != "$state_mtime" ]; then
                echo "[entrypoint] Halt cleared -- resuming."
                break
            fi
            show_escalation
            echo "[entrypoint] Still halted ($(date -u '+%H:%M:%S UTC'))."
        done
        continue
    fi

    # On success
    if [ $exit_code -eq 0 ]; then
        echo "[entrypoint] Recipe completed cleanly after ${duration}s."
        backoff=$INITIAL_BACKOFF
        consecutive_structural_failures=0

        # Idle-cycle detection
        post_session_head=$(git -C "/Users/chrispark/Projects/ridecast2" rev-parse HEAD 2>/dev/null || echo "")
        if [ -n "$pre_session_head" ] && [ -n "$post_session_head" ]; then
            meaningful_diff=$(git -C "/Users/chrispark/Projects/ridecast2" diff "$pre_session_head" "$post_session_head" \
                -- . \
                ':(exclude)STATE.yaml' \
                ':(exclude)CONTEXT-TRANSFER.md' \
                ':(exclude)SESSION-ARCHIVE.md' \
                ':(exclude)FEATURE-ARCHIVE.yaml' \
                ':(exclude).dev-machine-heartbeat' \
                2>/dev/null | wc -l)

            if [ "$meaningful_diff" -eq 0 ]; then
                consecutive_idle_sessions=$((consecutive_idle_sessions + 1))
                echo "[entrypoint] IDLE SESSION: no meaningful changes (${consecutive_idle_sessions}/${MAX_IDLE_SESSIONS})"

                if [ $consecutive_idle_sessions -ge $MAX_IDLE_SESSIONS ]; then
                    echo "[entrypoint] HALTING: $MAX_IDLE_SESSIONS consecutive idle sessions."
                    POSTMORTEM_FILE="/Users/chrispark/Projects/ridecast2/.dev-machine/POST-MORTEM.md"
                    {
                        echo "=== Dev Machine Post-Mortem ==="
                        echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
                        echo "Reason: idle-cycle cap ($MAX_IDLE_SESSIONS consecutive sessions with no code changes)"
                        echo ""
                        echo "=== Last log lines ==="
                        echo "$last_log_lines"
                    } > "$POSTMORTEM_FILE"

                    STATE_FILE="/Users/chrispark/Projects/ridecast2/.dev-machine/STATE.yaml"
                    state_mtime=$(stat -c '%Y' "$STATE_FILE" 2>/dev/null || echo "0")
                    touch_heartbeat
                    while true; do
                        sleep 300
                        touch_heartbeat
                        new_mtime=$(stat -c '%Y' "$STATE_FILE" 2>/dev/null || echo "0")
                        if [ "$new_mtime" != "$state_mtime" ]; then
                            echo "[entrypoint] STATE.yaml modified -- resuming."
                            consecutive_idle_sessions=0
                            rm -f "$POSTMORTEM_FILE"
                            break
                        fi
                        show_escalation
                    done
                fi
            else
                consecutive_idle_sessions=0
                echo "[entrypoint] Session produced meaningful changes (+${meaningful_diff} diff lines)."
            fi
        fi

        echo "[entrypoint] Cooling down ${INTER_SESSION_COOLDOWN}s..."
        touch_heartbeat
        sleep $INTER_SESSION_COOLDOWN
        continue
    fi

    # Reset backoff if run lasted long enough
    if [ $duration -ge $SUCCESS_RESET ]; then
        backoff=$INITIAL_BACKOFF
    fi

    # CF or quick crash handling
    if [ "$cf_mid_session" = true ] || [ $duration -lt $CF_CRASH_THRESHOLD ]; then
        echo "[entrypoint] CF/quick crash. Extended backoff: ${CF_BACKOFF}s"
        touch_heartbeat
        sleep $CF_BACKOFF
        continue
    fi

    echo "[entrypoint] Recipe exited with code $exit_code after ${duration}s. Retrying in ${backoff}s..."
    touch_heartbeat
    sleep $backoff

    backoff=$((backoff * 2))
    if [ $backoff -gt $MAX_BACKOFF ]; then
        backoff=$MAX_BACKOFF
    fi

    # Structural failure tracking
    if [ $duration -lt 60 ]; then
        echo "[entrypoint] Quick crash -- transient."
    else
        consecutive_structural_failures=$((consecutive_structural_failures + 1))
        echo "[entrypoint] Structural failure #${consecutive_structural_failures}/${MAX_CONSECUTIVE_FAILURES}"

        if [ $consecutive_structural_failures -ge $MAX_CONSECUTIVE_FAILURES ]; then
            echo "[entrypoint] CRITICAL: Max failures reached. Halting."
            POSTMORTEM_FILE="/Users/chrispark/Projects/ridecast2/.dev-machine/POST-MORTEM.md"
            {
                echo "=== Dev Machine Post-Mortem ==="
                echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
                echo "Reason: $consecutive_structural_failures consecutive structural failures"
                echo "Last exit code: $exit_code"
                echo ""
                echo "=== Last log lines ==="
                echo "$last_log_lines"
            } > "$POSTMORTEM_FILE"

            STATE_FILE="/Users/chrispark/Projects/ridecast2/.dev-machine/STATE.yaml"
            state_mtime=$(stat -c '%Y' "$STATE_FILE" 2>/dev/null || echo "0")
            touch_heartbeat
            while true; do
                sleep 300
                touch_heartbeat
                new_mtime=$(stat -c '%Y' "$STATE_FILE" 2>/dev/null || echo "0")
                if [ "$new_mtime" != "$state_mtime" ]; then
                    echo "[entrypoint] STATE.yaml modified -- resuming."
                    consecutive_structural_failures=0
                    break
                fi
                show_escalation
            done
        fi
    fi
done
