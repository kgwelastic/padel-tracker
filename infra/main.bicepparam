// Parameter file for production deployment
// Usage: az deployment group create --resource-group rg-padel-prod --template-file infra/main.bicep --parameters infra/main.bicepparam

using './main.bicep'

param environment = 'prod'
param appName = 'padel'
param location = 'westeurope'   // Amsterdam — closest to Poland

// These sensitive params must be passed via --parameters flag or Key Vault reference:
// az deployment group create ... \
//   --parameters infra/main.bicepparam \
//   --parameters dbAdminPassword='...' nextAuthSecret='...' adminEmail='...' adminPassword='...'
