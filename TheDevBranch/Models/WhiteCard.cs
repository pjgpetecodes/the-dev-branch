namespace TheDevBranch.Models;

public class WhiteCard
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Text { get; set; } = string.Empty;
}
