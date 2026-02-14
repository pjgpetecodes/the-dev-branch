using Microsoft.AspNetCore.SignalR;
using DevsAgainstLife.Services;
using DevsAgainstLife.Models;

namespace DevsAgainstLife.Hubs;

public class GameHub : Hub
{
    private readonly IGameService _gameService;
    private readonly ICardService _cardService;
    private readonly ILogger<GameHub> _logger;
    private readonly Random _random = new();

    public GameHub(IGameService gameService, ICardService cardService, ILogger<GameHub> logger)
    {
        _gameService = gameService;
        _cardService = cardService;
        _logger = logger;
    }

    public async Task CreateRoom(string playerName)
    {
        _logger.LogInformation($"[CreateRoom] *** METHOD ENTRY *** PlayerName: {playerName}");
        try
        {
            _logger.LogInformation($"[CreateRoom] Start");
            
            playerName = playerName?.Trim() ?? string.Empty;
            _logger.LogInformation($"[CreateRoom] After trim: '{playerName}'");
            
            if (string.IsNullOrWhiteSpace(playerName))
            {
                _logger.LogWarning("[CreateRoom] Player name is empty");
                throw new InvalidOperationException("Player name is required");
            }

            // Generate a 5-character alphanumeric code
            string roomId = GenerateRoomId();
            _logger.LogInformation($"[CreateRoom] Generated room ID: {roomId}");
            
            roomId = NormalizeRoomId(roomId);
            _logger.LogInformation($"[CreateRoom] Normalized room ID: {roomId}");
            
            var room = _gameService.CreateRoom(roomId);
            _logger.LogInformation($"[CreateRoom] Room created in service");
            
            // Add the creator as the first player in the room
            var player = _gameService.AddPlayer(roomId, Context.ConnectionId, playerName);
            _logger.LogInformation($"[CreateRoom] Player added - Name: {player.Name}");
            
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            _logger.LogInformation($"[CreateRoom] Added to group {roomId}");
            
            await Clients.Caller.SendAsync("RoomCreated", roomId);
            _logger.LogInformation($"[CreateRoom] Sent RoomCreated event");
            
            await Clients.Group(roomId).SendAsync("PlayerJoined", playerName, 1, new[] { playerName });
            _logger.LogInformation($"[CreateRoom] Sent PlayerJoined event");
            
            _logger.LogInformation($"[CreateRoom] SUCCESS - Room {roomId} created by {playerName}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"[CreateRoom] *** EXCEPTION *** {ex.GetType().Name}: {ex.Message}");
            _logger.LogError(ex, $"[CreateRoom] Stack trace: {ex.StackTrace}");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task UpdateRounds(string roomId, int totalRounds)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            var room = _gameService.GetRoom(roomId);
            if (room == null)
                throw new InvalidOperationException("Room not found");

            if (room.CreatorConnectionId != Context.ConnectionId)
                throw new InvalidOperationException("Only room creator can set rounds");

            if (room.State != GameState.Lobby)
                throw new InvalidOperationException("Cannot change rounds after game started");

            if (totalRounds < 1)
                throw new InvalidOperationException("Must have at least 1 round");

            room.TotalRounds = totalRounds;
            _gameService.TouchRoom(roomId);
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            _logger.LogInformation($"Rounds updated to {totalRounds} in room {roomId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating rounds");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task JoinRoom(string roomId, string playerName)
    {
        try
        {
            // Special demo mode - create a room for manual test player management
            if (roomId?.ToUpper() == "D3M0X")
            {
                _logger.LogInformation($"[JoinRoom] DEMO mode detected for player {playerName}");
                
                playerName = playerName?.Trim() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(playerName))
                    throw new InvalidOperationException("Player name is required");

                // Create a unique room code for this demo session
                string demoRoomId = GenerateRoomId();
                demoRoomId = NormalizeRoomId(demoRoomId);
                
                var demoRoom = _gameService.CreateRoom(demoRoomId);
                demoRoom.CreatorConnectionId = Context.ConnectionId; // Set the joining player as room creator
                
                // Add the main player
                var mainPlayer = _gameService.AddPlayer(demoRoomId, Context.ConnectionId, playerName);
                await Groups.AddToGroupAsync(Context.ConnectionId, demoRoomId);
                
                // Send the room ID back to the joining player with demo mode flag
                await Clients.Caller.SendAsync("RoomCreated", demoRoomId);
                await Clients.Caller.SendAsync("DemoModeEnabled");
                _logger.LogInformation($"[JoinRoom] DEMO room created: {demoRoomId} in test mode");
                return;
            }

            roomId = NormalizeRoomId(roomId);
            playerName = playerName?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(playerName))
                throw new InvalidOperationException("Player name is required");

            var room = _gameService.GetRoom(roomId);
            if (room == null)
            {
                _gameService.CreateRoom(roomId);
                room = _gameService.GetRoom(roomId);
            }

            if (room == null)
                throw new InvalidOperationException("Failed to create or get room");

            // Check if this is a valid rejoin (player who left mid-game trying to return)
            bool isRejoin = room.State != GameState.Lobby 
                         && room.IsWaitingForPlayerReturn 
                         && playerName == room.PlayerWhoLeftName;

            // Game already in progress - only allow if player is the one who left and is rejoining
            if (room.State != GameState.Lobby && !isRejoin)
            {
                throw new InvalidOperationException("Cannot join a game that has already started.");
            }

            // Check if this player was removed from the game
            if (room.RemovedPlayerConnectionIds.Contains(Context.ConnectionId))
                throw new InvalidOperationException("You were removed from this game and cannot rejoin");

            var player = _gameService.AddPlayer(roomId, Context.ConnectionId, playerName, isRejoin);
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            
            // If player rejoins while waiting for them, clear the waiting state and notify others
            if (isRejoin)
            {
                _logger.LogInformation($"Player {playerName} is rejoining! Sending PlayerRejoinedMidGame event to room {roomId}");
                room.PlayerWhoLeftName = null;
                room.IsWaitingForPlayerReturn = false;
                await Clients.Group(roomId).SendAsync("PlayerRejoinedMidGame", player.Name);
            }
            
            // Notify all players in the room
            var playerNames = room.Players.Select(p => p.Name).ToList();
            await Clients.Group(roomId).SendAsync("PlayerJoined", player.Name, room.Players.Count, playerNames);
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            _logger.LogInformation($"Player {playerName} joined room {roomId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error joining room");
            throw new HubException(ex.Message);
        }
    }

    public async Task StartGame(string roomId)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            _gameService.StartGame(roomId);
            var room = _gameService.GetRoom(roomId);
            
            await Clients.Group(roomId).SendAsync("GameStarted");
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            // Send individual hands to each player
            if (room != null)
            {
                foreach (var player in room.Players)
                {
                    await Clients.Client(player.ConnectionId).SendAsync("HandUpdated", player.Hand);
                }
            }
            
            _logger.LogInformation($"Game started in room {roomId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting game");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task SubmitCards(string roomId, List<string> cardIds, string? onBehalfOfConnectionId = null)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            
            // In demo mode, allow submitting on behalf of a test player
            string effectiveConnectionId = Context.ConnectionId;
            if (!string.IsNullOrEmpty(onBehalfOfConnectionId) && onBehalfOfConnectionId.StartsWith("test-"))
            {
                effectiveConnectionId = onBehalfOfConnectionId;
            }
            
            _gameService.SubmitCards(roomId, effectiveConnectionId, cardIds);
            var room = _gameService.GetRoom(roomId);
            
            await Clients.Group(roomId).SendAsync("CardSubmitted", effectiveConnectionId);
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            _logger.LogInformation($"Card submitted in room {roomId} by {effectiveConnectionId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting card");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task SelectWinner(string roomId, string winnerId, string? onBehalfOfConnectionId = null)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            
            // In demo mode, allow selecting winner on behalf of a test player (if they're the card czar)
            string effectiveConnectionId = Context.ConnectionId;
            if (!string.IsNullOrEmpty(onBehalfOfConnectionId) && onBehalfOfConnectionId.StartsWith("test-"))
            {
                effectiveConnectionId = onBehalfOfConnectionId;
            }
            
            _gameService.SelectWinner(roomId, winnerId);
            var room = _gameService.GetRoom(roomId);
            
            await Clients.Group(roomId).SendAsync("WinnerSelected", winnerId);
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            _logger.LogInformation($"Winner selected in room {roomId} by {effectiveConnectionId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error selecting winner");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task NextRound(string roomId)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            _gameService.NextRound(roomId);
            var room = _gameService.GetRoom(roomId);
            
            await Clients.Group(roomId).SendAsync("RoundStarted");
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            // Send updated hands to each player
            if (room != null)
            {
                foreach (var player in room.Players)
                {
                    await Clients.Client(player.ConnectionId).SendAsync("HandUpdated", player.Hand);
                }
            }
            
            _logger.LogInformation($"Next round started in room {roomId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting next round");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task LeaveRoom(string roomId)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            var room = _gameService.GetRoom(roomId);
            if (room != null)
            {
                var player = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (player != null)
                {
                    // Check if leaving mid-game
                    bool leftMidGame = room.State != GameState.Lobby;
                    
                    if (leftMidGame)
                    {
                        // Mark player as left - wait for room creator's decision
                        room.PlayerWhoLeftName = player.Name;
                        room.IsWaitingForPlayerReturn = true; // Lock room to new players
                        
                        // Don't remove player from room - keep their hand and state for rejoin
                        // Just remove them from the SignalR group
                        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
                        
                        // Check if enough players remain
                        int remainingPlayers = room.Players.Count;
                        bool hasEnoughPlayers = remainingPlayers >= 3; // MIN_PLAYERS_TO_START
                        
                        if (hasEnoughPlayers)
                        {
                            // Notify all players that someone left mid-game
                            await Clients.Group(roomId).SendAsync("PlayerLeftMidGame", 
                                player.Name, 
                                Context.ConnectionId, 
                                room.CreatorConnectionId);
                        }
                        else
                        {
                            // Not enough players - different flow
                            await Clients.Group(roomId).SendAsync("NotEnoughPlayersAfterLeave", 
                                player.Name, 
                                remainingPlayers, 
                                room.CreatorConnectionId);
                        }
                    }
                    else
                    {
                        // Normal lobby leave
                        _gameService.RemovePlayer(roomId, Context.ConnectionId);
                        var playerNames = room.Players.Where(p => p.ConnectionId != Context.ConnectionId).Select(p => p.Name).ToList();
                        var newPlayerCount = room.Players.Count - 1;
                        
                        await Clients.Group(roomId).SendAsync("PlayerLeft", player.Name, newPlayerCount, playerNames);
                        await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
                        
                        // Check if this was a demo room (all remaining players are test players)
                        if (room.Players.All(p => p.ConnectionId.StartsWith("test-")))
                        {
                            _logger.LogInformation($"Deleting demo room {roomId} - no real players remaining");
                            _gameService.DeleteRoom(roomId);
                        }
                    }
                    
                    // Remove from group
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
                    
                    _logger.LogInformation($"Player {player.Name} left room {roomId}, mid-game: {leftMidGame}");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error leaving room");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task WaitForPlayerReturn(string roomId)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            var room = _gameService.GetRoom(roomId);
            if (room?.CreatorConnectionId != Context.ConnectionId)
                throw new InvalidOperationException("Only room creator can perform this action");
            
            // Keep waiting - don't do anything, player may rejoin
            await Clients.Group(roomId).SendAsync("WaitingForPlayerReturn");
            _logger.LogInformation($"Room {roomId} waiting for player to return");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error waiting for player return");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task WaitForMorePlayers(string roomId)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            var room = _gameService.GetRoom(roomId);
            if (room?.CreatorConnectionId != Context.ConnectionId)
                throw new InvalidOperationException("Only room creator can perform this action");
            
            // Reset game to lobby state
            room.State = GameState.Lobby;
            room.PlayerWhoLeftName = null;
            room.IsWaitingForPlayerReturn = false; // Clear room lock so new players can join
            room.SubmittedCards.Clear();
            
            _gameService.TouchRoom(roomId);
            
            // Notify all players to return to lobby
            await Clients.Group(roomId).SendAsync("ReturningToLobby");
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            _logger.LogInformation($"Room {roomId} returning to lobby to wait for more players");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error waiting for more players");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task QuitGame(string roomId)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            var room = _gameService.GetRoom(roomId);
            if (room?.CreatorConnectionId != Context.ConnectionId)
                throw new InvalidOperationException("Only room creator can perform this action");
            
            // Notify all players that game is ending
            await Clients.Group(roomId).SendAsync("GameQuit", "Room creator ended the game.");
            
            // Remove all players
            var playerNames = room.Players.Select(p => p.Name).ToList();
            foreach (var player in room.Players)
            {
                foreach (var connectionId in playerNames)
                {
                    await Groups.RemoveFromGroupAsync(connectionId, roomId);
                }
            }
            
            // Delete the room
            _gameService.DeleteRoom(roomId);
            
            _logger.LogInformation($"Game in room {roomId} quit by creator. Removed players: {string.Join(", ", playerNames)}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error quitting game");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task RestartRound(string roomId)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            var room = _gameService.GetRoom(roomId);
            if (room?.CreatorConnectionId != Context.ConnectionId)
                throw new InvalidOperationException("Only room creator can restart round");
            
            if (room.PlayerWhoLeftName != null)
            {
                // Mark as removed by name - cannot rejoin
                var leftPlayer = room.Players.FirstOrDefault(p => p.Name == room.PlayerWhoLeftName);
                if (leftPlayer != null)
                {
                    room.RemovedPlayerConnectionIds.Add(leftPlayer.ConnectionId);
                    _gameService.RemovePlayer(roomId, leftPlayer.ConnectionId);
                }
            }
            
            // Clear submitted cards but keep hands
            room.SubmittedCards.Clear();
            
            // Choose random new card czar from remaining players
            if (room.Players.Count > 0)
            {
                room.CurrentCzarIndex = _random.Next(room.Players.Count);
            }
            
            room.State = GameState.Playing;
            room.PlayerWhoLeftName = null;
            room.IsWaitingForPlayerReturn = false; // Clear room lock
            
            _gameService.TouchRoom(roomId);
            
            await Clients.Group(roomId).SendAsync("RoundRestarted");
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            _logger.LogInformation($"Round restarted in room {roomId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restarting round");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task RestartGame(string roomId)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            var room = _gameService.GetRoom(roomId);
            if (room?.CreatorConnectionId != Context.ConnectionId)
                throw new InvalidOperationException("Only room creator can restart game");
            
            if (room.PlayerWhoLeftName != null)
            {
                // Mark player as removed by name - cannot rejoin
                var leftPlayer = room.Players.FirstOrDefault(p => p.Name == room.PlayerWhoLeftName);
                if (leftPlayer != null)
                {
                    room.RemovedPlayerConnectionIds.Add(leftPlayer.ConnectionId);
                    _gameService.RemovePlayer(roomId, leftPlayer.ConnectionId);
                }
            }
            
            // Reset game
            room.State = GameState.Playing;
            room.CurrentRound = 1;
            room.CurrentCzarIndex = 0;
            room.SubmittedCards.Clear();
            room.WinningPlayerId = null;
            room.PlayerWhoLeftName = null;
            room.IsWaitingForPlayerReturn = false; // Clear room lock
            
            // Clear hands for all remaining players
            foreach (var player in room.Players)
            {
                player.Hand.Clear();
            }
            
            // Start game will deal new hands
            _gameService.StartGame(roomId);
            room = _gameService.GetRoom(roomId); // Get updated room after StartGame
            
            _gameService.TouchRoom(roomId);
            
            await Clients.Group(roomId).SendAsync("GameRestarted");
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            // Send hands to each player
            if (room != null)
            {
                foreach (var player in room.Players)
                {
                    await Clients.Client(player.ConnectionId).SendAsync("HandUpdated", player.Hand);
                }
            }
            
            _logger.LogInformation($"Game restarted in room {roomId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restarting game");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        try
        {
            _logger.LogInformation($"Player {Context.ConnectionId} disconnected");
            
            // Find which room this player was in
            var allRooms = _gameService.GetAllRooms();
            foreach (var room in allRooms)
            {
                var player = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (player != null)
                {
                    _logger.LogInformation($"Found player {player.Name} in room {room.RoomId}, game state: {room.State}");
                    
                    // Check if they left mid-game
                    bool leftMidGame = room.State != GameState.Lobby;
                    
                    if (leftMidGame)
                    {
                        // Mark player as left - wait for room creator's decision
                        room.PlayerWhoLeftName = player.Name;
                        room.IsWaitingForPlayerReturn = true; // Lock room to new players
                        
                        // Don't remove player from room - keep their hand and state for rejoin
                        // The player object stays in the room with their current connection ID
                        
                        // Check if enough players remain
                        int remainingPlayers = room.Players.Count;
                        bool hasEnoughPlayers = remainingPlayers >= 3; // MIN_PLAYERS_TO_START
                        
                        if (hasEnoughPlayers)
                        {
                            // Notify all players that someone left mid-game (with action buttons)
                            await Clients.Group(room.RoomId).SendAsync("PlayerLeftMidGame", 
                                player.Name, 
                                Context.ConnectionId, 
                                room.CreatorConnectionId);
                            
                            _logger.LogInformation($"Player {player.Name} left mid-game in room {room.RoomId}. Remaining players: {remainingPlayers}");
                        }
                        else
                        {
                            // Not enough players - different flow
                            await Clients.Group(room.RoomId).SendAsync("NotEnoughPlayersAfterLeave", 
                                player.Name, 
                                remainingPlayers, 
                                room.CreatorConnectionId);
                            
                            _logger.LogInformation($"Player {player.Name} left mid-game in room {room.RoomId}. Not enough players left ({remainingPlayers}/3)");
                        }
                    }
                    else
                    {
                        // Normal lobby leave - remove them
                        _gameService.RemovePlayer(room.RoomId, Context.ConnectionId);
                        var playerNames = room.Players.Where(p => p.ConnectionId != Context.ConnectionId).Select(p => p.Name).ToList();
                        var newPlayerCount = room.Players.Count - 1;
                        
                        await Clients.Group(room.RoomId).SendAsync("PlayerLeft", player.Name, newPlayerCount, playerNames);
                        await Clients.Group(room.RoomId).SendAsync("GameStateUpdated", room);
                        
                        _logger.LogInformation($"Player {player.Name} left lobby room {room.RoomId}");
                    }
                    
                    break; // Player found and handled, no need to check other rooms
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling disconnect");
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    private static string NormalizeRoomId(string roomId)
    {
        if (string.IsNullOrWhiteSpace(roomId))
            throw new InvalidOperationException("Room code is required");

        var trimmed = roomId.Trim().ToUpper();
        
        // Validate: 5 characters, alphanumeric only
        if (trimmed.Length != 5 || !System.Text.RegularExpressions.Regex.IsMatch(trimmed, "^[A-Z0-9]{5}$"))
            throw new InvalidOperationException($"Room code must be exactly 5 alphanumeric characters. Got: '{trimmed}' (length: {trimmed.Length})");

        return trimmed;
    }

    private string GenerateRoomId()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var result = new char[5];
        for (int i = 0; i < 5; i++)
        {
            result[i] = chars[_random.Next(chars.Length)];
        }
        var generatedId = new string(result);
        _logger.LogInformation($"[GenerateRoomId] Generated: {generatedId}");
        return generatedId;
    }

    public async Task NotifyRoomDeleted(string roomId)
    {
        await Clients.Group(roomId).SendAsync("RoomDeleted", "This room has been deleted by an admin.");
    }

    public async Task ExtendRoomIdle(string roomId)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            _gameService.TouchRoom(roomId);
            await Clients.Group(roomId).SendAsync("RoomIdleExtended", "Room activity extended.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extending room idle timer");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task SendTakedown(string roomId, string targetPlayerId)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            var room = _gameService.GetRoom(roomId);
            if (room == null)
                throw new InvalidOperationException("Room not found");

            var targetPlayer = room.Players.FirstOrDefault(p => p.ConnectionId == targetPlayerId);
            if (targetPlayer == null)
                throw new InvalidOperationException("Target player not found");

            var senderPlayer = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (senderPlayer == null)
                throw new InvalidOperationException("Sender not found");

            // Get a random takedown from the card service
            var takedownMessage = _cardService.GetRandomTakedown();

            // Send the takedown only to the target player
            await Clients.Client(targetPlayerId).SendAsync("ReceiveTakedown", senderPlayer.Name, takedownMessage);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending takedown");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task AddTestPlayer(string roomId, string testPlayerName)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            testPlayerName = testPlayerName?.Trim() ?? string.Empty;
            
            if (string.IsNullOrWhiteSpace(testPlayerName))
                throw new InvalidOperationException("Test player name is required");

            // Create a fake connection ID for the test player
            string fakeConnectionId = $"test-{Guid.NewGuid()}";
            
            // Add the test player to the room
            var testPlayer = _gameService.AddPlayer(roomId, fakeConnectionId, testPlayerName);
            var room = _gameService.GetRoom(roomId);
            
            // Notify all players in the room
            await Clients.Group(roomId).SendAsync("PlayerJoined", testPlayerName, room.Players.Count, room.Players.Select(p => p.Name).ToArray());
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            _logger.LogInformation($"Test player '{testPlayerName}' added to room {roomId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding test player");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task RemoveTestPlayer(string roomId, string testPlayerName)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            testPlayerName = testPlayerName?.Trim() ?? string.Empty;
            
            if (string.IsNullOrWhiteSpace(testPlayerName))
                throw new InvalidOperationException("Test player name is required");

            var room = _gameService.GetRoom(roomId);
            if (room == null)
                throw new InvalidOperationException("Room not found");

            // Find and remove the test player
            var testPlayer = room.Players.FirstOrDefault(p => p.Name == testPlayerName && p.ConnectionId.StartsWith("test-"));
            if (testPlayer == null)
                throw new InvalidOperationException($"Test player '{testPlayerName}' not found");

            _gameService.RemovePlayer(roomId, testPlayer.ConnectionId);
            var playerNames = room.Players.Where(p => p.ConnectionId != testPlayer.ConnectionId).Select(p => p.Name).ToList();
            
            // Notify all players in the room
            await Clients.Group(roomId).SendAsync("PlayerLeft", testPlayerName, room.Players.Count - 1, playerNames);
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            _logger.LogInformation($"Test player '{testPlayerName}' removed from room {roomId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing test player");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }
}


