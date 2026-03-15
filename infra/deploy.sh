#!/bin/bash
# ============================================================
# First-time Azure infrastructure deployment
# Prerequisites: Azure CLI installed + az login
# ============================================================
set -e

RESOURCE_GROUP="rg-padel-prod"
LOCATION="westeurope"

echo "=== 1. Logging in to Azure ==="
az account show &>/dev/null || az login

echo "=== 2. Creating Resource Group ==="
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

echo "=== 3. Deploying Bicep infrastructure ==="
echo "You will be prompted for secret values."

read -s -p "DB admin password: " DB_PASSWORD; echo
read -s -p "NextAuth secret (or press Enter to auto-generate): " NEXTAUTH_SECRET; echo
if [ -z "$NEXTAUTH_SECRET" ]; then
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  echo "  Generated NextAuth secret."
fi
read -p "Admin email: " ADMIN_EMAIL
read -s -p "Admin password: " ADMIN_PASSWORD; echo

az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$(dirname "$0")/main.bicep" \
  --parameters "$(dirname "$0")/main.bicepparam" \
  --parameters \
    dbAdminPassword="$DB_PASSWORD" \
    nextAuthSecret="$NEXTAUTH_SECRET" \
    adminEmail="$ADMIN_EMAIL" \
    adminPassword="$ADMIN_PASSWORD" \
  --output table

echo ""
echo "=== 4. Deployment outputs ==="
az deployment group show \
  --resource-group "$RESOURCE_GROUP" \
  --name "main" \
  --query "properties.outputs" \
  --output table

echo ""
echo "=== Done! ==="
echo "Next steps:"
echo "  1. Push Docker image to ACR (see GitHub Actions workflow)"
echo "  2. Run Prisma migrations (see CLAUDE.md)"
