using System.Text.Json;
using System.Text.RegularExpressions;
using TheDevBranch.Models;

namespace TheDevBranch.Services;

public interface ICardService
{
    IReadOnlyList<DeckMetadata> GetAvailableDecks();
    bool DeckExists(string deckId);
    string GetDefaultDeckId();
    DeckMetadata GetDeckMetadata(string deckId);
    List<BlackCard> GetBlackCards();
    List<WhiteCard> GetWhiteCards();
    List<BlackCard> GetBlackCards(string deckId);
    List<WhiteCard> GetWhiteCards(string deckId);
    string GetRandomTakedown();
    string GetRandomTakedown(string deckId);
    void SetBlackCards(List<BlackCard> cards);
    void SetWhiteCards(List<WhiteCard> cards);
}

public class CardService : ICardService
{
    private sealed class DeckContent
    {
        public required DeckMetadata Metadata { get; init; }
        public List<BlackCard> BlackCards { get; } = new();
        public List<WhiteCard> WhiteCards { get; } = new();
        public List<string> Takedowns { get; } = new();
    }

    private readonly Dictionary<string, DeckContent> _decks = new(StringComparer.OrdinalIgnoreCase);
    private readonly ILogger<CardService> _logger;
    private string _defaultDeckId = "default";

    public CardService(IWebHostEnvironment environment, ILogger<CardService> logger)
    {
        _logger = logger;
        LoadDecks(environment.ContentRootPath);
    }

    public IReadOnlyList<DeckMetadata> GetAvailableDecks()
    {
        return _decks.Values
            .Select(d => new DeckMetadata
            {
                Id = d.Metadata.Id,
                Name = d.Metadata.Name,
                Description = d.Metadata.Description,
                Theme = d.Metadata.Theme,
                IsDefault = string.Equals(d.Metadata.Id, _defaultDeckId, StringComparison.OrdinalIgnoreCase)
            })
            .OrderByDescending(d => d.IsDefault)
            .ThenBy(d => d.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public bool DeckExists(string deckId)
    {
        return !string.IsNullOrWhiteSpace(deckId) && _decks.ContainsKey(deckId);
    }

    public string GetDefaultDeckId() => _defaultDeckId;

    public DeckMetadata GetDeckMetadata(string deckId)
    {
        var deck = GetDeckOrDefault(deckId);
        return new DeckMetadata
        {
            Id = deck.Metadata.Id,
            Name = deck.Metadata.Name,
            Description = deck.Metadata.Description,
            Theme = deck.Metadata.Theme,
            IsDefault = string.Equals(deck.Metadata.Id, _defaultDeckId, StringComparison.OrdinalIgnoreCase)
        };
    }

    public List<BlackCard> GetBlackCards() => GetBlackCards(_defaultDeckId);

    public List<WhiteCard> GetWhiteCards() => GetWhiteCards(_defaultDeckId);

    public List<BlackCard> GetBlackCards(string deckId)
    {
        return GetDeckOrDefault(deckId).BlackCards
            .Select(c => new BlackCard
            {
                Text = c.Text,
                PickCount = c.PickCount
            })
            .ToList();
    }

    public List<WhiteCard> GetWhiteCards(string deckId)
    {
        return GetDeckOrDefault(deckId).WhiteCards
            .Select(c => new WhiteCard
            {
                Text = c.Text
            })
            .ToList();
    }

    public string GetRandomTakedown() => GetRandomTakedown(_defaultDeckId);

    public string GetRandomTakedown(string deckId)
    {
        var takedowns = GetDeckOrDefault(deckId).Takedowns;
        if (takedowns.Count == 0)
        {
            return "Your code is... let's just say it's unique.";
        }

        return takedowns[Random.Shared.Next(takedowns.Count)];
    }

    public void SetBlackCards(List<BlackCard> cards)
    {
        var defaultDeck = GetDeckOrDefault(_defaultDeckId);
        defaultDeck.BlackCards.Clear();
        defaultDeck.BlackCards.AddRange(cards
            .Where(c => !string.IsNullOrWhiteSpace(c.Text))
            .Select(c => new BlackCard
            {
                Text = c.Text.Trim(),
                PickCount = c.PickCount > 0 ? c.PickCount : 1
            }));

        _logger.LogInformation("Updated {CardCount} black cards in deck {DeckId}", defaultDeck.BlackCards.Count, _defaultDeckId);
    }

    public void SetWhiteCards(List<WhiteCard> cards)
    {
        var defaultDeck = GetDeckOrDefault(_defaultDeckId);
        defaultDeck.WhiteCards.Clear();
        defaultDeck.WhiteCards.AddRange(cards
            .Where(c => !string.IsNullOrWhiteSpace(c.Text))
            .Select(c => new WhiteCard
            {
                Text = c.Text.Trim()
            }));

        _logger.LogInformation("Updated {CardCount} white cards in deck {DeckId}", defaultDeck.WhiteCards.Count, _defaultDeckId);
    }

    private DeckContent GetDeckOrDefault(string? deckId)
    {
        if (!string.IsNullOrWhiteSpace(deckId) && _decks.TryGetValue(deckId, out var explicitDeck))
        {
            return explicitDeck;
        }

        if (_decks.TryGetValue(_defaultDeckId, out var defaultDeck))
        {
            return defaultDeck;
        }

        throw new InvalidOperationException("No card decks loaded");
    }

    private void LoadDecks(string contentRootPath)
    {
        try
        {
            var manifestPath = Path.Combine(contentRootPath, "Data", "decks.json");
            if (File.Exists(manifestPath))
            {
                LoadDecksFromManifest(contentRootPath, manifestPath);
            }
            else
            {
                LoadLegacyDefaultDeck(contentRootPath);
            }

            if (_decks.Count == 0)
            {
                throw new InvalidOperationException("No decks were loaded.");
            }

            if (!_decks.ContainsKey(_defaultDeckId))
            {
                _defaultDeckId = _decks.Keys.First();
            }

            _logger.LogInformation("Loaded {DeckCount} deck(s). Default deck: {DefaultDeckId}", _decks.Count, _defaultDeckId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading decks");
            throw;
        }
    }

    private void LoadDecksFromManifest(string contentRootPath, string manifestPath)
    {
        var manifestJson = File.ReadAllText(manifestPath);
        var decks = JsonSerializer.Deserialize<List<DeckMetadata>>(manifestJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? new List<DeckMetadata>();

        foreach (var deck in decks.Where(d => !string.IsNullOrWhiteSpace(d.Id)))
        {
            var normalizedDeck = new DeckMetadata
            {
                Id = deck.Id.Trim(),
                Name = string.IsNullOrWhiteSpace(deck.Name) ? deck.Id.Trim() : deck.Name.Trim(),
                Description = deck.Description?.Trim() ?? string.Empty,
                Theme = deck.Theme?.Trim() ?? string.Empty,
                IsDefault = deck.IsDefault
            };

            var deckPath = Path.Combine(contentRootPath, "Data", "decks", normalizedDeck.Id);
            if (!Directory.Exists(deckPath))
            {
                _logger.LogWarning("Deck folder not found for {DeckId}: {DeckPath}", normalizedDeck.Id, deckPath);
                continue;
            }

            var content = new DeckContent { Metadata = normalizedDeck };
            LoadDeckFiles(deckPath, content);
            if (content.BlackCards.Count == 0 || content.WhiteCards.Count == 0)
            {
                _logger.LogWarning("Skipping deck {DeckId} because it has no black or white cards", normalizedDeck.Id);
                continue;
            }

            _decks[normalizedDeck.Id] = content;
            if (normalizedDeck.IsDefault)
            {
                _defaultDeckId = normalizedDeck.Id;
            }
        }
    }

    private void LoadLegacyDefaultDeck(string contentRootPath)
    {
        var metadata = new DeckMetadata
        {
            Id = "default",
            Name = "Default Dev Deck",
            Description = "The original deck.",
            Theme = "General Dev",
            IsDefault = true
        };

        var content = new DeckContent { Metadata = metadata };
        LoadDeckFiles(Path.Combine(contentRootPath, "Data"), content);
        if (content.BlackCards.Count == 0 || content.WhiteCards.Count == 0)
        {
            throw new InvalidOperationException("Legacy card files are missing or empty.");
        }

        _decks[metadata.Id] = content;
        _defaultDeckId = metadata.Id;
    }

    private void LoadDeckFiles(string basePath, DeckContent content)
    {
        var blackCardsPath = Path.Combine(basePath, "black-cards.txt");
        if (File.Exists(blackCardsPath))
        {
            foreach (var line in File.ReadAllLines(blackCardsPath))
            {
                if (string.IsNullOrWhiteSpace(line))
                {
                    continue;
                }

                var trimmed = line.Trim();
                var pickCount = Regex.Matches(trimmed, "_+").Count;
                content.BlackCards.Add(new BlackCard
                {
                    Text = trimmed,
                    PickCount = pickCount > 0 ? pickCount : 1
                });
            }
        }

        var whiteCardsPath = Path.Combine(basePath, "white-cards.txt");
        if (File.Exists(whiteCardsPath))
        {
            foreach (var line in File.ReadAllLines(whiteCardsPath))
            {
                if (string.IsNullOrWhiteSpace(line))
                {
                    continue;
                }

                content.WhiteCards.Add(new WhiteCard
                {
                    Text = line.Trim()
                });
            }
        }

        var takedownsPath = Path.Combine(basePath, "takedowns.txt");
        if (File.Exists(takedownsPath))
        {
            foreach (var line in File.ReadAllLines(takedownsPath))
            {
                if (string.IsNullOrWhiteSpace(line))
                {
                    continue;
                }

                content.Takedowns.Add(line.Trim());
            }
        }

        _logger.LogInformation(
            "Loaded deck {DeckId}: {BlackCount} black, {WhiteCount} white, {TakedownCount} takedowns",
            content.Metadata.Id,
            content.BlackCards.Count,
            content.WhiteCards.Count,
            content.Takedowns.Count);
    }
}

