# Quick Start: Deploy to Your Azure Subscription

This guide helps you deploy The Dev Branch to your **existing Azure subscription**. The deployment will automatically create all necessary resources (Web App, App Service Plan, Application Insights, etc.).

> **Don't have Azure yet?** Get a [free Azure account](https://azure.microsoft.com/free/) with $200 credit.

## What You Need


## What Gets Created

The deployment automatically creates:

## Quick Deploy: Two Options

Choose your preferred deployment method:


## 🚀 Option A: GitHub Actions (Recommended)

Best for continuous deployment - every push automatically deploys!

### Step 1: Deploy Azure Infrastructure

```bash
# Login to Azure
az login

# Create a resource group
az group create \
  --name the-dev-branch-rg \
  --location eastus

# Deploy the infrastructure (creates Web App, App Insights, etc.)
az deployment group create \
  --resource-group the-dev-branch-rg \
  --template-file infrastructure/main.bicep
```

**Note the output** - you'll see your web app name (like `the-dev-branch-abc123`).

### Step 2: Get Publish Profile

```bash
# Replace with your actual web app name from step 1
az webapp deployment list-publishing-profiles \
  --name YOUR-WEBAPP-NAME \
  --resource-group the-dev-branch-rg \
  --xml > publish-profile.xml
```

### Step 3: Configure GitHub Actions

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
5. Value: Paste contents of `publish-profile.xml` file
6. Click **Add secret**

### Step 4: Update Workflow File

Edit `.github/workflows/azure-deploy.yml`, line 10:

```yaml
env:
  AZURE_WEBAPP_NAME: 'your-webapp-name-here'  # ← Change to your web app name
  AZURE_WEBAPP_PACKAGE_PATH: './TheDevBranch'
  DOTNET_VERSION: '8.0.x'
```

Commit and push:

```bash
git add .github/workflows/azure-deploy.yml
git commit -m "Configure Azure deployment"
git push origin main
```

### Step 5: Deploy!

Push to main branch triggers automatic deployment:

```bash
git push origin main
```

Watch deployment progress in GitHub **Actions** tab (takes 2-5 minutes).


## ⚡ Option B: Direct Azure CLI Deploy

Fastest way to deploy once - no GitHub Actions needed.

### Deploy Infrastructure

```bash
# Login to Azure
az login

# Create resource group
az group create \
  --name the-dev-branch-rg \
  --location eastus

# Deploy infrastructure
az deployment group create \
  --resource-group the-dev-branch-rg \
  --template-file infrastructure/main.bicep
```

Note your web app name from the output.

### Build and Deploy Application

```bash
# Navigate to application folder
cd TheDevBranch

# Publish the application
dotnet publish -c Release -o ./publish

# Create deployment zip
cd publish
zip -r ../deploy.zip .
cd ..

# Deploy to Azure (replace YOUR-WEBAPP-NAME)
az webapp deployment source config-zip \
  --name YOUR-WEBAPP-NAME \
  --resource-group the-dev-branch-rg \
  --src deploy.zip

# Clean up
cd ..
rm -f TheDevBranch/deploy.zip
rm -rf TheDevBranch/publish
```


## ✅ Verify Deployment

1. **Get your URL**:
   ```bash
   az webapp show \
     --name YOUR-WEBAPP-NAME \
     --resource-group the-dev-branch-rg \
     --query defaultHostName \
     --output tsv
   ```

2. **Open in browser**: `https://YOUR-WEBAPP-NAME.azurewebsites.net`

3. **Test the game**:
   - Enter a player name and room ID
   - Click "Join Room"
   - Open 2 more browser tabs, join same room
   - Click "Start Game" (needs 3+ players)
   - Play a round!


## 📊 Monitor Your App

### View Live Logs

```bash
az webapp log tail \
  --name YOUR-WEBAPP-NAME \
  --resource-group the-dev-branch-rg
```

### View Application Insights

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your resource group: `the-dev-branch-rg`
3. Click on the Application Insights resource
4. Explore **Live Metrics** for real-time monitoring


## 🔧 Common Tasks

### Update Card Content

1. Edit `black-cards.txt` or `white-cards.txt`
2. Commit and push (if using GitHub Actions)
   ```bash
   git add black-cards.txt white-cards.txt
   git commit -m "Update cards"
   git push origin main
   ```
3. Or redeploy manually (Option B steps)

### Scale Your Application

```bash
# Get your App Service Plan name
az appservice plan list \
  --resource-group the-dev-branch-rg \
  --query "[0].name" \
  --output tsv

# Scale up (more powerful instance)
az appservice plan update \
  --name YOUR-PLAN-NAME \
  --resource-group the-dev-branch-rg \
  --sku S1

# Scale out (more instances for more players)
az appservice plan update \
  --name YOUR-PLAN-NAME \
  --resource-group the-dev-branch-rg \
  --number-of-workers 2
```

### Delete Everything

When you're done:

```bash
az group delete \
  --name the-dev-branch-rg \
  --yes \
  --no-wait
```


## 🐛 Troubleshooting

### "Web app not found"

### "Cards not loading"

### "SignalR connection failed"
  ```bash
  az webapp config show \
    --name YOUR-WEBAPP-NAME \
    --resource-group the-dev-branch-rg \
    --query webSocketsEnabled
  ```

### Deployment fails


## 💰 Cost Estimate

With free Azure credits:

To minimize costs:


## 📚 Additional Resources



## 🎉 You're Done!

Your game is now live at: `https://YOUR-WEBAPP-NAME.azurewebsites.net`

**Share the URL** with your team and start playing! 🎮

**Next steps**:

Need help? Open an issue on GitHub!


