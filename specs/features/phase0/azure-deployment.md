# Feature: Azure Deployment Configuration

> Create a Dockerfile, GitHub Actions deployment workflow, and deployment documentation for Azure Container Apps (East US 2, Microsoft subscription).

## Motivation

The app currently runs only on localhost. To become a hosted product, it needs a repeatable, automated deployment to Azure Container Apps. This spec produces the infrastructure files the machine can generate — the human then runs the one-time Azure resource setup commands documented in `docs/deployment.md`.

## What the Machine Builds

The machine generates files. The human runs the one-time Azure CLI setup (documented in `docs/deployment.md`). Deployment after that is automated via GitHub Actions on push to `main`.

## Changes

### 1. Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/src/generated ./src/generated

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 2. Update `next.config.ts` for standalone output

```typescript
const nextConfig: NextConfig = {
  output: "standalone",  // Add this line
  // ... rest of config unchanged
};
```

### 3. GitHub Actions workflow (`.github/workflows/deploy-azure.yml`)

```yaml
name: Deploy to Azure Container Apps

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ridecast.azurecr.io
  IMAGE_NAME: ridecast
  CONTAINER_APP_NAME: ridecast-app
  RESOURCE_GROUP: ridecast-rg

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Log in to Azure Container Registry
        run: |
          az acr login --name ridecast

      - name: Build and push Docker image
        run: |
          docker build -t $REGISTRY/$IMAGE_NAME:${{ github.sha }} -t $REGISTRY/$IMAGE_NAME:latest .
          docker push $REGISTRY/$IMAGE_NAME:${{ github.sha }}
          docker push $REGISTRY/$IMAGE_NAME:latest

      - name: Deploy to Azure Container Apps
        uses: azure/container-apps-deploy-action@v2
        with:
          resourceGroup: ${{ env.RESOURCE_GROUP }}
          containerAppName: ${{ env.CONTAINER_APP_NAME }}
          imageToDeploy: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

### 4. Deployment guide (`docs/deployment.md`)

```markdown
# Ridecast — Azure Deployment Guide

## One-Time Setup (run once, not automated)

### Prerequisites
- Azure CLI installed: `brew install azure-cli`
- Logged in: `az login`
- Subscription set: `az account set --subscription "Microsoft Azure"`

### 1. Create Resource Group (East US 2)
```bash
az group create --name ridecast-rg --location eastus2
```

### 2. Create Azure Container Registry
```bash
az acr create --resource-group ridecast-rg --name ridecast --sku Basic
az acr update --name ridecast --admin-enabled true
```

### 3. Create Azure Database for PostgreSQL
```bash
az postgres flexible-server create \
  --resource-group ridecast-rg \
  --name ridecast-db \
  --location eastus2 \
  --admin-user ridecast \
  --admin-password <STRONG_PASSWORD> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16
```

### 4. Create Azure Storage Account for audio files
```bash
az storage account create \
  --name ridecastaudio \
  --resource-group ridecast-rg \
  --location eastus2 \
  --sku Standard_LRS

az storage container create \
  --name ridecast-audio \
  --account-name ridecastaudio \
  --public-access blob
```

### 5. Create Azure Container App
```bash
az containerapp env create \
  --name ridecast-env \
  --resource-group ridecast-rg \
  --location eastus2

az containerapp create \
  --name ridecast-app \
  --resource-group ridecast-rg \
  --environment ridecast-env \
  --image ridecast.azurecr.io/ridecast:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 1.0 \
  --memory 2.0Gi
```

### 6. Set environment variables on the Container App
```bash
az containerapp secret set --name ridecast-app --resource-group ridecast-rg \
  --secrets \
  database-url="postgresql://ridecast:<PASSWORD>@ridecast-db.postgres.database.azure.com:5432/ridecast" \
  anthropic-key="sk-ant-..." \
  openai-key="sk-..." \
  clerk-secret="sk_live_..." \
  stripe-secret="sk_live_..." \
  stripe-webhook-secret="whsec_..." \
  azure-storage-connection-string="DefaultEndpointsProtocol=https;AccountName=ridecastaudio;..."

az containerapp update --name ridecast-app --resource-group ridecast-rg \
  --set-env-vars \
  DATABASE_URL=secretref:database-url \
  ANTHROPIC_API_KEY=secretref:anthropic-key \
  OPENAI_API_KEY=secretref:openai-key \
  CLERK_SECRET_KEY=secretref:clerk-secret \
  STRIPE_SECRET_KEY=secretref:stripe-secret \
  STRIPE_WEBHOOK_SECRET=secretref:stripe-webhook-secret \
  AZURE_STORAGE_CONNECTION_STRING=secretref:azure-storage-connection-string \
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..." \
  GOOGLE_CLOUD_PROJECT="your-project-id"
```

### 7. Run database migrations
```bash
az containerapp exec --name ridecast-app --resource-group ridecast-rg \
  --command "npx prisma migrate deploy"
```

### 8. Set up GitHub Actions secret
```bash
az ad sp create-for-rbac \
  --name "ridecast-github" \
  --role contributor \
  --scopes /subscriptions/<SUB_ID>/resourceGroups/ridecast-rg \
  --sdk-auth
# Paste output as AZURE_CREDENTIALS secret in GitHub repo settings
```

## Ongoing Deployments

After setup, every push to `main` automatically:
1. Builds a new Docker image
2. Pushes to Azure Container Registry
3. Deploys to Azure Container Apps (zero-downtime rolling update)

## Costs (East US 2, estimated)

| Resource | Tier | Monthly Cost |
|---|---|---|
| Container Apps (1-3 replicas) | Consumption | ~$20-60 |
| PostgreSQL Flexible Server | Burstable B1ms | ~$15 |
| Storage Account | Standard LRS | ~$1 |
| Container Registry | Basic | ~$5 |
| **Total** | | **~$40-80/mo** |
```

### 5. Update `.env.example` with all Phase 0 env vars

```bash
# ============================================================
# Ridecast2 — Environment Variables
# ============================================================

# Database
DATABASE_URL="postgresql://postgres:ridecast@localhost:5433/ridecast"

# AI — Script Generation
ANTHROPIC_API_KEY=sk-ant-...

# TTS — Voice Generation (priority: Google > ElevenLabs > OpenAI)
OPENAI_API_KEY=sk-...                                          # fallback TTS
ELEVENLABS_API_KEY=                                            # optional BYOK
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json  # primary hosted
GOOGLE_CLOUD_PROJECT=your-project-id

# Auth (Clerk — https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Payments (Stripe — https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Azure Storage (required in production; omit for local dev)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=ridecast-audio
```

## Files to Create/Modify

| File | Change |
|---|---|
| `Dockerfile` | New — multi-stage Next.js container |
| `next.config.ts` | Add `output: "standalone"` |
| `.github/workflows/deploy-azure.yml` | New — CI/CD pipeline |
| `docs/deployment.md` | New — one-time Azure setup guide |
| `.env.example` | Replace with complete Phase 0 env vars |
| `.dockerignore` | New — exclude node_modules, .next, .env |

### `.dockerignore`

```
node_modules
.next
.env
.env.local
.env.*.local
npm-debug.log*
prisma/dev.db
```

## Tests

This spec is infrastructure — no unit tests. Verify by:

```bash
# Build the Docker image locally
docker build -t ridecast-local .

# Run locally to verify the image works
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e ANTHROPIC_API_KEY="..." \
  -e OPENAI_API_KEY="..." \
  ridecast-local
```

## Success Criteria

```bash
npm run build   # Build succeeds with output: "standalone"
docker build .  # Docker image builds without errors
```

The GitHub Actions workflow runs automatically on the next push to `main` once `AZURE_CREDENTIALS` secret is configured in GitHub.

## Scope

Infrastructure files only. No application code changes except `next.config.ts` `output: "standalone"`. The deployment guide is a reference document — the human runs these commands once, then deployment is fully automated.
