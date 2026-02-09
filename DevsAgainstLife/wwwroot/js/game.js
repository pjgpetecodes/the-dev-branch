// Game State
let connection;
let currentRoomId = '';
let currentConnectionId = '';
let roomCreatorId = '';
let currentPlayer = {
    hand: [],
    isCardCzar: false,
    selectedCards: [],
    hasSubmitted: false
};
let gameState = null;
let roundNumber = 1;
let totalRounds = 7;
let hasJoinedRoom = false;
let hasPromptedRounds = false;
let currentPlayerName = '';
let joinedViaLink = false;
let idleWarningTimer = null;

// Constants
const MIN_PLAYERS_TO_START = 3;

// Initialize SignalR connection
async function initializeConnection() {
    connection = new signalR.HubConnectionBuilder()
        .withUrl("/gameHub")
        .withAutomaticReconnect()
        .build();

    // Set up event handlers
    connection.on("RoomCreated", (roomId) => {
        console.log("Room created:", roomId);
        showLobbyStatus(`Room ${roomId} created! Waiting for players...`);
    });

    connection.on("PlayerJoined", (playerName, playerCount, playerNames) => {
        console.log("Player joined:", playerName, "Total players:", playerCount);
        showPlayerJoinedMessage(playerName);
        updateLobbyStatus(playerCount, playerNames);
        updateWelcomeHeader();
    });

    connection.on("PlayerLeft", (playerName, playerCount, playerNames) => {
        console.log("Player left:", playerName, "Total players:", playerCount);
        showPlayerLeftMessage(playerName);
        updateLobbyStatus(playerCount, playerNames);
        updateWelcomeHeader();
    });

    connection.on("GameStateUpdated", (state) => {
        console.log("Game state updated:", state);
        gameState = state;

        if (typeof state.currentRound === 'number') {
            roundNumber = state.currentRound;
        }

        if (typeof state.totalRounds === 'number') {
            totalRounds = state.totalRounds;
        }

        if (state.creatorConnectionId) {
            roomCreatorId = state.creatorConnectionId;
            showRoundsSelector();
            updateShareLink();
        }

        updateRoundDisplay();
        updateWelcomeHeader();
        
        // Update lobby status if still in lobby
        if (state.state === 0) { // GameState.Lobby
            const playerNames = state.players.map(p => p.name);
            updateLobbyStatus(state.players.length, playerNames);
        }
        
        updateGameDisplay();
    });

    connection.on("GameStarted", () => {
        console.log("Game started!");
        document.getElementById('lobby').style.display = 'none';
        document.getElementById('gameBoard').style.display = 'block';
        updateWelcomeHeader();
        showStatus("Game started! Get ready to play!");
    });

    connection.on("HandUpdated", (hand) => {
        console.log("Hand updated:", hand);
        currentPlayer.hand = hand;
        renderHand();
        updateSubmitButtonState();
    });

    connection.on("CardSubmitted", (playerId) => {
        console.log("Card submitted by:", playerId);
        showStatus("A player has submitted their card!");
    });

    connection.on("WinnerSelected", (winnerId) => {
        console.log("Winner selected:", winnerId);
    });

    connection.on("RoundStarted", () => {
        console.log("Round started");
        currentPlayer.selectedCards = [];
        currentPlayer.hasSubmitted = false;
        hideWinnerDisplay();
        hideNextRoundButton();
        updateRoundDisplay();
        updateWelcomeHeader();
    });

    connection.on("Error", (message) => {
        console.error("Error:", message);
        showError(message);
    });

    connection.on("RoomDeleted", (message) => {
        console.log("Room deleted:", message);
        console.log("Current room ID:", currentRoomId);
        console.log("Has joined room:", hasJoinedRoom);
        hideIdleWarningModal();
        showError(message);
        // Reset game state and return to lobby/join screen
        setTimeout(() => {
            // Clear room state
            hasJoinedRoom = false;
            currentRoomId = '';
            currentPlayerName = '';
            roomCreatorId = '';
            currentPlayer = {
                hand: [],
                isCardCzar: false,
                selectedCards: [],
                hasSubmitted: false
            };
            gameState = null;
            roundNumber = 1;
            totalRounds = 7;
            hasPromptedRounds = false;
            
            // Reset UI
            document.getElementById('gameBoard').style.display = 'none';
            document.getElementById('lobby').style.display = 'block';
            document.getElementById('lobbyStatus').innerHTML = '';
            document.getElementById('roundsSelector').classList.add('hidden');
            closeRoundsModal();
            document.getElementById('shareLinkSection').classList.add('hidden');
            updateWelcomeHeader();
            enableJoinControls();
        }, 2000);
    });

    connection.on("RoomIdleWarning", (secondsRemaining) => {
        if (!hasJoinedRoom) {
            return;
        }

        showIdleWarningModal(secondsRemaining);
    });

    connection.on("RoomIdleExtended", (message) => {
        hideIdleWarningModal();
        showStatus(message || "Room activity extended.");
    });

    // Start connection
    try {
        await connection.start();
        console.log("SignalR Connected");
        currentConnectionId = connection.connectionId;
    } catch (err) {
        console.error("SignalR Connection Error:", err);
        showError("Failed to connect to game server. Please refresh the page.");
    }
}

function showIdleWarningModal(secondsRemaining) {
    const modal = document.getElementById('idleWarningModal');
    const countdown = document.getElementById('idleWarningCountdown');

    if (!modal || !countdown) {
        return;
    }

    let remaining = Math.max(0, Number(secondsRemaining) || 0);
    countdown.textContent = `${remaining}`;
    modal.classList.remove('hidden');

    if (idleWarningTimer) {
        clearInterval(idleWarningTimer);
    }

    idleWarningTimer = setInterval(() => {
        remaining = Math.max(0, remaining - 1);
        countdown.textContent = `${remaining}`;

        if (remaining <= 0) {
            clearInterval(idleWarningTimer);
            idleWarningTimer = null;
        }
    }, 1000);
}

function hideIdleWarningModal() {
    const modal = document.getElementById('idleWarningModal');
    if (modal) {
        modal.classList.add('hidden');
    }

    if (idleWarningTimer) {
        clearInterval(idleWarningTimer);
        idleWarningTimer = null;
    }
}

async function extendRoomIdle() {
    if (!currentRoomId) {
        return;
    }

    try {
        await connection.invoke("ExtendRoomIdle", currentRoomId);
        hideIdleWarningModal();
    } catch (err) {
        console.error("Failed to extend room idle:", err);
        showError(err.message || "Failed to extend room activity.");
    }
}

// UI Functions
function updateLobbyStatus(playerCount, playerNames) {
    const remaining = Math.max(0, MIN_PLAYERS_TO_START - playerCount);
    
    let message = `<p><strong>Players in room: ${playerCount}</strong></p>`;
    
    // Show list of player names
    if (playerNames && playerNames.length > 0) {
        message += '<ul class="lobby-player-list">';
        playerNames.forEach(name => {
            message += `<li>👤 ${name}</li>`;
        });
        message += '</ul>';
    }
    
    const startGameBtn = document.getElementById('startGameBtn');
    if (!startGameBtn) {
        console.error('Start Game button not found');
        return;
    }
    
    if (playerCount < MIN_PLAYERS_TO_START) {
        message += `<p>Waiting for ${remaining} more player${remaining !== 1 ? 's' : ''}...</p>`;
        startGameBtn.disabled = true;
    } else {
        message += `<p class="ready-status">Ready to start!</p>`;
        startGameBtn.disabled = false;
    }
    
    const lobbyStatus = document.getElementById('lobbyStatus');
    
    // Get all existing notifications before clearing
    const notifications = Array.from(lobbyStatus.querySelectorAll('.player-join-notification'));
    
    // Clear everything
    lobbyStatus.innerHTML = message;
    
    // Re-add notifications at the beginning
    notifications.forEach(notification => {
        lobbyStatus.prepend(notification);
    });
}

function showLobbyStatus(message) {
    document.getElementById('lobbyStatus').innerHTML = `<p>${message}</p>`;
}

function showPlayerJoinedMessage(playerName) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'player-join-notification';
    messageDiv.textContent = `${playerName} joined the room!`;
    
    const lobbyStatus = document.getElementById('lobbyStatus');
    lobbyStatus.prepend(messageDiv);
    
    // Remove the message after 3 seconds
    setTimeout(() => {
        messageDiv.classList.add('fade-out');
        setTimeout(() => messageDiv.remove(), 500);
    }, 3000);
}

function showPlayerLeftMessage(playerName) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'player-join-notification';
    messageDiv.style.background = 'rgba(220, 53, 69, 0.3)';
    messageDiv.style.borderLeftColor = '#dc3545';
    messageDiv.textContent = `${playerName} left the room!`;
    
    const lobbyStatus = document.getElementById('lobbyStatus');
    lobbyStatus.prepend(messageDiv);
    
    // Remove the message after 3 seconds
    setTimeout(() => {
        messageDiv.classList.add('fade-out');
        setTimeout(() => messageDiv.remove(), 500);
    }, 3000);
}

function showStatus(message) {
    document.getElementById('statusMessage').textContent = message;
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.container').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function isNegativeRoomId(roomId) {
    const numeric = Number(roomId);
    return Number.isFinite(numeric) && numeric < 0;
}

function validateRoomId(roomId) {
    if (!roomId) {
        showError("Please enter a room ID");
        return false;
    }

    if (!/^\d+$/.test(roomId)) {
        showError("Room ID must be a positive number");
        return false;
    }

    const numeric = Number(roomId);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        showError("Room ID must be a positive number");
        return false;
    }

    return true;
}

async function joinRoom() {
    const playerName = document.getElementById('playerName').value.trim();
    const roomId = document.getElementById('roomId').value.trim();

    if (!playerName) {
        showError("Please enter your name");
        return;
    }

    if (!validateRoomId(roomId)) {
        return;
    }

    currentRoomId = roomId;
    currentPlayerName = playerName;
    document.getElementById('roomIdDisplay').textContent = roomId;

    try {
        await connection.invoke("JoinRoom", roomId, playerName);
        // Mark as joined and disable controls
        hasJoinedRoom = true;
        disableJoinControls();
        updateWelcomeHeader();
        // The PlayerJoined event will handle updating the lobby status and button
    } catch (err) {
        console.error("Error joining room:", err);
        showError("Failed to join room");
    }
}

function disableJoinControls() {
    document.getElementById('playerName').parentElement.classList.add('hidden');
    document.getElementById('roomId').parentElement.classList.add('hidden');
    document.getElementById('joinRoomBtn').classList.add('hidden');
    document.getElementById('leaveRoomBtn').classList.remove('hidden');
}

function enableJoinControls() {
    document.getElementById('playerName').parentElement.classList.remove('hidden');
    document.getElementById('roomId').parentElement.classList.remove('hidden');
    document.getElementById('joinRoomBtn').classList.remove('hidden');
    document.getElementById('leaveRoomBtn').classList.add('hidden');
}

function showRoundsSelector() {
    const selector = document.getElementById('roundsSelector');
    const roundsInfoValue = document.getElementById('roundsInfoValue');

    if (gameState?.state === 0) {
        selector.classList.remove('hidden');
        roundsInfoValue.textContent = totalRounds;
    } else {
        selector.classList.add('hidden');
    }

    if (currentConnectionId === roomCreatorId && gameState?.state === 0 && !hasPromptedRounds) {
        openRoundsModal();
    } else if (currentConnectionId !== roomCreatorId) {
        closeRoundsModal();
    }
}

function openRoundsModal() {
    const modal = document.getElementById('roundsModal');
    const input = document.getElementById('roundsModalInput');

    if (!modal || !input) return;

    modal.classList.remove('hidden');
    input.value = totalRounds;
    input.focus();
}

function closeRoundsModal() {
    const modal = document.getElementById('roundsModal');
    if (!modal) return;
    modal.classList.add('hidden');
}

async function confirmRounds() {
    const roundsInput = document.getElementById('roundsModalInput');
    const rounds = parseInt(roundsInput.value, 10);

    if (Number.isNaN(rounds) || rounds < 1) {
        showError("Please enter a valid number of rounds");
        return;
    }

    await setRounds(rounds);
}

async function setRounds(rounds) {
    try {
        await connection.invoke("UpdateRounds", currentRoomId, rounds);
        totalRounds = rounds;
        hasPromptedRounds = true;
        closeRoundsModal();
        showRoundsSelector();
        updateRoundDisplay();
    } catch (err) {
        console.error("Error setting rounds:", err);
        showError(err.message || "Failed to set rounds");
    }
}

async function leaveRoom() {
    const roomIdToLeave = currentRoomId;
    
    try {
        // Notify server that this player is leaving
        if (roomIdToLeave) {
            await connection.invoke("LeaveRoom", roomIdToLeave);
        }
    } catch (err) {
        console.error("Error notifying server of room leave:", err);
    }
    
    // Reset state
    hasJoinedRoom = false;
    currentRoomId = '';
    currentPlayerName = '';
    roomCreatorId = '';
    currentPlayer = {
        hand: [],
        isCardCzar: false,
        selectedCards: [],
        hasSubmitted: false
    };
    gameState = null;
    roundNumber = 1;
    totalRounds = 7;
    hasPromptedRounds = false;
    updateRoundDisplay();
    
    // Hide rounds selector and modal
    document.getElementById('roundsSelector').classList.add('hidden');
    document.getElementById('shareLinkSection').classList.add('hidden');
    closeRoundsModal();
    
    // Re-enable controls
    if (!joinedViaLink) {
        enableJoinControls();
    }
    
    // Clear lobby status and welcome header
    document.getElementById('lobbyStatus').innerHTML = '';
    document.getElementById('startGameBtn').disabled = true;
    updateWelcomeHeader();
    
    console.log("Left room");
}

async function startGame() {
    if (!currentRoomId) {
        showError("Please join a room first");
        return;
    }

    try {
        await connection.invoke("StartGame", currentRoomId);
    } catch (err) {
        console.error("Error starting game:", err);
        showError(err.message || "Failed to start game");
    }
}

async function submitCard(cardId) {
    if (currentPlayer.isCardCzar) {
        showError("Card Czar cannot submit cards!");
        return;
    }

    if (gameState.state !== 1) { // GameState.Playing
        showError("Cannot submit cards right now");
        return;
    }

    if (currentPlayer.hasSubmitted) {
        showError("You have already submitted your cards");
        return;
    }

    const pickCount = gameState?.currentBlackCard?.pickCount || 1;

    if (currentPlayer.selectedCards.includes(cardId)) {
        currentPlayer.selectedCards = currentPlayer.selectedCards.filter(id => id !== cardId);
    } else {
        if (currentPlayer.selectedCards.length >= pickCount) {
            showError(`You can only select ${pickCount} card${pickCount !== 1 ? 's' : ''}`);
            return;
        }
        currentPlayer.selectedCards.push(cardId);
    }

    renderHand();
    updateSubmitButtonState();

    if (pickCount === 1 && currentPlayer.selectedCards.length === 1) {
        await submitSelectedCards();
    }
}

async function submitSelectedCards() {
    if (currentPlayer.isCardCzar) {
        showError("Card Czar cannot submit cards!");
        return;
    }

    if (gameState.state !== 1) { // GameState.Playing
        showError("Cannot submit cards right now");
        return;
    }

    if (currentPlayer.hasSubmitted) {
        showError("You have already submitted your cards");
        return;
    }

    const pickCount = gameState?.currentBlackCard?.pickCount || 1;

    if (currentPlayer.selectedCards.length !== pickCount) {
        showError(`Select ${pickCount} card${pickCount !== 1 ? 's' : ''} to submit`);
        return;
    }

    try {
        await connection.invoke("SubmitCards", currentRoomId, currentPlayer.selectedCards);
        currentPlayer.hasSubmitted = true;
        renderHand();
        updateSubmitButtonState();
        showStatus("Cards submitted! Waiting for other players...");
    } catch (err) {
        console.error("Error submitting cards:", err);
        showError(err.message || "Failed to submit cards");
    }
}

async function selectWinner(playerId) {
    if (!currentPlayer.isCardCzar) {
        showError("Only the Card Czar can select a winner!");
        return;
    }

    try {
        await connection.invoke("SelectWinner", currentRoomId, playerId);
    } catch (err) {
        console.error("Error selecting winner:", err);
        showError(err.message || "Failed to select winner");
    }
}

async function nextRound() {
    try {
        await connection.invoke("NextRound", currentRoomId);
    } catch (err) {
        console.error("Error starting next round:", err);
        showError(err.message || "Failed to start next round");
    }
}

function updateGameDisplay() {
    if (!gameState) return;

    // Update players
    renderPlayers();

    // Update black card
    if (gameState.currentBlackCard) {
        document.getElementById('blackCard').textContent = gameState.currentBlackCard.text;
    }

    // Update game state specific UI
    updateGameStateUI();
    updateSubmitButtonState();
    updateWelcomeHeader();
}

function updateRoundDisplay() {
    const roundNumberEl = document.getElementById('roundNumber');
    const totalRoundsEl = document.getElementById('totalRoundsDisplay');
    const roundLabelEl = document.getElementById('roundLabel');

    if (gameState && gameState.isDeciderRound) {
        roundLabelEl.innerHTML = '⚡ DECIDER ROUND ⚡';
    } else {
        roundLabelEl.innerHTML = `Round: <span id="roundNumber">${roundNumber}</span> / <span id="totalRoundsDisplay">${totalRounds}</span>`;
        roundNumberEl.textContent = roundNumber;
        totalRoundsEl.textContent = totalRounds;
    }
}

function renderPlayers() {
    if (!gameState) return;

    const container = document.getElementById('playersContainer');
    container.innerHTML = '';

    gameState.players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        
        if (player.isCardCzar) {
            playerCard.classList.add('czar');
        }
        
        if (gameState.winningPlayerId === player.connectionId) {
            playerCard.classList.add('winner');
        }

        const czarLabel = player.isCardCzar ? ' 👑' : '';
        
        // Create name div
        const nameDiv = document.createElement('div');
        nameDiv.style.fontWeight = 'bold';
        nameDiv.textContent = player.name + czarLabel;
        
        // Create score div
        const scoreDiv = document.createElement('div');
        scoreDiv.textContent = `Score: ${player.score}`;
        
        playerCard.appendChild(nameDiv);
        playerCard.appendChild(scoreDiv);
        
        container.appendChild(playerCard);

        // Check if this is the current player
        if (player.connectionId === connection.connectionId) {
            currentPlayer.isCardCzar = player.isCardCzar;
        }
    });
}

function renderHand() {
    const container = document.getElementById('handContainer');
    container.innerHTML = '';

    if (currentPlayer.hand.length === 0) {
        container.innerHTML = '<p class="no-cards-message">No cards yet...</p>';
        return;
    }

    currentPlayer.hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card white-card mini-card';
        cardDiv.textContent = card.text;
        
        if (currentPlayer.selectedCards.includes(card.id)) {
            cardDiv.classList.add('selected');
        }
        
        if (currentPlayer.isCardCzar || currentPlayer.hasSubmitted) {
            cardDiv.classList.add('submitted');
        } else {
            cardDiv.onclick = () => submitCard(card.id);
        }
        
        container.appendChild(cardDiv);
    });
}

function updateGameStateUI() {
    if (!gameState) return;

    // Hide everything first
    hideSubmittedCards();
    hideWinnerDisplay();
    hideNextRoundButton();
    hideGameOver();

    switch (gameState.state) {
        case 0: // Lobby
            showStatus("Waiting in lobby...");
            break;
        case 1: // Playing
            if (currentPlayer.isCardCzar) {
                showStatus("You are the Card Czar! Wait for players to submit their cards.");
            } else if (currentPlayer.hasSubmitted) {
                showStatus("Cards submitted! Waiting for other players...");
            } else {
                const pickCount = gameState?.currentBlackCard?.pickCount || 1;
                if (pickCount > 1) {
                    showStatus(`Select ${pickCount} cards from your hand to play!`);
                } else {
                    showStatus("Select a card from your hand to play!");
                }
            }
            break;
        case 2: // Judging
            if (currentPlayer.isCardCzar) {
                showStatus("You are the Card Czar! Select the funniest card.");
            } else {
                showStatus("Card Czar is selecting the winner...");
            }
            renderSubmittedCards();
            break;
        case 3: // RoundOver
            const winner = gameState.players.find(p => p.connectionId === gameState.winningPlayerId);
            if (winner) {
                showWinnerDisplay(winner.name);
            }
            showNextRoundButton();
            break;
        case 4: // GameOver
            const gameWinner = gameState.players.find(p => p.connectionId === gameState.winningPlayerId);
            if (gameWinner) {
                showGameOver(gameWinner.name);
            }
            break;
    }
}

function renderSubmittedCards() {
    const section = document.getElementById('submittedCardsSection');
    const container = document.getElementById('submittedCardsContainer');
    const title = document.getElementById('submittedCardsTitle');
    
    section.classList.remove('hidden');
    container.innerHTML = '';
    
    // Set title based on whether current player is card czar
    if (currentPlayer.isCardCzar) {
        title.textContent = 'Select the Winner:';
    } else {
        title.textContent = 'Submitted Cards:';
    }

    Object.entries(gameState.submittedCards).forEach(([playerId, cardIds]) => {
        const player = gameState.players.find(p => p.connectionId === playerId);
        const groupDiv = document.createElement('div');
        groupDiv.className = 'submitted-card-group';

        if (Array.isArray(cardIds)) {
            cardIds.forEach(cardId => {
                const card = player?.hand?.find(c => c.id === cardId);
                if (card) {
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'card white-card mini-card';
                    cardDiv.textContent = card.text;
                    groupDiv.appendChild(cardDiv);
                }
            });
        }

        if (groupDiv.children.length > 0) {
            if (currentPlayer.isCardCzar) {
                groupDiv.onclick = () => selectWinner(playerId);
                groupDiv.style.cursor = 'pointer';
            } else {
                groupDiv.style.cursor = 'default';
            }

            container.appendChild(groupDiv);
        }
    });
}

function updateSubmitButtonState() {
    const button = document.getElementById('submitCardsBtn');
    if (!button) return;

    const pickCount = gameState?.currentBlackCard?.pickCount || 1;

    if (currentPlayer.isCardCzar || gameState?.state !== 1) {
        button.classList.add('hidden');
        return;
    }

    if (pickCount <= 1) {
        button.classList.add('hidden');
        return;
    }

    button.classList.remove('hidden');
    button.disabled = currentPlayer.hasSubmitted || currentPlayer.selectedCards.length !== pickCount;
}

function hideSubmittedCards() {
    document.getElementById('submittedCardsSection').classList.add('hidden');
}

function showWinnerDisplay(winnerName) {
    const display = document.getElementById('winnerDisplay');
    display.className = 'winner-display';
    display.textContent = `🎉 ${winnerName} won this round! 🎉`;
}

function hideWinnerDisplay() {
    document.getElementById('winnerDisplay').classList.add('hidden');
}

function showNextRoundButton() {
    if (currentPlayer.isCardCzar) {
        document.getElementById('nextRoundBtn').classList.remove('hidden');
    }
}

function hideNextRoundButton() {
    document.getElementById('nextRoundBtn').classList.add('hidden');
}

function showGameOver(winnerName) {
    const display = document.getElementById('gameOverDisplay');
    display.className = 'game-over';
    display.innerHTML = '';
    
    const h2 = document.createElement('h2');
    h2.textContent = '🏆 Game Over! 🏆';
    
    const p = document.createElement('p');
    p.style.fontSize = '2rem';
    p.style.margin = '20px 0';
    p.textContent = `${winnerName} is the ultimate winner!`;
    
    const button = document.createElement('button');
    button.className = 'btn-primary';
    button.textContent = 'Play Again';
    button.onclick = () => location.reload();
    
    display.appendChild(h2);
    display.appendChild(p);
    display.appendChild(button);
}

function hideGameOver() {
    document.getElementById('gameOverDisplay').classList.add('hidden');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeConnection();
    checkUrlForRoom();
});

function checkUrlForRoom() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId) {
        if (isNegativeRoomId(roomId)) {
            joinedViaLink = false;
            document.getElementById('roomId').value = '';
            document.getElementById('playerName').parentElement.classList.remove('hidden');
            document.getElementById('roomId').parentElement.classList.remove('hidden');
            document.getElementById('joinRoomBtn').classList.remove('hidden');
            showError("Room ID cannot be a negative number");
            return;
        }

        joinedViaLink = true;
        document.getElementById('roomId').value = roomId;
        document.getElementById('playerName').parentElement.classList.add('hidden');
        document.getElementById('roomId').parentElement.classList.add('hidden');
        document.getElementById('joinRoomBtn').classList.add('hidden');
        showNameEntryModal(roomId);
    }
}

function showNameEntryModal(roomId) {
    const modal = document.getElementById('nameEntryModal');
    const input = document.getElementById('modalPlayerName');
    if (modal && input) {
        modal.classList.remove('hidden');
        input.focus();
        
        // Allow Enter key to submit
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                confirmNameEntry();
            }
        };
    }
}

function closeNameEntryModal() {
    const modal = document.getElementById('nameEntryModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function confirmNameEntry() {
    const nameInput = document.getElementById('modalPlayerName');
    const roomInput = document.getElementById('roomId');
    const playerName = nameInput.value.trim();
    const roomId = roomInput.value.trim();
    
    if (!playerName) {
        showError("Please enter your name");
        return;
    }
    
    if (!roomId) {
        showError("Room ID not found");
        return;
    }
    
    currentPlayerName = playerName;
    document.getElementById('playerName').value = playerName;
    closeNameEntryModal();
    await joinRoom();
}

function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
    const button = event.target;
    
    if (input) {
        input.select();
        input.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(input.value).then(() => {
            button.textContent = 'Copied!';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = 'Copy Link';
                button.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            showError('Failed to copy link');
        });
    }
}

function updateShareLink() {
    const shareLinkSection = document.getElementById('shareLinkSection');
    const shareLinkInput = document.getElementById('shareLinkInput');
    
    if (currentConnectionId === roomCreatorId && currentRoomId && gameState?.state === 0) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
        shareLinkInput.value = shareUrl;
        shareLinkSection.classList.remove('hidden');
    } else {
        shareLinkSection.classList.add('hidden');
    }
}

function updateWelcomeHeader() {
    const welcomeHeader = document.getElementById('welcomeHeader');
    
    if (hasJoinedRoom && currentRoomId) {
        const playerCount = gameState?.players?.length || 0;
        const playerNameToShow = currentPlayerName || document.getElementById('playerName').value.trim();
        
        let html = `Welcome <strong>${playerNameToShow}</strong> to Room <strong>${currentRoomId}</strong> | Players in room: <strong>${playerCount}</strong>`;
        
        // Add round info if game is active
        if (gameState && gameState.state !== 0) { // Not in lobby
            if (gameState.isDeciderRound) {
                html += `<div class="round-info">⚡ DECIDER ROUND ⚡</div>`;
            } else {
                html += `<div class="round-info">Round: ${roundNumber} / ${totalRounds}</div>`;
            }
        }
        
        welcomeHeader.innerHTML = html;
        welcomeHeader.classList.remove('hidden');
    } else {
        welcomeHeader.classList.add('hidden');
    }
}
