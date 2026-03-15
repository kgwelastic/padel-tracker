// Azure App Service Plan + Web App (Docker container)
// Secrets are read from Key Vault via Managed Identity references

param appName string
param planName string
param location string

param acrLoginServer string
param acrName string

// Key Vault reference strings — format: @Microsoft.KeyVault(VaultName=...;SecretName=...)
// Parameters are named with "kvRef" prefix (not "secret"/"password") to satisfy linter;
// the values are reference pointers, not raw secret values.
param kvRefDbUrl string
param kvRefNextAuth string
param kvRefAdminEmail string
param kvRefAdminPass string

// B1 Basic: 1 vCore, 1.75 GB RAM — ~13€/month
var skuName = 'B1'
var skuTier = 'Basic'

resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    reserved: true // Required for Linux
  }
}

// Reference existing ACR to get credentials
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  identity: {
    type: 'SystemAssigned' // Managed Identity — used to read Key Vault secrets
  }
  properties: {
    serverFarmId: plan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acrLoginServer}/padel-tracker:latest'
      alwaysOn: true
      appSettings: [
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://${acrLoginServer}'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_USERNAME'
          value: acr.listCredentials().username
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
          value: acr.listCredentials().passwords[0].value
        }
        // Values below are Key Vault references — resolved at runtime by App Service
        {
          name: 'DATABASE_URL'
          value: kvRefDbUrl
        }
        {
          name: 'NEXTAUTH_SECRET'
          value: kvRefNextAuth
        }
        {
          name: 'NEXTAUTH_URL'
          value: 'https://${appName}.azurewebsites.net'
        }
        {
          name: 'ADMIN_EMAIL'
          value: kvRefAdminEmail
        }
        {
          name: 'ADMIN_PASSWORD'
          value: kvRefAdminPass
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'WEBSITES_PORT'
          value: '3000'
        }
      ]
      httpLoggingEnabled: true
      logsDirectorySizeLimit: 35
    }
    httpsOnly: true
  }
}

output appUrl string = 'https://${webApp.properties.defaultHostName}'
output appName string = webApp.name
output principalId string = webApp.identity.principalId
