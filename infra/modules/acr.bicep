// Azure Container Registry
// Stores Docker images for the Next.js app

@description('Registry name — lowercase alphanumeric, 5-50 chars')
param name string

param location string

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: name
  location: location
  sku: {
    name: 'Basic' // ~5€/month — sufficient for a small app
  }
  properties: {
    adminUserEnabled: true // Needed for App Service to pull images
  }
}

output loginServer string = acr.properties.loginServer
output name string = acr.name
