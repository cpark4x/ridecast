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
