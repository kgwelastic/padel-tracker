#!/bin/bash
# ============================================================
# First-time Azure infrastructure deployment
# Prerequisites: Azure CLI (az login) + GitHub CLI (gh auth login)
# ============================================================
set -e

RESOURCE_GROUP="rg-padel-prod"
LOCATION="swedencentral"
GITHUB_REPO="kgwelastic/padel-tracker"

echo "=== 1. Checking prerequisites ==="
az account show &>/dev/null || az login
gh auth status &>/dev/null || { echo "Run: gh auth login"; exit 1; }

echo "=== 2. Creating Resource Group ==="
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

echo "=== 3. Deploying Bicep infrastructure ==="
echo "You will be prompted for secret values."

read -s -p "DB admin password: " DB_PASSWORD; echo
read -s -p "NextAuth secret (Enter = auto-generate): " NEXTAUTH_SECRET; echo
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
echo "=== 4. Reading deployment outputs ==="
ACR_LOGIN_SERVER=$(az deployment group show \
  --resource-group "$RESOURCE_GROUP" --name "main" \
  --query "properties.outputs.acrLoginServer.value" -o tsv)

APP_NAME=$(az deployment group show \
  --resource-group "$RESOURCE_GROUP" --name "main" \
  --query "properties.outputs.appServiceName.value" -o tsv)

ACR_NAME=$(az acr list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv)
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query "username" -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

PUBLISH_PROFILE=$(az webapp deployment list-publishing-profiles \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --xml)

echo ""
echo "=== 5. Setting GitHub Actions secrets ==="
gh secret set ACR_LOGIN_SERVER   --body "$ACR_LOGIN_SERVER"  --repo "$GITHUB_REPO"
gh secret set ACR_USERNAME       --body "$ACR_USERNAME"      --repo "$GITHUB_REPO"
gh secret set ACR_PASSWORD       --body "$ACR_PASSWORD"      --repo "$GITHUB_REPO"
gh secret set AZURE_APP_NAME     --body "$APP_NAME"          --repo "$GITHUB_REPO"
gh secret set AZURE_PUBLISH_PROFILE --body "$PUBLISH_PROFILE" --repo "$GITHUB_REPO"

echo "  All secrets set."

echo ""
echo "=== Done! ==="
echo "  App URL:  https://${APP_NAME}.azurewebsites.net"
echo "  ACR:      ${ACR_LOGIN_SERVER}"
echo ""
echo "Next: push to main branch to trigger the first deploy."
