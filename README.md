# Developers Against Humanity Online

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

### Prerequisites

- .NET 8.0 SDK
- Azure subscription (for deployment)

### Running Locally

1. Clone the repository:
```bash
git clone https://github.com/pjgpetecodes/developers-against-humanity-online.git
cd developers-against-humanity-online
```

2. Navigate to the application directory:
```bash
cd DevelopersAgainstHumanity
```

3. Run the application:
```bash
dotnet run
```

4. Open your browser and navigate to `https://localhost:5001` (or the port shown in console)

5. To test multiplayer, open multiple browser windows or tabs

## ☁️ Azure Deployment

### Deploy Infrastructure

1. Login to Azure CLI:
```bash
az login
```

2. Create a resource group:
```bash
az group create --name dev-against-humanity-rg --location eastus
```

3. Deploy the Bicep template:
```bash
az deployment group create \
  --resource-group dev-against-humanity-rg \
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

## 🏗️ Architecture

- **ASP.NET Core 8.0**: Web framework
- **SignalR**: Real-time bidirectional communication
- **Razor Pages**: Server-side rendered pages
- **Azure App Service**: Hosting platform
- **Application Insights**: Monitoring and diagnostics

## 📁 Project Structure

```
.
├── DevelopersAgainstHumanity/
│   ├── Hubs/                  # SignalR hubs
│   ├── Models/                # Game models (Player, Card, GameRoom)
│   ├── Services/              # Business logic (CardService, GameService)
│   ├── Pages/                 # Razor pages
│   └── wwwroot/               # Static files (CSS, JS)
├── infrastructure/            # Azure Bicep templates
├── .github/workflows/         # CI/CD pipelines
├── black-cards.txt           # Black card prompts
└── white-cards.txt           # White card responses
```

## 🎨 Customizing Cards

You can customize the game by editing the card files:

- `black-cards.txt`: Question/prompt cards (one per line)
- `white-cards.txt`: Answer cards (one per line)

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

