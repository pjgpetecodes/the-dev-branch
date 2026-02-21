# Deployment Guide

This is the **detailed deployment guide** for The Dev Branch.

> **Quick Start**: For streamlined deployment instructions, see [QUICKSTART.md](QUICKSTART.md)

This guide covers:
- Detailed explanation of Azure resources
- Multiple deployment options
- Advanced configuration
- Monitoring and troubleshooting
- Scaling and optimization

## Overview

To deploy this application to Azure, you need:
- An Azure subscription
- Azure CLI installed
- (Optional) GitHub account for automated deployments

## Prerequisites

- Azure subscription
- Azure CLI installed
- GitHub account with this repository

## Step 1: Deploy Azure Resources

1. Login to Azure:
```bash
az login
```

2. Create a resource group:
```bash
az group create \
  --name the-dev-branch-rg \
  --location eastus
```

3. Deploy the infrastructure:
```bash
az deployment group create \
  --resource-group the-dev-branch-rg \
  --template-file infrastructure/main.bicep \
  --parameters appName=the-dev-branch-<your-unique-id>
```

4. Note the output values (web app name and URL).

## Step 2: Configure GitHub Actions

1. Get the publish profile:
   - Go to Azure Portal
   - Navigate to your App Service
   - Click "Deployment Center" > "Manage publish profile"
   - Click "Download publish profile"

2. Add the publish profile to GitHub:
   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Value: Paste the entire contents of the downloaded publish profile
   - Click "Add secret"

3. Update the workflow file:
   - Open `.github/workflows/azure-deploy.yml`
   - Update the `AZURE_WEBAPP_NAME` environment variable with your web app name
   - Commit and push the changes

## Step 3: Deploy the Application

The application will automatically deploy when you push to the `main` branch. To trigger a manual deployment:

1. Go to your GitHub repository
2. Click on "Actions"
3. Select "Build and Deploy to Azure"
4. Click "Run workflow"
5. Select the branch (main) and click "Run workflow"

## Step 4: Verify Deployment

1. Wait for the GitHub Action to complete (usually 2-5 minutes)
2. Navigate to your web app URL (shown in the deployment output)
3. You should see the game lobby screen
4. Test by creating a room and inviting friends!

## Monitoring

Application Insights is automatically configured. To view logs and metrics:

1. Go to Azure Portal
2. Navigate to your Application Insights resource
3. Explore:
   - Live Metrics for real-time monitoring
   - Performance for response times
   - Failures for error tracking
   - Logs for detailed diagnostics

## Troubleshooting

### App doesn't start
- Check the Application Insights logs
- Verify the web app configuration in Azure Portal
- Ensure WebSockets are enabled (required for SignalR)

### Players can't connect
- Verify HTTPS is working
- Check that WebSockets are enabled
- Review SignalR connection logs in browser console

### Cards not loading
- Ensure the card files are in the repository root
- Check Application Insights for file loading errors

## Scaling

To support more concurrent players:

1. Scale up: Increase App Service Plan tier
```bash
az appservice plan update \
  --name the-dev-branch-plan \
  --resource-group the-dev-branch-rg \
  --sku S1
```

2. Scale out: Add more instances
```bash
az appservice plan update \
  --name the-dev-branch-plan \
  --resource-group the-dev-branch-rg \
  --number-of-workers 2
```

## Cost Optimization

- Use B1 tier for testing/development (~$13/month)
- Use S1 tier for production with moderate traffic (~$75/month)
- Enable auto-scaling based on CPU/memory usage
- Set up budget alerts in Azure Cost Management

## Custom Domain (Optional)

To use a custom domain:

1. Add custom domain in Azure Portal
2. Configure DNS records
3. Enable SSL/TLS certificate (free with App Service)
4. Update HTTPS redirect rules if needed

## Backup and Disaster Recovery

Consider setting up:
- Automated backups in App Service
- Deployment slots for staging/production
- Traffic Manager for multi-region deployment
