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

// ── Modules ───────────────────────────────────────────────
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

module appService 'modules/appservice.bicep' = {
  name: 'appservice-deploy'
  params: {
    appName: 'app-${suffix}'
    planName: 'plan-${suffix}'
    location: location
    environment: environment
    acrLoginServer: acr.outputs.loginServer
    acrName: acr.outputs.name
    databaseUrl: 'postgresql://${dbAdminUser}:${dbAdminPassword}@${postgres.outputs.fqdn}:5432/padel_tracker?sslmode=require'
    nextAuthSecret: nextAuthSecret
    adminEmail: adminEmail
    adminPassword: adminPassword
  }
}

// ── Outputs ────────────────────────────────────────────────
output appUrl string = appService.outputs.appUrl
output acrLoginServer string = acr.outputs.loginServer
output postgresHost string = postgres.outputs.fqdn
output appServiceName string = appService.outputs.appName
