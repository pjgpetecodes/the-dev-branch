namespace DevelopersAgainstHumanity.Models;

public class GameRoom
{
    public string RoomId { get; set; } = string.Empty;
    public List<Player> Players { get; set; } = new();
    public BlackCard? CurrentBlackCard { get; set; }
    public Dictionary<string, List<string>> SubmittedCards { get; set; } = new(); // PlayerId -> CardIds
    public GameState State { get; set; } = GameState.Lobby;
    public int CurrentCzarIndex { get; set; }
    public string? WinningPlayerId { get; set; }
    public int MaxPlayers { get; set; } = 10;
    public int WinningScore { get; set; } = 7;
}

public enum GameState
{
    Lobby,
    Playing,
    Judging,
    RoundOver,
    GameOver
}
