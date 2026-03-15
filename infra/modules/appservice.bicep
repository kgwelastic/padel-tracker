// Azure App Service Plan + Web App (Docker container)

param appName string
param planName string
param location string

@allowed(['dev', 'prod'])
param environment string

param acrLoginServer string
param acrName string

@secure()
param databaseUrl string

@secure()
param nextAuthSecret string

param adminEmail string

@secure()
param adminPassword string

// B1 Basic: 1 vCore, 1.75 GB RAM — ~13€/month
// Scale up to P1v3 if needed (~55€/month)
var skuName = environment == 'prod' ? 'B1' : 'B1'
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
        {
          name: 'DATABASE_URL'
          value: databaseUrl
        }
        {
          name: 'NEXTAUTH_SECRET'
          value: nextAuthSecret
        }
        {
          name: 'NEXTAUTH_URL'
          value: 'https://${appName}.azurewebsites.net'
        }
        {
          name: 'ADMIN_EMAIL'
          value: adminEmail
        }
        {
          name: 'ADMIN_PASSWORD'
          value: adminPassword
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
