// Demo Mode Functions

function getRandomUnusedName() {
    const unused = testPlayerNamePool.filter(name => !usedTestPlayerNames.has(name));
    if (unused.length === 0) return null;
    return unused[Math.floor(Math.random() * unused.length)];
}

function getAvailableSlots() {
    const currentPlayerCount = gameState ? gameState.players.length : 1;
    const remainingSlots = MAX_ROOM_PLAYERS - currentPlayerCount;
    return Math.min(MAX_BUTTON_SLOTS, remainingSlots);
}

function initializeTestPlayerNames(count) {
    availableTestPlayerNames = [];
    for (let i = 0; i < count; i++) {
        const name = getRandomUnusedName();
        if (name) {
            availableTestPlayerNames.push(name);
            usedTestPlayerNames.add(name);
        }
    }
}

function createTestPlayerButton(name, container) {
    const btn = document.createElement('button');
    btn.dataset.playerName = name;
    btn.style.cssText = `
        padding: 10px 16px; 
        font-size: 0.9em;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.2s;
    `;
    btn.textContent = `+ ${name}`;
    btn.onmouseover = () => btn.style.backgroundColor = '#218838';
    btn.onmouseout = () => btn.style.backgroundColor = '#28a745';
    btn.onclick = () => addTestPlayerAndRefresh(name, btn);
    container.appendChild(btn);
}

function showDemoControls() {
    const slotsAvailable = getAvailableSlots();
    initializeTestPlayerNames(slotsAvailable);
    
    const demoSection = document.createElement('div');
    demoSection.id = 'demoControls';
    demoSection.style.cssText = `
        margin-top: 20px;
        padding: 15px;
        background-color: rgba(30, 60, 120, 0.4);
        border: 2px dashed rgba(255, 255, 255, 0.3);
        border-radius: 8px;
    `;
    
    demoSection.innerHTML = `
        <h3 style="margin-top: 0; color: #fff;">🧪 Demo Test Players</h3>
        <p style="margin-bottom: 15px; font-size: 0.9em; color: #fff;">Add or remove test players to simulate multiple players (Max 10 total):</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 15px;" id="testPlayerButtons"></div>
        <div id="testPlayersList" style="margin-top: 10px; font-size: 0.85em;"></div>
    `;
    
    const lobby = document.getElementById('lobby');
    if (lobby) {
        const startGameContainer = document.getElementById('startGameContainer');
        if (startGameContainer) {
            lobby.insertBefore(demoSection, startGameContainer);
        } else {
            lobby.appendChild(demoSection);
        }
    }
    
    const buttonContainer = document.getElementById('testPlayerButtons');
    availableTestPlayerNames.forEach(name => {
        createTestPlayerButton(name, buttonContainer);
    });
    
    updateTestPlayersList();
}

async function addTestPlayerAndRefresh(playerName, button) {
    await addTestPlayer(playerName);
    
    const buttonContainer = document.getElementById('testPlayerButtons');
    if (button && buttonContainer) {
        button.remove();
        
        const index = availableTestPlayerNames.indexOf(playerName);
        if (index > -1) {
            availableTestPlayerNames.splice(index, 1);
        }
        
        const slotsAvailable = getAvailableSlots();
        const currentButtonCount = buttonContainer.children.length;
        
        if (currentButtonCount < slotsAvailable) {
            const newName = getRandomUnusedName();
            if (newName) {
                usedTestPlayerNames.add(newName);
                availableTestPlayerNames.push(newName);
                createTestPlayerButton(newName, buttonContainer);
            }
        }
    }
}

async function addTestPlayer(playerName) {
    if (!isDemoMode) {
        showError("Test players can only be added in demo mode");
        return;
    }
    
    if (!currentRoomId) {
        showError("No room joined");
        return;
    }
    
    try {
        console.log(`[Demo] Adding test player: ${playerName}`);
        await connection.invoke("AddTestPlayer", currentRoomId, playerName);
        updateTestPlayersList();
    } catch (err) {
        console.error(`Error adding test player:`, err);
        showError(`Failed to add ${playerName}`);
    }
}

async function removeTestPlayer(playerName) {
    if (!isDemoMode) {
        showError("Test players can only be removed in demo mode");
        return;
    }
    
    if (!currentRoomId) {
        showError("No room joined");
        return;
    }
    
    try {
        console.log(`[Demo] Removing test player: ${playerName}`);
        await connection.invoke("RemoveTestPlayer", currentRoomId, playerName);
        
        usedTestPlayerNames.delete(playerName);
        
        const buttonContainer = document.getElementById('testPlayerButtons');
        if (buttonContainer) {
            const slotsAvailable = getAvailableSlots();
            const currentButtonCount = buttonContainer.children.length;
            
            if (currentButtonCount < slotsAvailable && currentButtonCount < MAX_BUTTON_SLOTS) {
                const newName = getRandomUnusedName();
                if (newName) {
                    usedTestPlayerNames.add(newName);
                    availableTestPlayerNames.push(newName);
                    createTestPlayerButton(newName, buttonContainer);
                }
            }
        }
        
        updateTestPlayersList();
    } catch (err) {
        console.error(`Error removing test player:`, err);
        showError(`Failed to remove ${playerName}`);
    }
}

function updateTestPlayersList() {
    if (!isDemoMode) return;
    
    const listContainer = document.getElementById('testPlayersList');
    if (!listContainer || !gameState) return;
    
    const testPlayers = gameState.players.filter(p => p.connectionId.startsWith('test-'));
    
    if (testPlayers.length === 0) {
        listContainer.innerHTML = '<em style="color: rgba(255, 255, 255, 0.6);">No test players yet</em>';
        return;
    }
    
    listContainer.innerHTML = '<strong style="color: #fff; display: block; margin-bottom: 8px;">Active test players (click to control):</strong>' + 
        '<div style="display: flex; flex-wrap: wrap; gap: 8px;">' +
        testPlayers.map(p => `<span style="background: #fff; color: #333; padding: 6px 10px; border-radius: 4px; display: inline-flex; align-items: center; cursor: pointer; font-weight: bold; font-size: 0.9em;" onclick="switchToPlayer('${p.name}')" title="Click to control ${p.name}${p.isCardCzar ? ' (Card Czar)' : ''}">${p.name}${p.isCardCzar ? ' ♠' : ''} <button style="background: #dc3545; border: none; color: #fff; cursor: pointer; padding: 2px 6px; margin-left: 6px; border-radius: 3px; font-size: 1em; line-height: 1;" onclick="event.stopPropagation(); removeTestPlayer('${p.name}')">×</button></span>`).join('') +
        '</div>';
}

async function switchToPlayer(testPlayerName) {
    console.log(`[switchToPlayer] Called with: ${testPlayerName}, isDemoMode: ${isDemoMode}`);
    
    if (!isDemoMode) {
        console.warn(`[switchToPlayer] Attempted to switch outside demo mode`);
        showError("Player switching is only available in demo mode");
        return;
    }
    
    if (!gameState) {
        console.warn(`[switchToPlayer] gameState is not set`);
        return;
    }
    
    const targetPlayer = gameState.players.find(p => p.name === testPlayerName);
    console.log(`[switchToPlayer] Found player: ${targetPlayer ? targetPlayer.name : 'NOT FOUND'}, isCardCzar: ${targetPlayer ? targetPlayer.isCardCzar : 'N/A'}`);
    
    if (!targetPlayer) {
        console.error(`Player ${testPlayerName} not found in gameState`);
        showError(`Could not find player: ${testPlayerName}`);
        return;
    }
    
    const hasSubmittedCards = gameState.submittedCards && gameState.submittedCards[targetPlayer.connectionId];
    const submittedCards = hasSubmittedCards ? gameState.submittedCards[targetPlayer.connectionId] : [];
    
    const hand = targetPlayer.hand || [];
    currentPlayer = {
        hand,
        isCardCzar: targetPlayer.isCardCzar || false,
        selectedCards: resolveSelectedCards(submittedCards, hand),
        hasSubmitted: !!hasSubmittedCards
    };
    currentPlayerName = testPlayerName;
    currentConnectionId = targetPlayer.connectionId;
    
    console.log(`[switchToPlayer] Successfully switched to: ${testPlayerName}, isCardCzar: ${targetPlayer.isCardCzar}, hasSubmitted: ${currentPlayer.hasSubmitted}`);
    updateWelcomeHeader();
    updateGameDisplay();
    renderHand();
    updateDemoPlayerSwitcherPanel();
    
    showStatus(`Now controlling: ${testPlayerName} ${targetPlayer.isCardCzar ? '(Card Czar)' : ''}`);
}

function applyDemoPanelMinimized(panel, playersContainer, headerLabel) {
    if (!panel || !playersContainer || !headerLabel) return;

    playersContainer.style.display = isDemoPanelMinimized ? 'none' : 'flex';
    panel.style.padding = '0';
    headerLabel.textContent = isDemoPanelMinimized
        ? '🎮 Demo Player Switcher (minimized)'
        : '🎮 Demo Player Switcher';
}

function toggleDemoPanel(panel, playersContainer, headerLabel) {
    isDemoPanelMinimized = !isDemoPanelMinimized;
    localStorage.setItem('demoPanelMinimized', isDemoPanelMinimized ? 'true' : 'false');
    applyDemoPanelMinimized(panel, playersContainer, headerLabel);
}

function showDemoPlayerSwitcherPanel() {
    if (!isDemoMode) return;
    
    const existing = document.getElementById('demoPlayerSwitcherPanel');
    if (existing) existing.remove();
    
    const panel = document.createElement('div');
    panel.id = 'demoPlayerSwitcherPanel';
    panel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(45, 95, 163, 0.95);
        border: 2px solid #0064c8;
        border-radius: 8px;
        z-index: 1000;
        max-width: 250px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = `
        background: rgba(30, 58, 95, 0.95);
        color: #fff;
        font-weight: bold;
        font-size: 0.9em;
        padding: 8px 10px;
        border-bottom: 1px solid #0064c8;
        border-top-left-radius: 6px;
        border-top-right-radius: 6px;
        cursor: pointer;
        user-select: none;
    `;

    const headerLabel = document.createElement('div');
    headerLabel.textContent = '🎮 Demo Player Switcher';
    header.appendChild(headerLabel);
    header.onclick = () => toggleDemoPanel(panel, playersContainer, headerLabel);
    panel.appendChild(header);
    
    const playersContainer = document.createElement('div');
    playersContainer.id = 'demoPanelPlayers';
    playersContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 6px;
    `;
    panel.appendChild(playersContainer);
    
    document.body.appendChild(panel);
    
    applyDemoPanelMinimized(panel, playersContainer, headerLabel);
    updateDemoPlayerSwitcherPanel();
}

function updateDemoPlayerSwitcherPanel() {
    const container = document.getElementById('demoPanelPlayers');
    if (!container || !gameState || !isDemoMode) return;
    
    container.innerHTML = '';
    
    gameState.players.forEach(player => {
        const playerBtn = document.createElement('button');
        playerBtn.style.cssText = `
            background: ${currentPlayerName === player.name ? '#4db8ff' : '#1e3a5f'};
            color: #fff;
            border: 1px solid #0064c8;
            padding: 6px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
            font-weight: ${currentPlayerName === player.name ? 'bold' : 'normal'};
            transition: all 0.2s;
        `;
        
        playerBtn.onmouseover = () => {
            if (currentPlayerName !== player.name) {
                playerBtn.style.background = '#2d5fa3';
            }
        };
        playerBtn.onmouseout = () => {
            playerBtn.style.background = currentPlayerName === player.name ? '#4db8ff' : '#1e3a5f';
        };
        
        playerBtn.textContent = `${player.name}${player.isCardCzar ? ' ♠' : ''}`;
        playerBtn.onclick = () => switchToPlayer(player.name);
        
        container.appendChild(playerBtn);
    });
}
