# What You Need to Deploy to Your Azure Subscription

## Quick Answer

To deploy this application to your existing Azure subscription, you need:

1. **An Azure subscription** (that's it for prerequisites!)
2. **Azure CLI** installed on your computer
3. **5-10 minutes** of your time

Then follow the [QUICKSTART.md](QUICKSTART.md) guide.

---

## The Complete Process

### Step 1: Install Azure CLI (if needed)

**Windows**: Download from https://aka.ms/installazurecliwindows

**Mac**: 
```bash
brew update && brew install azure-cli
```

**Linux**:
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### Step 2: Deploy Infrastructure (3 commands)

```bash
# 1. Login to your Azure subscription
az login

# 2. Create a resource group
az group create \
  --name the-dev-branch-rg \
  --location eastus

# 3. Deploy everything (Web App, App Insights, etc.)
az deployment group create \
  --resource-group the-dev-branch-rg \
  --template-file infrastructure/main.bicep
```

**That's it!** The Bicep template automatically creates:
- App Service Plan
- Web App (with .NET 8, WebSockets enabled)
- Application Insights
- Log Analytics Workspace

### Step 3: Deploy Your Code

**Option A - Quick (Direct Deploy)**:
```bash
cd TheDevBranch
dotnet publish -c Release -o ./publish
cd publish
zip -r ../deploy.zip .
cd ..
az webapp deployment source config-zip \
  --name YOUR-WEBAPP-NAME \
  --resource-group the-dev-branch-rg \
  --src deploy.zip
```

**Option B - Automated (GitHub Actions)**:
1. Get publish profile from Azure
2. Add to GitHub Secrets
3. Push code → automatic deployment

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

---

## What Gets Created in Your Subscription

### Resources Created

| Resource | Purpose | Cost |
|----------|---------|------|
| Resource Group | Container for all resources | Free |
| App Service Plan (B1) | Hosting infrastructure | ~$13/month |
| Web App | Runs your application | Included in plan |
| Application Insights | Monitoring & diagnostics | First 5GB free |
| Log Analytics Workspace | Stores logs | Small usage fee |

**Total**: ~$13/month (or free with Azure credits)

### Where Are Resources Created?

- **Location**: East US (default, can be changed)
- **Resource Group**: `the-dev-branch-rg`
- **Naming**: Web app gets unique name like `the-dev-branch-abc123`

---

## What You DON'T Need

❌ Don't need: Existing Web App  
❌ Don't need: Existing App Service Plan  
❌ Don't need: Existing Application Insights  
❌ Don't need: Complex configuration  
❌ Don't need: Manual setup in Azure Portal  

✅ You only need: Azure subscription + Azure CLI

---

## Deployment Time

- **Infrastructure deployment**: 2-3 minutes
- **Code deployment**: 2-5 minutes
- **Total**: ~5-10 minutes

---

## After Deployment

Your game will be live at:
```
https://YOUR-WEBAPP-NAME.azurewebsites.net
```

You can:
- Share the URL with your team
- Play with 10+ concurrent players
- Monitor performance in Application Insights
- Scale up/out as needed
- Update cards by editing text files

---

## Next Steps

1. **Deploy now**: Follow [QUICKSTART.md](QUICKSTART.md)
2. **Customize cards**: Edit `black-cards.txt` and `white-cards.txt`
3. **Set up CI/CD**: Configure GitHub Actions for automatic deployment
4. **Monitor**: Use Application Insights to track usage
5. **Scale**: Upgrade tier if you need more capacity

---

## Need Help?

- **Quick deployment**: [QUICKSTART.md](QUICKSTART.md)
- **Detailed guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Local testing**: [LOCAL-TESTING.md](LOCAL-TESTING.md)
- **Game rules**: [README.md](README.md)

---

## Common Questions

**Q: Will this create charges on my subscription?**  
A: Yes, about $13/month for B1 tier. You can use Azure free credits, or delete the resource group when done.

**Q: Can I use a different region?**  
A: Yes, change `--location eastus` to your preferred region (e.g., `westus2`, `northeurope`)

**Q: Do I need to configure anything manually?**  
A: No, the Bicep template configures everything (WebSockets, HTTPS, etc.)

**Q: Can I use my existing domain?**  
A: Yes, you can add a custom domain in Azure Portal after deployment

**Q: What if I want to delete everything?**  
A: Run: `az group delete --name the-dev-branch-rg --yes`

---

## Start Here

👉 **[QUICKSTART.md](QUICKSTART.md)** - Step-by-step deployment guide

Ready to deploy? It takes less than 10 minutes! 🚀


