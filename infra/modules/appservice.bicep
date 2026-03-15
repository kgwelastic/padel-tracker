// Azure App Service Plan + Web App (Docker container)
// Secrets are read from Key Vault via Managed Identity references

param appName string
param planName string
param location string

@allowed(['dev', 'prod'])
param environment string

param acrLoginServer string
param acrName string

// Key Vault reference strings — format: @Microsoft.KeyVault(VaultName=...;SecretName=...)
param kvRefDatabaseUrl string
param kvRefNextAuthSecret string
param kvRefAdminEmail string
param kvRefAdminPassword string

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
        // Secrets resolved at runtime from Key Vault
        {
          name: 'DATABASE_URL'
          value: kvRefDatabaseUrl
        }
        {
          name: 'NEXTAUTH_SECRET'
          value: kvRefNextAuthSecret
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
          value: kvRefAdminPassword
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
output principalId string = webApp.identity.principalId  // Managed Identity ID for Key Vault RBAC
