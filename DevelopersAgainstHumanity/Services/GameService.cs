using DevelopersAgainstHumanity.Models;

namespace DevelopersAgainstHumanity.Services;

public interface IGameService
{
    GameRoom CreateRoom(string roomId, int? totalRounds = null);
    GameRoom? GetRoom(string roomId);
    Player AddPlayer(string roomId, string connectionId, string playerName);
    void RemovePlayer(string roomId, string connectionId);
    void StartGame(string roomId);
    void SubmitCards(string roomId, string playerId, List<string> cardIds);
    void SelectWinner(string roomId, string winnerId);
    void NextRound(string roomId);
    void TouchRoom(string roomId);
    int ClearRooms();
    IEnumerable<GameRoom> GetAllRooms();
    bool DeleteRoom(string roomId);
    IEnumerable<string> GetAllRoomIds();
}

public class GameService : IGameService
{
    private readonly Dictionary<string, GameRoom> _rooms = new();
    private readonly ICardService _cardService;
    private readonly ILogger<GameService> _logger;
    private readonly Random _random = new();

    public GameService(ICardService cardService, ILogger<GameService> logger)
    {
        _cardService = cardService;
        _logger = logger;
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

    public GameRoom CreateRoom(string roomId, int? totalRounds = null)
    {
        roomId = NormalizeRoomId(roomId);

        if (_rooms.ContainsKey(roomId))
        {
            return _rooms[roomId];
        }

        var room = new GameRoom { RoomId = roomId, CreatorConnectionId = null };
        if (totalRounds.HasValue && totalRounds.Value > 0)
        {
            room.TotalRounds = totalRounds.Value;
        }

        MarkActivity(room);

        _rooms[roomId] = room;
        _logger.LogInformation($"Created room {roomId} with {room.TotalRounds} rounds");
        return room;
    }

    public GameRoom? GetRoom(string roomId)
    {
        return _rooms.GetValueOrDefault(roomId);
    }

    public Player AddPlayer(string roomId, string connectionId, string playerName)
    {
        var room = GetRoom(roomId);
        if (room == null)
            throw new InvalidOperationException($"Room {roomId} not found");

        if (room.Players.Count >= room.MaxPlayers)
            throw new InvalidOperationException("Room is full");

        if (room.Players.Any(p => p.ConnectionId == connectionId))
            throw new InvalidOperationException("Player already in room");

        // First player to join is the room creator
        if (room.CreatorConnectionId == null)
        {
            room.CreatorConnectionId = connectionId;
        }

        var player = new Player
        {
            ConnectionId = connectionId,
            Name = playerName,
            Score = 0
        };

        room.Players.Add(player);
        MarkActivity(room);
        _logger.LogInformation($"Player {playerName} joined room {roomId}");

        return player;
    }

    public void RemovePlayer(string roomId, string connectionId)
    {
        var room = GetRoom(roomId);
        if (room == null) return;

        var player = room.Players.FirstOrDefault(p => p.ConnectionId == connectionId);
        if (player != null)
        {
            room.Players.Remove(player);
            MarkActivity(room);
            _logger.LogInformation($"Player {player.Name} left room {roomId}");

            // If no players left, remove room
            if (room.Players.Count == 0)
            {
                _rooms.Remove(roomId);
                _logger.LogInformation($"Room {roomId} removed (no players)");
            }
            // If card czar left, reassign
            else if (player.IsCardCzar && room.State == GameState.Playing)
            {
                AssignCardCzar(room);
            }
        }
    }

    public void StartGame(string roomId)
    {
        var room = GetRoom(roomId);
        if (room == null)
            throw new InvalidOperationException($"Room {roomId} not found");

        if (room.Players.Count < 3)
            throw new InvalidOperationException("Need at least 3 players to start");

        room.State = GameState.Playing;
        room.CurrentCzarIndex = 0;
        room.CurrentRound = 1;
        
        // Deal cards to all players
        foreach (var player in room.Players)
        {
            player.Score = 0;
            player.SelectedCardIds.Clear();
            DealCards(player, 10);
        }

        StartRound(room);
        MarkActivity(room);
        _logger.LogInformation($"Game started in room {roomId}");
    }

    private void StartRound(GameRoom room)
    {
        room.SubmittedCards.Clear();
        room.WinningPlayerId = null;
        room.State = GameState.Playing;

        // Assign card czar
        AssignCardCzar(room);

        // Draw black card
        room.CurrentBlackCard = _cardService.GetRandomBlackCard();
    }

    private void AssignCardCzar(GameRoom room)
    {
        // Reset all players
        foreach (var player in room.Players)
        {
            player.IsCardCzar = false;
        }

        // Assign to current index
        if (room.Players.Count > 0)
        {
            room.Players[room.CurrentCzarIndex % room.Players.Count].IsCardCzar = true;
        }
    }

    private void DealCards(Player player, int count)
    {
        for (int i = 0; i < count; i++)
        {
            player.Hand.Add(_cardService.GetRandomWhiteCard());
        }
    }

    public void SubmitCards(string roomId, string playerId, List<string> cardIds)
    {
        var room = GetRoom(roomId);
        if (room == null)
            throw new InvalidOperationException($"Room {roomId} not found");

        if (room.State != GameState.Playing)
            throw new InvalidOperationException("Not in playing state");

        var player = room.Players.FirstOrDefault(p => p.ConnectionId == playerId);
        if (player == null)
            throw new InvalidOperationException("Player not found");

        if (player.IsCardCzar)
            throw new InvalidOperationException("Card czar cannot submit cards");

        if (room.CurrentBlackCard == null)
            throw new InvalidOperationException("No black card selected");

        if (cardIds == null || cardIds.Count == 0)
            throw new InvalidOperationException("No cards selected");

        if (cardIds.Count != room.CurrentBlackCard.PickCount)
            throw new InvalidOperationException($"Must submit exactly {room.CurrentBlackCard.PickCount} card(s)");

        if (cardIds.Distinct().Count() != cardIds.Count)
            throw new InvalidOperationException("Cannot submit duplicate cards");

        foreach (var cardId in cardIds)
        {
            var card = player.Hand.FirstOrDefault(c => c.Id == cardId);
            if (card == null)
                throw new InvalidOperationException("Card not in hand");
        }

        room.SubmittedCards[playerId] = new List<string>(cardIds);
        player.SelectedCardIds = new List<string>(cardIds);

        // Check if all players (except czar) have submitted
        var nonCzarPlayers = room.Players.Where(p => !p.IsCardCzar).ToList();
        if (room.SubmittedCards.Count == nonCzarPlayers.Count)
        {
            room.State = GameState.Judging;
        }

        MarkActivity(room);
    }

    public void SelectWinner(string roomId, string winnerId)
    {
        var room = GetRoom(roomId);
        if (room == null)
            throw new InvalidOperationException($"Room {roomId} not found");

        if (room.State != GameState.Judging)
            throw new InvalidOperationException("Not in judging state");

        var winner = room.Players.FirstOrDefault(p => p.ConnectionId == winnerId);
        if (winner == null)
            throw new InvalidOperationException("Winner not found");

        winner.Score++;
        room.WinningPlayerId = winnerId;
        room.State = GameState.RoundOver;

        // Check for game winner
        if (winner.Score >= room.WinningScore)
        {
            room.State = GameState.GameOver;
        }

        MarkActivity(room);

        _logger.LogInformation($"Player {winner.Name} won the round in room {roomId}");
    }

    public void NextRound(string roomId)
    {
        var room = GetRoom(roomId);
        if (room == null)
            throw new InvalidOperationException($"Room {roomId} not found");

        if (room.State != GameState.RoundOver)
            throw new InvalidOperationException("Not in round over state");

        // Remove played cards from hands
        foreach (var player in room.Players.Where(p => !p.IsCardCzar))
        {
            if (player.SelectedCardIds.Count > 0)
            {
                foreach (var selectedCardId in player.SelectedCardIds)
                {
                    var card = player.Hand.FirstOrDefault(c => c.Id == selectedCardId);
                    if (card != null)
                    {
                        player.Hand.Remove(card);
                    }
                }
                // Deal replacement cards
                DealCards(player, player.SelectedCardIds.Count);
                player.SelectedCardIds.Clear();
            }
        }

        // Check if game should end
        if (room.CurrentRound >= room.TotalRounds)
        {
            var topScore = room.Players.Max(p => p.Score);
            var topPlayers = room.Players.Where(p => p.Score == topScore).ToList();

            // If there's a tie, play a decider round
            if (topPlayers.Count > 1)
            {
                room.IsDeciderRound = true;
                room.CurrentRound++;
                room.CurrentCzarIndex++;
                StartRound(room);
                return;
            }

            // No tie, game is over
            room.WinningPlayerId = topPlayers[0].ConnectionId;
            room.State = GameState.GameOver;
            MarkActivity(room);
            return;
        }

        // Next card czar
        room.CurrentCzarIndex++;
        room.CurrentRound++;
        room.IsDeciderRound = false;
        
        StartRound(room);
        MarkActivity(room);
    }

    public void TouchRoom(string roomId)
    {
        var room = GetRoom(roomId);
        if (room != null)
        {
            MarkActivity(room);
        }
    }

    public int ClearRooms()
    {
        var cleared = _rooms.Count;
        _rooms.Clear();
        _logger.LogWarning("All rooms cleared by admin. Cleared {RoomCount} room(s).", cleared);
        return cleared;
    }

    public IEnumerable<string> GetAllRoomIds()
    {
        return _rooms.Keys.ToList();
    }

    public IEnumerable<GameRoom> GetAllRooms()
    {
        return _rooms.Values.ToList();
    }

    public bool DeleteRoom(string roomId)
    {
        roomId = NormalizeRoomId(roomId);
        if (_rooms.Remove(roomId))
        {
            _logger.LogWarning("Room {RoomId} deleted by admin.", roomId);
            return true;
        }
        return false;
    }

    private static void MarkActivity(GameRoom room)
    {
        room.LastActivityUtc = DateTime.UtcNow;
        room.LastIdleWarningUtc = null;
    }
}
