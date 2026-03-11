# ridecast2 Dev Machine Container
# Sandboxed environment for autonomous AI agent execution.
#
# Build:  docker compose -f .dev-machine/docker-compose.dev-machine.yaml build
# Run:    docker compose -f .dev-machine/docker-compose.dev-machine.yaml up -d
# Shell:  docker compose -f .dev-machine/docker-compose.dev-machine.yaml exec dev-machine bash

FROM node:22-bookworm-slim

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
        openssh-client \
        git \
        curl \
        ca-certificates \
        jq \
        python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

# System Python: pyyaml for STATE.yaml operations in recipe bash steps
RUN python3 -m pip install --no-cache-dir --break-system-packages pyyaml

# Pinned uv for Amplifier install
COPY --from=ghcr.io/astral-sh/uv:0.10.4 /uv /uvx /usr/local/bin/

# Non-root user (macOS: UID 501, GID 20/staff)
ARG USER_UID=501
ARG USER_GID=20

RUN groupadd -f -g ${USER_GID} staff 2>/dev/null || true \
    && id -u chrispark >/dev/null 2>&1 \
    || useradd -m -u ${USER_UID} -g ${USER_GID} -s /bin/bash \
         -d /Users/chrispark chrispark

USER chrispark
ENV PATH="/Users/chrispark/.local/bin:${PATH}"

RUN uv tool install amplifier --from "git+https://github.com/microsoft/amplifier"

# Git identity for container commits
RUN git config --global user.name "ridecast2 Dev Machine" && \
    git config --global user.email "dev-machine@ridecast2.local" && \
    git config --global --add safe.directory /Users/chrispark/Projects/ridecast2 && \
    git config --global url."git@github.com:".insteadOf "https://github.com/"

# SSH directory for known_hosts bind-mount
RUN mkdir -p /Users/chrispark/.ssh && chmod 700 /Users/chrispark/.ssh

# Pre-create .amplifier dir for named volume
RUN mkdir -p /Users/chrispark/.amplifier

# Entrypoint
COPY --chown=501:20 scripts/entrypoint.sh /Users/chrispark/entrypoint.sh
RUN chmod +x /Users/chrispark/entrypoint.sh

WORKDIR /Users/chrispark/Projects/ridecast2

ENTRYPOINT ["/Users/chrispark/entrypoint.sh"]
CMD ["amplifier", "tool", "invoke", "recipes", "operation=execute", \
     "recipe_path=/Users/chrispark/Projects/ridecast2/.dev-machine/recipes/build.yaml"]
