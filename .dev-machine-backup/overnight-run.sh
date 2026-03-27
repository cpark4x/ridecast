#!/bin/bash
# Dev-machine overnight runner
# Runs iteration recipe in a loop until all features are done or max runs reached

set -e

LOG_DIR="/Users/chrispark/Projects/ridecast2/.dev-machine/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/overnight-$(date +%Y%m%d-%H%M%S).log"

MAX_RUNS=8
PAUSE_BETWEEN=15  # seconds between runs

echo "=== Dev-machine overnight run starting at $(date) ===" | tee "$LOG_FILE"
echo "Max runs: $MAX_RUNS" | tee -a "$LOG_FILE"
echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

cd /Users/chrispark/Projects/ridecast2

for i in $(seq 1 $MAX_RUNS); do
  echo "=== Run $i/$MAX_RUNS starting at $(date) ===" | tee -a "$LOG_FILE"
  
  # Check if there are any ready or in-progress features left
  READY=$(grep -c "status: ready" .dev-machine/STATE.yaml 2>/dev/null || echo "0")
  IN_PROGRESS=$(grep -c "status: in-progress" .dev-machine/STATE.yaml 2>/dev/null || echo "0")
  WORK_LEFT=$((READY + IN_PROGRESS))
  
  echo "Features remaining: $READY ready, $IN_PROGRESS in-progress" | tee -a "$LOG_FILE"
  
  if [ "$WORK_LEFT" -eq 0 ]; then
    echo "=== ALL FEATURES COMPLETE! Stopping at $(date) ===" | tee -a "$LOG_FILE"
    break
  fi
  
  # Commit any uncommitted work from previous run
  if [ -n "$(git status --porcelain)" ]; then
    echo "Committing leftover work from previous run..." | tee -a "$LOG_FILE"
    git add -A
    git commit -m "wip: auto-commit between overnight runs ($i)" --no-verify 2>&1 | tee -a "$LOG_FILE"
  fi
  
  # Run the iteration recipe
  echo "Starting iteration recipe..." | tee -a "$LOG_FILE"
  amplifier tool invoke recipes \
    operation=execute \
    recipe_path=.dev-machine/recipes/iteration.yaml \
    2>&1 | tee -a "$LOG_FILE" || true
  
  echo "=== Run $i/$MAX_RUNS finished at $(date) ===" | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
  
  # Brief pause between runs
  sleep $PAUSE_BETWEEN
done

# Final status
echo "" | tee -a "$LOG_FILE"
echo "=== Overnight run complete at $(date) ===" | tee -a "$LOG_FILE"
DONE=$(grep -c "status: done" .dev-machine/STATE.yaml 2>/dev/null || echo "0")
READY=$(grep -c "status: ready" .dev-machine/STATE.yaml 2>/dev/null || echo "0")
echo "Final status: $DONE done, $READY remaining" | tee -a "$LOG_FILE"
git log --oneline -20 | tee -a "$LOG_FILE"
