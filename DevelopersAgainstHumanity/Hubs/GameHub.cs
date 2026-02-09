using Microsoft.AspNetCore.SignalR;
using DevelopersAgainstHumanity.Services;
using DevelopersAgainstHumanity.Models;

namespace DevelopersAgainstHumanity.Hubs;

public class GameHub : Hub
{
    private readonly IGameService _gameService;
    private readonly ILogger<GameHub> _logger;

    public GameHub(IGameService gameService, ILogger<GameHub> logger)
    {
        _gameService = gameService;
        _logger = logger;
    }

    public async Task CreateRoom(string roomId, int? totalRounds = null)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            _gameService.CreateRoom(roomId, totalRounds);
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            await Clients.Caller.SendAsync("RoomCreated", roomId);
            _logger.LogInformation($"Room {roomId} created by {Context.ConnectionId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating room");
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

            var player = _gameService.AddPlayer(roomId, Context.ConnectionId, playerName);
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            
            // Notify all players in the room
            var playerNames = room.Players.Select(p => p.Name).ToList();
            await Clients.Group(roomId).SendAsync("PlayerJoined", player.Name, room.Players.Count, playerNames);
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            _logger.LogInformation($"Player {playerName} joined room {roomId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error joining room");
            await Clients.Caller.SendAsync("Error", ex.Message);
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

    public async Task SubmitCards(string roomId, List<string> cardIds)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            _gameService.SubmitCards(roomId, Context.ConnectionId, cardIds);
            var room = _gameService.GetRoom(roomId);
            
            await Clients.Group(roomId).SendAsync("CardSubmitted", Context.ConnectionId);
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            _logger.LogInformation($"Card submitted in room {roomId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting card");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public async Task SelectWinner(string roomId, string winnerId)
    {
        try
        {
            roomId = NormalizeRoomId(roomId);
            _gameService.SelectWinner(roomId, winnerId);
            var room = _gameService.GetRoom(roomId);
            
            await Clients.Group(roomId).SendAsync("WinnerSelected", winnerId);
            await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
            
            _logger.LogInformation($"Winner selected in room {roomId}");
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
                    _gameService.RemovePlayer(roomId, Context.ConnectionId);
                    
                    // Notify remaining players
                    var playerNames = room.Players.Where(p => p.ConnectionId != Context.ConnectionId).Select(p => p.Name).ToList();
                    var newPlayerCount = room.Players.Count - 1;
                    
                    await Clients.Group(roomId).SendAsync("PlayerLeft", player.Name, newPlayerCount, playerNames);
                    await Clients.Group(roomId).SendAsync("GameStateUpdated", room);
                    
                    // Remove from group
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
                    
                    _logger.LogInformation($"Player {player.Name} left room {roomId}");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error leaving room");
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        try
        {
            _logger.LogInformation($"Player {Context.ConnectionId} disconnected");
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
            throw new InvalidOperationException("Room ID is required");

        var trimmed = roomId.Trim();
        if (int.TryParse(trimmed, out var numeric) && numeric < 0)
            throw new InvalidOperationException("Room ID cannot be a negative number");

        return trimmed;
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
}
