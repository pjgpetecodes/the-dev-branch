# The Dev Branch

An online multiplayer card game inspired by Cards Against Humanity, but tailored for developers! This web-based game supports 10+ players in real-time using ASP.NET Core and SignalR.

## 🎮 Features

- **Real-time Multiplayer**: Built with SignalR for instant communication between players
- **Developer-Themed Cards**: Hundreds of cards with jokes, references, and situations familiar to developers
- **Graphical Interface**: Modern, responsive UI with card animations and visual feedback
- **Scalable Architecture**: Runs on Azure App Service, ready for multiple concurrent games
- **Azure Deployment**: Infrastructure as Code with Bicep templates
- **CI/CD Pipeline**: Automated deployment with GitHub Actions

## 🎯 How to Play

1. **Create or Join a Room**: Enter your name and a room ID
2. **Wait for Players**: Minimum 3 players required to start
3. **Card Czar**: Each round, one player is the Card Czar (indicated by 👑)
4. **Play Cards**: All players except the Czar select a white card from their hand that best fits the black card
5. **Judge**: The Card Czar picks the funniest/best combination
6. **Score**: The winner gets a point, and the role of Card Czar rotates
7. **Win**: First player to 7 points wins the game!

## 🚀 Getting Started

### Running Locally

**Prerequisites**: .NET 8.0 SDK

1. Clone the repository:
```bash
git clone https://github.com/pjgpetecodes/the-dev-branch.git
cd the-dev-branch
```

2. Navigate to the application directory:
```bash
cd TheDevBranch
```

3. Run the application:
```bash
dotnet run
```

4. Open your browser and navigate to `https://localhost:5001` (or the port shown in console)

5. To test multiplayer, open multiple browser windows or tabs

### Local Testing with Demo Mode

**Demo Mode** lets you test the entire game flow with simulated AI players without needing multiple real players.

#### Enabling Demo Mode

Demo mode is automatically activated when you start a room with the name "Pete" (case-insensitive). Simply:

1. Run the app: `dotnet run`
2. Enter your name as **"Pete"** when prompted
3. Click "Create Room" → Demo mode activates automatically
4. You'll see a blue **"🎮 Demo Player Switcher"** panel on the right

#### Using Demo Mode

The demo panel allows you to:

**Add Test Players**:
- Click the "+ Add Player" buttons to add simulated players (up to 10 total)
- Each test player is assigned a diverse, randomly-selected name
- Test players automatically play cards and participate in rounds

**Switch Player Perspectives**:
- Click any player name in the switcher to control that player
- You become that player for all actions (submitting cards, selecting winners)
- The active player is highlighted in yellow
- Useful for testing different game states and flows

**Collapse the Panel**:
- Click the panel header to minimize/maximize it
- Minimized state is remembered between page refreshes

#### Demo Mode Features

- ✅ Add up to 10 simulated players to any room
- ✅ Switch perspectives between players instantly
- ✅ Test card selection and submission flows
- ✅ Test the Card Czar's winner selection process
- ✅ Observe real-time game state updates
- ✅ Play through complete game rounds
- ✅ All game logic works identically to multiplayer mode

#### Example Demo Session

1. Start app, create room as "Pete" → Demo mode activates
2. Add 3 test players (Carlos, Maya, Diego)
3. Start the game
4. Switch to Carlos → Select a card → Submit
5. Switch to Maya → Select a card → Submit
6. Switch to Diego → Select a card → Submit
7. Switch back to Pete → See all submitted cards
8. If Pete is Card Czar, click a card group to select the winner
9. Next round begins automatically

#### Why Demo Mode is Useful

- **Solo Testing**: Test complex game flows without needing multiple people
- **Debugging**: Quickly reproduce specific game states
- **Feature Validation**: Verify new card types, game rules, and UI changes
- **Performance Testing**: Load test with multiple players on one machine



**Have an Azure subscription?** → Start here: **[What you need to deploy](AZURE-DEPLOY-SUMMARY.md)**

**TL;DR**: 
- Prerequisites: Azure subscription + Azure CLI
- Deploy: 3 commands, ~5 minutes
- Cost: ~$13/month or free with Azure credits

**Step-by-step guide**: [QUICKSTART.md](QUICKSTART.md)  
**Detailed reference**: [DEPLOYMENT.md](DEPLOYMENT.md)

## ☁️ Azure Deployment Details

### Deploy Infrastructure

1. Login to Azure CLI:
```bash
az login
```

2. Create a resource group:
```bash
az group create --name the-dev-branch-rg --location eastus
```

3. Deploy the Bicep template:
```bash
az deployment group create \
  --resource-group the-dev-branch-rg \
  --template-file infrastructure/main.bicep
```

### Configure GitHub Actions

1. In Azure Portal, go to your Web App
2. Download the Publish Profile (under Deployment Center)
3. In your GitHub repository:
   - Go to Settings > Secrets and variables > Actions
   - Create a new secret named `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Paste the contents of the publish profile

4. Update the `AZURE_WEBAPP_NAME` in `.github/workflows/azure-deploy.yml` with your web app name

5. Push to main branch to trigger deployment:
```bash
git push origin main
```

## 🐳 Docker Deployment (Alternative)

You can also deploy using Docker:

```bash
# Build the image
docker build -t the-dev-branch .

# Run locally
docker run -p 8080:80 the-dev-branch

# Push to container registry
docker tag the-dev-branch your-registry/the-dev-branch
docker push your-registry/the-dev-branch
```

## 🏗️ Architecture

- **ASP.NET Core 8.0**: Web framework
- **SignalR**: Real-time bidirectional communication
- **Razor Pages**: Server-side rendered pages
- **Azure App Service**: Hosting platform
- **Application Insights**: Monitoring and diagnostics

## 📁 Project Structure

```
.
├── TheDevBranch/
│   ├── Hubs/                  # SignalR hubs
│   ├── Models/                # Game models (Player, Card, GameRoom)
│   ├── Services/              # Business logic (CardService, GameService)
│   ├── Pages/                 # Razor pages
│   └── wwwroot/               # Static files (CSS, JS)
│   └── Data/                  # Card data files (black, white, takedowns)
├── infrastructure/            # Azure Bicep templates
└── .github/workflows/         # CI/CD pipelines
```

## 🎨 Customizing Cards

You can customize the game by editing the card files:

- `TheDevBranch/Data/black-cards.txt`: Question/prompt cards (one per line)
- `TheDevBranch/Data/white-cards.txt`: Answer cards (one per line)
- `TheDevBranch/Data/takedowns.txt`: Snarky takedown messages (one per line)

The game automatically loads these files on startup.

## 🔧 Configuration

### App Settings

Configure in `appsettings.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
```

### Game Settings

You can modify game settings in `Models/GameRoom.cs`:

- `MaxPlayers`: Maximum players per room (default: 10)
- `WinningScore`: Points needed to win (default: 7)

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎉 Acknowledgments

- Inspired by Cards Against Humanity
- Built with love for the developer community



