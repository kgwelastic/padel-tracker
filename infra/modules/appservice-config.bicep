// Updates App Service app settings with Key Vault references
// Runs after Key Vault is created and RBAC is assigned

param appName string
param kvRefDbUrl string
param kvRefNextAuth string
param kvRefAdminEmail string
param kvRefAdminPass string

resource webApp 'Microsoft.Web/sites@2023-01-01' existing = {
  name: appName
}

// Patch only the Key Vault-backed settings — other settings stay unchanged
resource appSettings 'Microsoft.Web/sites/config@2023-01-01' = {
  parent: webApp
  name: 'appsettings'
  properties: {
    DATABASE_URL:    kvRefDbUrl
    NEXTAUTH_SECRET: kvRefNextAuth
    ADMIN_EMAIL:     kvRefAdminEmail
    ADMIN_PASSWORD:  kvRefAdminPass
  }
}
