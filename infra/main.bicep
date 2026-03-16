// ============================================================
// Padel Tracker — Azure Infrastructure
// Deploy: az deployment group create --resource-group <rg> --template-file infra/main.bicep --parameters infra/main.bicepparam
// ============================================================

@description('Environment name (dev / prod)')
@allowed(['dev', 'prod'])
param environment string = 'prod'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Base name used for all resources, e.g. "padel"')
@minLength(3)
@maxLength(12)
param appName string = 'padel'

@description('PostgreSQL admin username')
param dbAdminUser string = 'padeladmin'

@description('PostgreSQL admin password')
@secure()
param dbAdminPassword string

@description('NextAuth secret (generate with: openssl rand -base64 32)')
@secure()
param nextAuthSecret string

@description('Admin email for the app login')
param adminEmail string

@description('Admin password for the app login')
@secure()
param adminPassword string

// ── Naming convention ──────────────────────────────────────
var suffix = '${appName}-${environment}'

// ── Step 1: ACR + PostgreSQL (no dependencies) ────────────
module acr 'modules/acr.bicep' = {
  name: 'acr-deploy'
  params: {
    name: replace('acr${suffix}', '-', '') // ACR names: lowercase alphanum only
    location: location
  }
}

module postgres 'modules/postgres.bicep' = {
  name: 'postgres-deploy'
  params: {
    serverName: 'psql-${suffix}'
    location: location
    adminUser: dbAdminUser
    adminPassword: dbAdminPassword
    databaseName: 'padel_tracker'
    environment: environment
  }
}

// ── Step 2: App Service — creates Managed Identity ────────
// Key Vault references will be set after Key Vault is ready.
// Placeholder values here — overwritten by appServiceConfig below.
module appService 'modules/appservice.bicep' = {
  name: 'appservice-deploy'
  params: {
    appName: 'app-${suffix}'
    planName: 'plan-${suffix}'
    location: location
    acrLoginServer: acr.outputs.loginServer
    acrName: acr.outputs.name
    // Placeholders — replaced by Key Vault references in appServiceConfig
    kvRefDbUrl: 'pending'
    kvRefNextAuth: 'pending'
    kvRefAdminEmail: 'pending'
    kvRefAdminPass: 'pending'
  }
}

// ── Step 3: Key Vault — needs App Service principalId ─────
module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault-deploy'
  params: {
    name: 'kv-${suffix}'
    location: location
    appServicePrincipalId: appService.outputs.principalId
    databaseUrl: 'postgresql://${dbAdminUser}:${dbAdminPassword}@${postgres.outputs.fqdn}:5432/padel_tracker?sslmode=require'
    nextAuthSecret: nextAuthSecret
    adminEmail: adminEmail
    adminPassword: adminPassword
  }
}

// ── Step 4: Update App Service with Key Vault references ──
module appServiceConfig 'modules/appservice-config.bicep' = {
  name: 'appservice-config-deploy'
  params: {
    appName: appService.outputs.appName
    acrName: acr.outputs.name
    kvRefDbUrl: keyVault.outputs.refDbUrl
    kvRefNextAuth: keyVault.outputs.refNextAuth
    kvRefAdminEmail: keyVault.outputs.refAdminEmail
    kvRefAdminPass: keyVault.outputs.refAdminPass
  }
}

// ── Outputs ────────────────────────────────────────────────
output appUrl string = appService.outputs.appUrl
output acrLoginServer string = acr.outputs.loginServer
output postgresHost string = postgres.outputs.fqdn
output appServiceName string = appService.outputs.appName
output keyVaultName string = keyVault.outputs.kvName
