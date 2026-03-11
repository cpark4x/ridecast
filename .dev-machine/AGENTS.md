# ridecast2 Dev Machine

This project is managed by an autonomous development machine.

## Running the Machine

```bash
export DEV_MACHINE_ALLOW_HOST=1
amplifier tool invoke recipes operation=execute recipe_path=.dev-machine/recipes/build.yaml
```

## How It Works

The machine reads `.dev-machine/STATE.yaml` for current state, dispatches bounded working sessions that implement features via TDD, and persists all progress back to files.

Each session starts with zero context and reads everything from files. What isn't written down is lost.

## Key Files

- `STATE.yaml` — Machine-readable project state
- `CONTEXT-TRANSFER.md` — Human-readable session handoff notes
- `FEATURE-ARCHIVE.yaml` — Completed feature archive
- `SESSION-ARCHIVE.md` — Archived session summaries
- `SCRATCH.md` — Working notes and API inventory
- `recipes/` — Recipe YAML files driving the machine
