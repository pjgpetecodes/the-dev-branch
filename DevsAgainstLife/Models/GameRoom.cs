namespace DevsAgainstLife.Models;

public class GameRoom
{
    public string RoomId { get; set; } = string.Empty;
    public string? CreatorConnectionId { get; set; }
    public List<Player> Players { get; set; } = new();
    public DateTime LastActivityUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastIdleWarningUtc { get; set; }
    public BlackCard? CurrentBlackCard { get; set; }
    public Dictionary<string, List<string>> SubmittedCards { get; set; } = new(); // PlayerId -> CardIds
    public GameState State { get; set; } = GameState.Lobby;
    public int CurrentCzarIndex { get; set; }
    public string? WinningPlayerId { get; set; }
    public int MaxPlayers { get; set; } = 10;
    public int WinningScore { get; set; } = 7;
    public int TotalRounds { get; set; } = 7;
    public int CurrentRound { get; set; } = 0;
    public bool IsDeciderRound { get; set; } = false;
    public HashSet<string> RemovedPlayerConnectionIds { get; set; } = new(); // Players who left mid-game and cannot rejoin
    public string? PlayerWhoLeftName { get; set; } // Name of current player who left mid-game (for waiting state)
}

public enum GameState
{
    Lobby,
    Playing,
    Judging,
    RoundOver,
    GameOver
}
