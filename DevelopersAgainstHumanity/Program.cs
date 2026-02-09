using DevelopersAgainstHumanity.Hubs;
using DevelopersAgainstHumanity.Services;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddSignalR();

// Register application services
builder.Services.AddSingleton<ICardService, CardService>();
builder.Services.AddSingleton<IGameService, GameService>();
builder.Services.AddHostedService<RoomCleanupService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapRazorPages();
app.MapHub<GameHub>("/gameHub");

app.MapPost("/admin/rooms/clear", async (HttpContext context, IGameService gameService, IHubContext<GameHub> hubContext, IConfiguration configuration, ILogger<Program> logger) =>
{
    var adminKey = configuration["AdminKey"];
    var providedKey = context.Request.Query["key"].ToString();

    if (!string.IsNullOrWhiteSpace(adminKey) && adminKey != providedKey)
    {
        return Results.Unauthorized();
    }

    // Get all room IDs before clearing
    var roomIds = gameService.GetAllRoomIds().ToList();
    logger.LogInformation($"Clearing {roomIds.Count} room(s)");
    
    // Notify players in all rooms before clearing
    foreach (var roomId in roomIds)
    {
        logger.LogInformation($"Sending RoomDeleted notification to room: {roomId}");
        await hubContext.Clients.Group(roomId).SendAsync("RoomDeleted", "All rooms have been cleared by an admin.");
    }
    
    // Give a small delay to ensure messages are sent before clearing
    await Task.Delay(100);
    
    var cleared = gameService.ClearRooms();
    logger.LogInformation($"Cleared {cleared} room(s)");
    return Results.Ok(new { cleared });
});

app.MapGet("/admin/rooms", (HttpContext context, IGameService gameService, IConfiguration configuration) =>
{
    var adminKey = configuration["AdminKey"];
    var providedKey = context.Request.Query["key"].ToString();

    if (!string.IsNullOrWhiteSpace(adminKey) && adminKey != providedKey)
    {
        return Results.Unauthorized();
    }

    var rooms = gameService.GetAllRooms();
    var roomList = rooms.Select(r => new
    {
        roomId = r.RoomId,
        playerCount = r.Players.Count,
        state = r.State.ToString(),
        currentRound = r.CurrentRound,
        totalRounds = r.TotalRounds,
        players = r.Players.Select(p => new { name = p.Name, score = p.Score })
    }).ToList();

    return Results.Ok(new { rooms = roomList });
});

app.MapPost("/admin/rooms/{roomId}/delete", async (string roomId, HttpContext context, IGameService gameService, IHubContext<GameHub> hubContext, IConfiguration configuration) =>
{
    var adminKey = configuration["AdminKey"];
    var providedKey = context.Request.Query["key"].ToString();

    if (!string.IsNullOrWhiteSpace(adminKey) && adminKey != providedKey)
    {
        return Results.Unauthorized();
    }

    // Notify players in the room before deleting
    await hubContext.Clients.Group(roomId).SendAsync("RoomDeleted", "This room has been deleted by an admin.");
        // Give a small delay to ensure message is sent before deleting
    await Task.Delay(100);
        var deleted = gameService.DeleteRoom(roomId);
    return deleted ? Results.Ok(new { deleted = true }) : Results.NotFound();
});

app.Run();
