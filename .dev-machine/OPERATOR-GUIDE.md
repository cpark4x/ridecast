# ridecast2 Dev Machine — Operator Guide

Quick reference for monitoring, troubleshooting, and recovering your dev machine.

## Quick Commands

| Task | Command |
|------|---------|
| **Check status** | `docker ps -a --filter name=ridecast2-dev-machine` |
| **View logs** | `docker logs ridecast2-dev-machine --tail 50` |
| **Follow logs** | `docker logs ridecast2-dev-machine --tail 50 -f` |
| **Resume after halt** | `touch /Users/chrispark/Projects/ridecast2/STATE.yaml` |
| **Restart container** | `docker compose -f /Users/chrispark/Projects/ridecast2/docker-compose.dev-machine.yaml restart` |
| **Rebuild & restart** | `docker compose -f /Users/chrispark/Projects/ridecast2/docker-compose.dev-machine.yaml up -d --build` |
| **Shell into container** | `docker exec -it ridecast2-dev-machine bash` |
| **Read postmortem** | `cat /Users/chrispark/Projects/ridecast2/.dev-machine-postmortem` |
| **Check heartbeat** | `stat /Users/chrispark/Projects/ridecast2/.dev-machine-heartbeat` |
| **View STATE.yaml** | `cat /Users/chrispark/Projects/ridecast2/STATE.yaml` |
| **CPU/memory** | `docker stats ridecast2-dev-machine --no-stream` |

## Machine Is Halted — What Do I Do?

When the machine hits repeated failures, it halts and writes a postmortem file.
The container stays running (heartbeat active) but stops launching recipes.

### Step 1: Read the postmortem

```bash
cat /Users/chrispark/Projects/ridecast2/.dev-machine-postmortem
```

The postmortem tells you the **probable cause** and **recovery action**. Common causes:

| Probable Cause | What Happened | What To Do |
|---------------|---------------|------------|
| **LLM provider outage** | Anthropic API returned 500/503/529 | Wait for recovery, then `touch STATE.yaml` |
| **Cloudflare challenge** | CF bot detection blocked API calls | Wait 30-60 min, then `touch STATE.yaml` |
| **API rate limiting** | Too many requests (429) | Wait 15-30 min, then `touch STATE.yaml` |
| **Recipe step failure** | A recipe step crashed | Check logs for which step. May need recipe fix + container restart |
| **Missing Python module** | ImportError in container | Rebuild: `docker compose ... up -d --build` |
| **Permission error** | Root-owned files on bind mount | `sudo chown -R $(id -u):$(id -g) /Users/chrispark/Projects/ridecast2` |

### Step 2: Resume

For **transient issues** (outages, rate limits, CF challenges) — just kick it:

```bash
touch /Users/chrispark/Projects/ridecast2/STATE.yaml
```

The machine checks every 5 minutes. It will clear the halt, delete the postmortem, and restart the recipe loop.

For **structural issues** (broken config, missing deps) — fix the problem first, then:

```bash
docker compose -f /Users/chrispark/Projects/ridecast2/docker-compose.dev-machine.yaml restart
```

For **recipe file changes** — the container cancels stale sessions at startup, so a restart picks up changes automatically.

## Halt Types

The machine has three distinct halt conditions:

| Halt Type | Trigger | Symptom in Logs |
|-----------|---------|-----------------|
| **Structural failure** | 5 consecutive recipe failures (>60s each) | `CRITICAL: MAX_CONSECUTIVE_FAILURES reached` |
| **Idle cycle** | 3 consecutive sessions with no git changes | `HALTING: N consecutive sessions produced no code changes` |
| **Test env broken** | Test runner itself is broken (not just failing tests) | `TEST-ENV-BROKEN sentinel detected` |

All three resume the same way: fix the underlying issue, then `touch STATE.yaml`.

For **test-env-broken**, also delete the sentinel: `rm /Users/chrispark/Projects/ridecast2/.dev-machine-test-env-broken`

## Is It Working? What "Normal" Looks Like

| Signal | Healthy | Sick |
|--------|---------|------|
| `docker logs --tail 5` | Shows recipe progress, git commits | Shows repeated errors or halt messages |
| Heartbeat age | < 15 minutes | > 60 minutes (or missing) |
| `docker stats --no-stream` | CPU > 0% during sessions | 0% CPU for > 30 min (unless CF backoff) |
| STATE.yaml `meta.session_count` | Increasing over time | Stuck at same number |
| Git log | Fresh commits | No commits in hours |

### Cloudflare Backoff (Not a Problem)

If you see 0% CPU but the heartbeat is fresh (< 15 min old), the machine is in **Cloudflare backoff** — waiting for CF bot detection to clear. This is correct behavior. Don't restart it; that makes CF worse.

## Cron Setup (Host-Side Monitoring)

These run on the **host**, not in the container:

```bash
# Add to crontab (crontab -e):
*/15 * * * * /Users/chrispark/Projects/ridecast2/.dev-machine/scripts/dev-machine-watchdog.sh >> /Users/chrispark/Projects/ridecast2/dev-machine-watchdog.log 2>&1
*/10 * * * * /Users/chrispark/Projects/ridecast2/.dev-machine/scripts/dev-machine-monitor.sh >> /Users/chrispark/Projects/ridecast2/dev-machine-monitor.log 2>&1
```

| Script | Frequency | What It Does |
|--------|-----------|-------------|
| **watchdog.sh** | Every 15 min | Restarts crashed containers (heartbeat-aware — won't kill CF backoff) |
| **monitor.sh** | Every 10 min | Detects 6 failure patterns, auto-pushes commits, heals file permissions |

### Cron Troubleshooting

If cron scripts stop running silently:
1. Check if log files are root-owned: `ls -la /Users/chrispark/Projects/ridecast2/dev-machine-*.log`
2. Fix ownership: `sudo chown $(id -u):$(id -g) /Users/chrispark/Projects/ridecast2/dev-machine-*.log`
3. Verify cron is set: `crontab -l | grep ridecast2`

## Named Volume Management

The container's Amplifier cache lives in a Docker named volume (`ridecast2-amplifier-home`).
This persists across container restarts so first-run setup cost is paid only once.

**When to reset the volume:**
- After changing `dev-machine-settings.yaml` (the settings are seeded once on first run)
- If the Amplifier cache is corrupted
- If you see persistent "Permission denied" errors in `~/.amplifier/cache/`

```bash
docker compose -f /Users/chrispark/Projects/ridecast2/docker-compose.dev-machine.yaml down
docker volume rm ridecast2-amplifier-home
docker compose -f /Users/chrispark/Projects/ridecast2/docker-compose.dev-machine.yaml up -d --build
```

## File Permissions

The container runs as UID 501 / GID 20 to match the host user.
If files become root-owned (e.g., after a Docker volume glitch), fix with:

```bash
sudo chown -R $(id -u):$(id -g) /Users/chrispark/Projects/ridecast2
```

## SSH Agent

The container uses the host's SSH agent (forwarded via socket) for git push.
If pushes fail:

```bash
# Check agent is running
ssh-add -l

# If "Could not open connection" — restart the agent
eval $(ssh-agent) && ssh-add
```

For persistent SSH agent on headless servers, see the Host Prerequisites section in templates-reference.md.

## Web Dashboard

The dev-machine bundle includes a web-based monitoring dashboard that shows container status,
heartbeat, STATE.yaml contents, blockers, postmortem, git activity, and log events for all
your dev machines — auto-refreshing in the browser.

### Setup

The dashboard runs on the **host** (not in the container). The server and UI live in the
dev-machine bundle's `monitor/` directory.

**1. Create a config file:**

```bash
cp monitor/monitor-config.example.yaml monitor/monitor-config.yaml
```

Edit `monitor-config.yaml` to list your machines:

```yaml
port: 8111
refresh_interval: 120
cache_ttl: 30

machines:
  - name: ridecast2
    container_prefix: ridecast2-dev-machine
    project_dir: /Users/chrispark/Projects/ridecast2
```

Use `container_name` for stable container names (from `docker compose up`) or
`container_prefix` for names with `-run-<hash>` suffixes (from `docker compose run`).

**2. Start the server:**

```bash
cd <path-to-bundle>/monitor
python3 server.py --config monitor-config.yaml
```

**3. Access the dashboard:**

Open `http://<host>:8111` in a browser. On headless servers, access it via your
network (e.g., Tailscale: `http://<tailscale-ip>:8111`) or SSH tunnel
(`ssh -L 8111:localhost:8111 user@host`).

### Keeping the Dashboard Running

The server runs in the foreground by default. For persistent operation:

**Background process (quick, won't survive reboot):**
```bash
nohup python3 server.py --config monitor-config.yaml > /tmp/monitor-server.log 2>&1 &
```

**systemd user service (survives reboot):**
```bash
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/dev-machine-dashboard.service << EOF
[Unit]
Description=Dev Machine Monitor Dashboard

[Service]
Type=simple
WorkingDirectory=<path-to-bundle>/monitor
ExecStart=/usr/bin/python3 server.py --config monitor-config.yaml
Restart=on-failure

[Install]
WantedBy=default.target
EOF
systemctl --user enable --now dev-machine-dashboard
```

### Adding More Machines

Add entries to `monitor-config.yaml` and restart the server. Each machine needs a
`name`, `project_dir`, and either `container_name` or `container_prefix`.

### Dashboard Health Tiers

The dashboard assigns a health status to each machine based on these checks (highest priority first):

| Health | Condition | What It Means |
|--------|-----------|---------------|
| **offline** | Container not found | Not running at all |
| **stopped** | Container exited | Crashed or stopped |
| **critical** | Postmortem file exists | Halted — needs attention (see halt recovery above) |
| **warning** | Heartbeat stale (> 60 min) | May be stuck |
| **idle** | 0% CPU, fresh heartbeat | Cloudflare backoff or inter-session cooldown |
| **healthy** | Running, fresh heartbeat, no postmortem | Working normally |

**Important:** A stale postmortem file from a previous halt will keep the dashboard showing
"critical" even after the machine resumes. The entrypoint auto-deletes the postmortem on
resume for all three halt paths (test-env-broken, idle-cycle, and structural failure).
For machines generated before this fix, manually remove it:
`rm /Users/chrispark/Projects/ridecast2/.dev-machine-postmortem`

### Fleet Supervisor (Multiple Machines)

When running 3+ machines, consider the fleet supervisor — it replaces per-machine cron
entries with a single `*/5` cron that adds cross-machine intelligence (correlated
Cloudflare detection, SSH agent health, coordinated stop detection) and alerting
(email + Slack/Teams webhooks).

```bash
cd <path-to-bundle>/monitor
bash install-fleet.sh
```

See `monitor/monitor-config.example.yaml` for the full fleet and alerting configuration.
