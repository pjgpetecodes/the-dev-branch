namespace DevelopersAgainstHumanity.Models;

public class Player
{
    public string ConnectionId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Score { get; set; }
    public List<WhiteCard> Hand { get; set; } = new();
    public bool IsCardCzar { get; set; }
    public List<string> SelectedCardIds { get; set; } = new();
}
