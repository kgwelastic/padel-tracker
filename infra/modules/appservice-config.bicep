// Sets ALL App Service app settings in one resource.
// Must run after Key Vault is created (needs KV reference strings)
// and after App Service exists (needs appName + acrName).
// NOTE: Microsoft.Web/sites/config@appsettings REPLACES all settings —
//       every setting must be included here, not just KV-backed ones.

param appName string
param acrName string

param kvRefDbUrl string
param kvRefNextAuth string
param kvRefAdminEmail string
param kvRefAdminPass string

resource webApp 'Microsoft.Web/sites@2023-01-01' existing = {
  name: appName
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

resource appSettings 'Microsoft.Web/sites/config@2023-01-01' = {
  parent: webApp
  name: 'appsettings'
  properties: {
    // Docker registry credentials
    DOCKER_REGISTRY_SERVER_URL:      'https://${acr.properties.loginServer}'
    DOCKER_REGISTRY_SERVER_USERNAME: acr.listCredentials().username
    DOCKER_REGISTRY_SERVER_PASSWORD: acr.listCredentials().passwords[0].value

    // Secrets from Key Vault (resolved at runtime by App Service Managed Identity)
    DATABASE_URL:    kvRefDbUrl
    NEXTAUTH_SECRET: kvRefNextAuth
    ADMIN_EMAIL:     kvRefAdminEmail
    ADMIN_PASSWORD:  kvRefAdminPass

    // App config
    NEXTAUTH_URL:   'https://${appName}.azurewebsites.net'
    NODE_ENV:       'production'
    WEBSITES_PORT:  '3000'
  }
}
