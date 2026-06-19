# Copilot Instructions for The Dev Branch

This repository is an online, multiplayer, developer-themed card game built with ASP.NET Core Razor Pages and SignalR.

## Core Architecture

- `TheDevBranch/Program.cs`: app setup, SignalR hub mapping, admin API endpoints.
- `TheDevBranch/Hubs/GameHub.cs`: real-time client/server orchestration.
- `TheDevBranch/Services/GameService.cs`: canonical game rules and room state transitions.
- `TheDevBranch/Services/CardService.cs`: card loading and random card selection.
- `TheDevBranch/Models/*`: game entities and enums (`GameRoom`, `Player`, `BlackCard`, `WhiteCard`).
- `TheDevBranch/wwwroot/js/*`: browser-side real-time/game UI behavior.

## Implementation Rules

1. Keep game rules in `GameService` (not duplicated in JS or hub methods).
2. When changing hub event payloads, update both:
   - `GameHub.cs` event sends/handlers
   - matching `wwwroot/js` listeners and render/update logic
3. Preserve room code normalization/validation conventions (5-char uppercase alphanumeric).
4. Respect game state transitions (`Lobby -> Playing -> Judging -> RoundOver -> GameOver`) and fail fast on invalid transitions.
5. Do not edit vendored files in `wwwroot/lib`.
6. Preserve demo mode behavior used for local testing workflows.
7. Preserve admin endpoint key checks (`AdminKey`) for room/card management operations.

## Cards and Content

- Card source files live in `TheDevBranch/Data/`:
  - `black-cards.txt`
  - `white-cards.txt`
  - `takedowns.txt`
- Keep one card per line.
- For black cards, underscores indicate blanks and influence pick-count behavior.
- Keep tone developer-themed and multiplayer-safe for team environments.

## Style and Safety

- Follow existing C# and JavaScript patterns in this repository before introducing new abstractions.
- Prefer small, focused methods and explicit validation errors over silent fallbacks.
- Keep logging consistent with existing service/hub patterns.
- Avoid broad catches that hide runtime issues.

## Validation

- Build from `TheDevBranch/`:
  - `dotnet build`
- If behavior changes in real-time gameplay, run locally and smoke-test key flows:
  - create/join room
  - start game with 3+ players
  - submit cards
  - card czar selects winner
  - next round/game end behavior
