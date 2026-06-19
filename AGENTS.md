# Agents for The Dev Branch

This file defines practical agent roles for contributing to this repository.

## 1. Gameplay Rules Agent

**Owns:** game lifecycle and correctness of round logic.

**Primary files**
- `TheDevBranch/Services/GameService.cs`
- `TheDevBranch/Models/GameRoom.cs`
- `TheDevBranch/Models/Player.cs`

**Use when**
- changing win conditions, round flow, card czar rotation, score handling, reconnect behavior, or room constraints.

**Guardrails**
- Keep state transitions explicit and valid.
- Enforce invariants with clear exceptions.
- Avoid moving game-rule logic into hub/UI layers.

## 2. Realtime/SignalR Agent

**Owns:** client-server event contracts and connection lifecycle behavior.

**Primary files**
- `TheDevBranch/Hubs/GameHub.cs`
- `TheDevBranch/wwwroot/js/signalr-events.js`
- `TheDevBranch/wwwroot/js/game-state.js`

**Use when**
- adding/modifying hub methods, SignalR messages, reconnect flows, or lobby/game synchronization.

**Guardrails**
- Keep payload shapes stable unless all clients are updated together.
- Update server emitters and client listeners in the same change.
- Avoid introducing race-prone state mutations in multiple layers.

## 3. Frontend UX Agent

**Owns:** player-facing UI behavior and interaction flow.

**Primary files**
- `TheDevBranch/Pages/Index.cshtml`
- `TheDevBranch/wwwroot/js/ui-game.js`
- `TheDevBranch/wwwroot/js/ui-lobby.js`
- `TheDevBranch/wwwroot/js/ui-modals.js`
- `TheDevBranch/wwwroot/css/site.css`

**Use when**
- improving game/lobby interactions, card selection UX, modals, responsiveness, and accessibility.

**Guardrails**
- Keep UI state derived from canonical server state.
- Maintain responsive layout and clear action feedback.
- Preserve existing gameplay flow unless intentionally changing it.

## 4. Cards & Content Agent

**Owns:** deck quality and card-content consistency.

**Primary files**
- `TheDevBranch/Data/black-cards.txt`
- `TheDevBranch/Data/white-cards.txt`
- `TheDevBranch/Data/takedowns.txt`

**Use when**
- adding/editing cards and takedown messages.

**Guardrails**
- Keep one entry per line.
- Maintain developer-theme tone.
- Avoid duplicate or near-duplicate card text.
- Keep content suitable for team play and community contributions.

## 5. Ops & Deployment Agent

**Owns:** hosting, deployment, and runtime ops readiness.

**Primary files**
- `infrastructure/main.bicep`
- `.github/workflows/azure-deploy.yml`
- `DEPLOYMENT.md`
- `QUICKSTART.md`

**Use when**
- changing Azure resources, deployment workflow, app settings, or deployment docs.

**Guardrails**
- Keep infra and docs aligned in the same PR.
- Preserve WebSocket/SignalR compatibility in hosting settings.
- Prefer smallest viable infra changes and clear rollback paths.

## Shared Instructions for All Agents

1. Follow `.github/copilot-instructions.md`.
2. Do not edit generated or vendored assets under `wwwroot/lib`.
3. Keep changes scoped and consistent across server, hub, and client when contracts change.
4. Build from `TheDevBranch/` with `dotnet build` before finalizing.
5. If behavior changes in multiplayer flow, smoke-test with multiple browser tabs or demo mode.
