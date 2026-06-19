namespace TheDevBranch.Models;

public class DeckMetadata
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Theme { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}

