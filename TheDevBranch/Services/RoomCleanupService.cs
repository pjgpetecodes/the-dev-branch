using TheDevBranch.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace TheDevBranch.Services;

public class RoomCleanupService : BackgroundService
{
    private readonly IGameService _gameService;
    private readonly IHubContext<GameHub> _hubContext;
    private readonly ILogger<RoomCleanupService> _logger;
    private readonly TimeSpan _idleTimeout;
    private readonly TimeSpan _warningThreshold;
    private readonly TimeSpan _cleanupInterval;

    public RoomCleanupService(
        IGameService gameService,
        IHubContext<GameHub> hubContext,
        IConfiguration configuration,
        ILogger<RoomCleanupService> logger)
    {
        _gameService = gameService;
        _hubContext = hubContext;
        _logger = logger;

        var idleMinutes = configuration.GetValue("RoomIdleTimeoutMinutes", 60);
        var warningMinutes = configuration.GetValue("RoomIdleWarningMinutes", Math.Max(1, idleMinutes - 1));
        var intervalSeconds = configuration.GetValue("RoomCleanupIntervalSeconds", 60);

        _idleTimeout = TimeSpan.FromMinutes(Math.Max(1, idleMinutes));
        var clampedWarningMinutes = Math.Min(Math.Max(1, warningMinutes), Math.Max(1, idleMinutes - 1));
        _warningThreshold = TimeSpan.FromMinutes(clampedWarningMinutes);
        _cleanupInterval = TimeSpan.FromSeconds(Math.Max(10, intervalSeconds));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupIdleRoomsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while cleaning up idle rooms");
            }

            try
            {
                await Task.Delay(_cleanupInterval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }

    private async Task CleanupIdleRoomsAsync(CancellationToken stoppingToken)
    {
        var now = DateTime.UtcNow;
        var rooms = _gameService.GetAllRooms().ToList();
        if (rooms.Count == 0)
        {
            return;
        }

        foreach (var room in rooms)
        {
            if (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            var idleFor = now - room.LastActivityUtc;

            if (idleFor >= _idleTimeout)
            {
                await _hubContext.Clients.Group(room.RoomId)
                    .SendAsync("RoomDeleted", "Room closed due to inactivity.", stoppingToken);

                if (_gameService.DeleteRoom(room.RoomId))
                {
                    _logger.LogInformation(
                        "Room {RoomId} removed due to inactivity (last activity {LastActivityUtc:O}).",
                        room.RoomId,
                        room.LastActivityUtc);
                }

                continue;
            }

            if (idleFor >= _warningThreshold && room.LastIdleWarningUtc == null)
            {
                var remaining = _idleTimeout - idleFor;
                var remainingSeconds = Math.Max(0, (int)Math.Ceiling(remaining.TotalSeconds));

                await _hubContext.Clients.Group(room.RoomId)
                    .SendAsync("RoomIdleWarning", remainingSeconds, stoppingToken);

                room.LastIdleWarningUtc = now;
                _logger.LogInformation(
                    "Room {RoomId} idle warning sent with {SecondsRemaining}s remaining.",
                    room.RoomId,
                    remainingSeconds);
            }
        }
    }
}
