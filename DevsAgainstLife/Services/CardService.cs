using DevsAgainstLife.Models;

namespace DevsAgainstLife.Services;

public interface ICardService
{
    List<BlackCard> GetBlackCards();
    List<WhiteCard> GetWhiteCards();
    string GetRandomTakedown();
    BlackCard GetRandomBlackCard();
    WhiteCard GetRandomWhiteCard();
    void SetBlackCards(List<BlackCard> cards);
    void SetWhiteCards(List<WhiteCard> cards);
}

public class CardService : ICardService
{
    private readonly List<BlackCard> _blackCards = new();
    private readonly List<WhiteCard> _whiteCards = new();
    private readonly List<string> _takedowns = new();
    private readonly Random _random = new();
    private readonly ILogger<CardService> _logger;

    public CardService(IWebHostEnvironment environment, ILogger<CardService> logger)
    {
        _logger = logger;
        LoadCards(environment.ContentRootPath);
    }

    private void LoadCards(string contentRootPath)
    {
        try
        {
            // Load black cards
            var blackCardsPath = Path.Combine(contentRootPath, "Data", "black-cards.txt");
            if (File.Exists(blackCardsPath))
            {
                var lines = File.ReadAllLines(blackCardsPath);
                foreach (var line in lines)
                {
                    if (!string.IsNullOrWhiteSpace(line))
                    {
                        // Count the number of blanks by finding groups of underscores
                        // Each blank is represented by one or more consecutive underscores
                        var pickCount = System.Text.RegularExpressions.Regex.Matches(line, "_+").Count;
                        _blackCards.Add(new BlackCard
                        {
                            Text = line.Trim(),
                            PickCount = pickCount > 0 ? pickCount : 1
                        });
                    }
                }
                _logger.LogInformation($"Loaded {_blackCards.Count} black cards");
            }
            else
            {
                _logger.LogWarning($"Black cards file not found at {blackCardsPath}");
            }

            // Load white cards
            var whiteCardsPath = Path.Combine(contentRootPath, "Data", "white-cards.txt");
            if (File.Exists(whiteCardsPath))
            {
                var lines = File.ReadAllLines(whiteCardsPath);
                foreach (var line in lines)
                {
                    if (!string.IsNullOrWhiteSpace(line))
                    {
                        _whiteCards.Add(new WhiteCard
                        {
                            Text = line.Trim()
                        });
                    }
                }
                _logger.LogInformation($"Loaded {_whiteCards.Count} white cards");
            }
            else
            {
                _logger.LogWarning($"White cards file not found at {whiteCardsPath}");
            }

            // Load takedowns
            var takedownsPath = Path.Combine(contentRootPath, "Data", "takedowns.txt");
            if (File.Exists(takedownsPath))
            {
                var lines = File.ReadAllLines(takedownsPath);
                foreach (var line in lines)
                {
                    if (!string.IsNullOrWhiteSpace(line))
                    {
                        _takedowns.Add(line.Trim());
                    }
                }
                _logger.LogInformation($"Loaded {_takedowns.Count} takedowns");
            }
            else
            {
                _logger.LogWarning($"Takedowns file not found at {takedownsPath}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading cards");
        }
    }

    public List<BlackCard> GetBlackCards() => _blackCards;
    
    public List<WhiteCard> GetWhiteCards() => _whiteCards;

    public BlackCard GetRandomBlackCard()
    {
        if (_blackCards.Count == 0)
            throw new InvalidOperationException("No black cards available");
        
        return _blackCards[_random.Next(_blackCards.Count)];
    }

    public WhiteCard GetRandomWhiteCard()
    {
        if (_whiteCards.Count == 0)
            throw new InvalidOperationException("No white cards available");
        
        return _whiteCards[_random.Next(_whiteCards.Count)];
    }

    public string GetRandomTakedown()
    {
        if (_takedowns.Count == 0)
            return "Your code is... let's just say it's unique.";
        
        return _takedowns[_random.Next(_takedowns.Count)];
    }

    public void SetBlackCards(List<BlackCard> cards)
    {
        _blackCards.Clear();
        _blackCards.AddRange(cards);
        _logger.LogInformation($"Updated {_blackCards.Count} black cards");
    }

    public void SetWhiteCards(List<WhiteCard> cards)
    {
        _whiteCards.Clear();
        _whiteCards.AddRange(cards);
        _logger.LogInformation($"Updated {_whiteCards.Count} white cards");
    }
}
