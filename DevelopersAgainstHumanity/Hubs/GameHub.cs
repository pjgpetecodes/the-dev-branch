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

    public async Task CreateRoom(string roomId)
    {
        try
        {
            _gameService.CreateRoom(roomId);
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

    public async Task JoinRoom(string roomId, string playerName)
    {
        try
        {
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

    public async Task SubmitCard(string roomId, string cardId)
    {
        try
        {
            _gameService.SubmitCard(roomId, Context.ConnectionId, cardId);
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

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        try
        {
            // Find and remove player from all rooms
            // This is a simplified implementation - in production you'd track room membership
            _logger.LogInformation($"Player {Context.ConnectionId} disconnected");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling disconnect");
        }
        
        await base.OnDisconnectedAsync(exception);
    }
}
