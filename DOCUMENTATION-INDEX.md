# Documentation Index

Quick reference to all documentation files in this repository.

## 🚀 I Want to Deploy to Azure

**Start here** if you have an Azure subscription and want to deploy the game.

1. **[AZURE-DEPLOY-SUMMARY.md](AZURE-DEPLOY-SUMMARY.md)** ⭐ START HERE
   - Quick answer: "What do I need?"
   - Prerequisites checklist
   - Cost breakdown
   - Common questions

2. **[QUICKSTART.md](QUICKSTART.md)** - Step-by-step deployment
   - Two deployment options (GitHub Actions or direct CLI)
   - Copy-paste commands
   - Troubleshooting tips
   - ~10 minutes to deploy

3. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Detailed reference
   - Advanced configuration
   - Monitoring and scaling
   - Multiple deployment methods
   - Production considerations

## 🎮 I Want to Understand the Game

**Start here** if you want to learn about the game or run it locally.

1. **[README.md](README.md)** - Project overview
   - What is this game?
   - How to play
   - Features overview
   - Quick links to all docs

2. **[LOCAL-TESTING.md](LOCAL-TESTING.md)** - Local development
   - Running the game on your computer
   - Testing with multiple players
   - Development tips
   - Troubleshooting local issues

## 🔒 Security & Contributing

1. **[SECURITY.md](SECURITY.md)** - Security information
   - Security audit results
   - Vulnerabilities addressed
   - Best practices implemented
   - Production recommendations

2. **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
   - Adding new cards
   - Code contributions
   - Feature requests
   - Bug reports

## 📦 Deployment Quick Reference

### Deployment Options

| Method | Best For | Time | Difficulty |
|--------|----------|------|------------|
| **Direct CLI** | One-time deployment, testing | 5 min | Easy |
| **GitHub Actions** | Continuous deployment, teams | 10 min setup | Medium |
| **Docker** | Containerized environments | 10 min | Medium |
| **VS Code** | Visual Studio Code users | 5 min | Easy |

### Prerequisites by Method

| Method | Azure Sub | Azure CLI | GitHub | Docker |
|--------|-----------|-----------|--------|--------|
| Direct CLI | ✅ | ✅ | ❌ | ❌ |
| GitHub Actions | ✅ | ✅ | ✅ | ❌ |
| Docker | ✅ | ✅ | ❌ | ✅ |
| VS Code | ✅ | ❌ | ❌ | ❌ |

## 🎯 Quick Commands

### Deploy Infrastructure
```bash
az login
az group create --name the-dev-branch-rg --location eastus
az deployment group create \
   --resource-group the-dev-branch-rg \
  --template-file infrastructure/main.bicep
```

### Deploy Code (Direct)
```bash
cd TheDevBranch
dotnet publish -c Release -o ./publish
cd publish && zip -r ../deploy.zip . && cd ..
az webapp deployment source config-zip \
  --name YOUR-WEBAPP-NAME \
   --resource-group the-dev-branch-rg \
  --src deploy.zip
```

### Run Locally
```bash
cd TheDevBranch
dotnet run
# Open https://localhost:5001
```

### Delete Everything
```bash
az group delete --name the-dev-branch-rg --yes
```

## 📊 Documentation Structure

```
Documentation/
├── AZURE-DEPLOY-SUMMARY.md    ⭐ Start: "What do I need?"
├── QUICKSTART.md               📋 Step-by-step deployment
├── DEPLOYMENT.md               📚 Detailed reference
├── README.md                   📖 Project overview
├── LOCAL-TESTING.md            💻 Local development
├── SECURITY.md                 🔒 Security info
├── CONTRIBUTING.md             🤝 How to contribute
└── DOCUMENTATION-INDEX.md      📑 This file
```

## 🆘 Getting Help

### Common Scenarios

**"I just got an Azure account, how do I deploy?"**
→ [AZURE-DEPLOY-SUMMARY.md](AZURE-DEPLOY-SUMMARY.md)

**"I want to test the game on my computer first"**
→ [LOCAL-TESTING.md](LOCAL-TESTING.md)

**"Deployment failed, what do I check?"**
→ [QUICKSTART.md](QUICKSTART.md) - Troubleshooting section

**"How do I add custom cards?"**
→ [CONTRIBUTING.md](CONTRIBUTING.md) - Adding cards section

**"What are the security considerations?"**
→ [SECURITY.md](SECURITY.md)

**"I want to understand the architecture"**
→ [README.md](README.md) - Architecture section

### Support Channels

1. **Documentation** - You're reading it! 📚
2. **GitHub Issues** - Report bugs or ask questions
3. **GitHub Discussions** - Community help

## 📝 Document Summaries

### AZURE-DEPLOY-SUMMARY.md
**Length**: 5 min read  
**Purpose**: Answer "What do I need to deploy?"  
**Content**: Prerequisites, cost, quick commands, FAQs

### QUICKSTART.md
**Length**: 10 min read  
**Purpose**: Get deployed in 10 minutes  
**Content**: Two deployment paths, full commands, troubleshooting

### DEPLOYMENT.md
**Length**: 20 min read  
**Purpose**: Comprehensive deployment guide  
**Content**: Detailed steps, monitoring, scaling, advanced config

### README.md
**Length**: 10 min read  
**Purpose**: Project overview and features  
**Content**: What is it, how to play, quick start, architecture

### LOCAL-TESTING.md
**Length**: 5 min read  
**Purpose**: Run game locally  
**Content**: Setup, testing, development tips

### SECURITY.md
**Length**: 10 min read  
**Purpose**: Security information  
**Content**: Vulnerabilities fixed, best practices, recommendations

### CONTRIBUTING.md
**Length**: 10 min read  
**Purpose**: How to contribute  
**Content**: Code style, adding cards, feature requests

---

## 🎉 Ready to Start?

1. **Have Azure subscription?** → [AZURE-DEPLOY-SUMMARY.md](AZURE-DEPLOY-SUMMARY.md)
2. **Want to test locally first?** → [LOCAL-TESTING.md](LOCAL-TESTING.md)
3. **Want to understand the project?** → [README.md](README.md)

**Most users start with**: [AZURE-DEPLOY-SUMMARY.md](AZURE-DEPLOY-SUMMARY.md) 🚀


