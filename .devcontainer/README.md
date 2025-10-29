# Ridecast Devcontainer

GitHub Codespaces configuration with full development environment for Ridecast.

## What's Included

**Tools:**
- Python 3.11 + Node.js LTS + uv package manager
- **Amplifier toolkit** (automatically cloned and symlinked)
- Claude Code CLI
- GitHub CLI (`gh`)
- Make, Git, Vim
- Docker-in-Docker

**Resources:**
- 2 CPU cores, 8GB RAM, 32GB storage
- Auto-stops after 30 minutes idle

**Ports:**
- 3003: Next.js Frontend
- 3004: Backend API
- 5432: PostgreSQL
- 6379: Redis

**Configuration:**
- Git auto-push enabled
- Amplifier automatically installed with dependencies
- Post-creation status report

## Quick Customization

### Change Container Name
Edit `devcontainer.json`:
```json
{
  "name": "your-project-name"
}
```

### Adjust Resources
```json
{
  "hostRequirements": {
    "cpus": 4,
    "memory": "16gb",
    "storage": "64gb"
  }
}
```

### Add Tools
Browse [available features](https://github.com/devcontainers/features) and add to `features` section.

### Add VS Code Extensions
Add to `customizations.vscode.extensions` array in `devcontainer.json`.

### Project-Specific Setup
Edit `post-create.sh` to add commands (e.g., `make install`).

## Using Amplifier in Codespace

The devcontainer automatically:
1. Clones amplifier to `/workspaces/amplifier`
2. Symlinks it to your project root as `./amplifier`
3. Installs all Python dependencies with `uv sync`
4. Creates `.env` file from `.env.example`

### Amplifier Commands Available

All amplifier Make commands work via the symlink:
```bash
# Knowledge synthesis
make knowledge-update
make knowledge-query Q="your question"
make knowledge-graph-viz

# Ultra-thinking workflows
# Use Claude Code slash commands from .claude/commands/
/ultrathink-task "your complex task"
```

### Adding Your API Keys

After Codespace starts, edit `/workspaces/amplifier/.env`:
```bash
cd /workspaces/amplifier
vim .env  # Add your ANTHROPIC_API_KEY
```

## Documentation

- [Devcontainer Specification](https://containers.dev/)
- [GitHub Codespaces Docs](https://docs.github.com/en/codespaces)
- [Available Features](https://github.com/devcontainers/features)
- [Amplifier Repository](https://github.com/cpark4x/amplifier)

**Detailed guides:** Available in `docs-archive/` if you need comprehensive documentation.
