namespace TheDevBranch.Models;

public class BlackCard
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Text { get; set; } = string.Empty;
    public int PickCount { get; set; }
}

