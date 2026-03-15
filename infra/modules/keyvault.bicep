// Azure Key Vault — stores all application secrets
// App Service accesses secrets via Managed Identity + Key Vault references

param name string
param location string

@description('Object ID of the App Service Managed Identity')
param appServicePrincipalId string

@secure()
param databaseUrl string

@secure()
param nextAuthSecret string

param adminEmail string

@secure()
param adminPassword string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true   // Use RBAC instead of access policies
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enabledForTemplateDeployment: true
  }
}

// Grant App Service Managed Identity read access to secrets
resource kvSecretUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, appServicePrincipalId, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6' // Key Vault Secrets User (read-only)
    )
    principalId: appServicePrincipalId
    principalType: 'ServicePrincipal'
  }
}

// ── Secrets ──────────────────────────────────────────────
resource secretDatabaseUrl 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'database-url'
  properties: { value: databaseUrl }
}

resource secretNextAuthSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'nextauth-secret'
  properties: { value: nextAuthSecret }
}

resource secretAdminEmail 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'admin-email'
  properties: { value: adminEmail }
}

resource secretAdminPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'admin-password'
  properties: { value: adminPassword }
}

// ── Outputs — Key Vault reference strings for App Service ──
output kvName string = keyVault.name
output refDatabaseUrl string    = '@Microsoft.KeyVault(VaultName=${name};SecretName=database-url)'
output refNextAuthSecret string = '@Microsoft.KeyVault(VaultName=${name};SecretName=nextauth-secret)'
output refAdminEmail string     = '@Microsoft.KeyVault(VaultName=${name};SecretName=admin-email)'
output refAdminPassword string  = '@Microsoft.KeyVault(VaultName=${name};SecretName=admin-password)'
