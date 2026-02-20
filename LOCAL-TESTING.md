# Local Testing Notes

## SignalR CDN in Development

The application uses a CDN-hosted version of SignalR for the client library. In restricted network environments, you may need to:

### Option 1: Use a different CDN
The Index.cshtml currently uses:
```html
<script src="https://cdn.jsdelivr.net/npm/@microsoft/signalr@7.0.0/dist/browser/signalr.min.js"></script>
```

Alternative CDNs to try:
- Microsoft CDN: `https://cdn.aspnetcore.com/signalr/7.0.0/signalr.min.js`
- unpkg: `https://unpkg.com/@microsoft/signalr@7.0.0/dist/browser/signalr.min.js`

### Option 2: Install SignalR locally
Use LibMan to install SignalR locally:

```bash
cd TheDevBranch
dotnet tool install -g Microsoft.Web.LibraryManager.Cli
libman install @microsoft/signalr@7.0.0 -p unpkg -d wwwroot/lib/signalr
```

Then update Index.cshtml to use the local path:
```html
<script src="~/lib/signalr/dist/browser/signalr.min.js"></script>
```

### Option 3: Use npm package
Add SignalR as an npm package if you have Node.js installed:

```bash
npm install @microsoft/signalr
```

Then reference it from node_modules or copy to wwwroot.

## Testing with Multiple Players

To test the multiplayer functionality locally:

1. Start the application:
```bash
cd TheDevBranch
dotnet run
```

2. Open multiple browser windows/tabs to `https://localhost:5001`

3. In each window:
   - Enter a different player name
   - Use the same Room ID (e.g., "test123")
   - Click "Join Room"

4. In one window, click "Start Game" (requires at least 3 players)

5. Test the game flow:
   - Each player (except Card Czar) selects a white card
   - Card Czar selects the winner
   - Next round begins automatically

## Known Issues

### Browser Console Errors
If you see "signalR is not defined" errors, the CDN is blocked. Use one of the options above.

### WebSocket Connection Failed
Ensure your firewall allows WebSocket connections on the port being used.

### Cards Not Loading
Verify that `black-cards.txt` and `white-cards.txt` exist in the repository root directory (one level up from TheDevBranch folder).

## Production Deployment

These issues are specific to local development environments. When deployed to Azure:
- CDN access is typically available
- WebSockets are enabled by default in App Service
- All features work as expected


