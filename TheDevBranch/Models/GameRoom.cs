using System.Text.Json.Serialization;

namespace TheDevBranch.Models;

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
    public bool IsWaitingForPlayerReturn { get; set; } = false; // Whether room is locked waiting for specific player
    public string DeckId { get; set; } = "default";
    public string DeckName { get; set; } = "Default Dev Deck";
    public string DeckTheme { get; set; } = "General";
    public bool BurnModeEnabled { get; set; } = false;

    [JsonIgnore]
    public List<WhiteCard> WhiteDrawPile { get; set; } = new();

    [JsonIgnore]
    public List<WhiteCard> WhiteDiscardPile { get; set; } = new();

    [JsonIgnore]
    public Dictionary<string, string> BurnModeLastNameByContext { get; set; } = new();

    [JsonIgnore]
    public Dictionary<string, MediaCaptureConsentUpdate> CaptureConsentByConnectionId { get; set; } = new();

    [JsonIgnore]
    public List<MediaCaptureGalleryItem> RoundCaptures { get; set; } = new();

    [JsonIgnore]
    public int RoundCaptureTotalBytes { get; set; }
}

public enum GameState
{
    Lobby,
    Playing,
    Judging,
    RoundOver,
    GameOver
}
