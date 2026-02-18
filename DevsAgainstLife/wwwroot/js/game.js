// Main Game Entry Point and Core Functions

// Initialize SignalR connection
async function initializeConnection() {
    connection = new signalR.HubConnectionBuilder()
        .withUrl("/gameHub")
        .withAutomaticReconnect()
        .build();

    // Set up all event handlers
    initializeSignalREvents();

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

// Room Management Functions
async function createRoom() {
    const playerName = document.getElementById('playerName').value.trim();
    console.log("[createRoom] START - playerName:", playerName);

    clearNameError('main');
    clearNameError('modal');
    clearRoomIdError();

    if (!playerName) {
        console.log("[createRoom] ERROR - No player name");
        setNameError('main', 'Please enter your name.');
        return false;
    }

    try {
        console.log("[createRoom] Invoking CreateRoom with playerName:", playerName);
        await connection.invoke("CreateRoom", playerName);
        console.log("[createRoom] CreateRoom invoke succeeded");
        
        currentPlayerName = playerName;
        hasJoinedRoom = true;
        disableJoinControls();
        return true;
    } catch (err) {
        console.error("[createRoom] ERROR - Invoke failed:", err);
        const errorMessage = getJoinErrorMessage(err) || "Failed to create room";
        console.error("[createRoom] Error message:", errorMessage);
        showError(errorMessage);
        return false;
    }
}

async function joinRoom(roomCodeParam = null) {
    const playerName = document.getElementById('playerName').value.trim();
    const roomCode = (roomCodeParam || document.getElementById('roomCode').value.trim()).toUpperCase();

    clearNameError('main');
    clearNameError('modal');
    clearRoomIdError();

    if (!playerName) {
        setNameError('main', 'Please enter your name.');
        return false;
    }

    if (!validateRoomId(roomCode)) {
        return false;
    }

    try {
        currentPlayerName = playerName;
        currentRoomId = roomCode;
        await connection.invoke("JoinRoom", roomCode, playerName);
        hasJoinedRoom = true;
        disableJoinControls();
        updateWelcomeHeader();
        return true;
    } catch (err) {
        console.error("Error joining room:", err);
        const errorMessage = getJoinErrorMessage(err) || "Failed to join room";
        if (isDuplicateNameError(errorMessage)) {
            const modal = document.getElementById('nameEntryModal');
            if (modal && !modal.classList.contains('hidden')) {
                setNameError('modal');
            } else {
                setNameError('main');
            }
            hasJoinedRoom = false;
            document.getElementById('leaveRoomBtn').classList.add('hidden');
            return false;
        }
        showError(errorMessage);
        return false;
    }
}

async function leaveRoom() {
    if (!confirm('Are you sure you want to leave the room?')) {
        return;
    }

    const roomIdToLeave = currentRoomId;
    
    try {
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
    hasShownDeciderAnnouncement = false;
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
    
    document.getElementById('roundsSelector').classList.add('hidden');
    document.getElementById('shareLinkSection').classList.add('hidden');
    closeRoundsModal();
    
    if (!joinedViaLink) {
        enableJoinControls();
    }
    
    const lobbyStatus = document.getElementById('lobbyStatus');
    if (lobbyStatus) {
        lobbyStatus.innerHTML = '';
        lobbyStatus.classList.add('hidden');
    }
    
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) startGameBtn.disabled = true;
    updateWelcomeHeader();
    document.body.classList.remove('in-game');
    document.getElementById('leaveGameBtn')?.classList.add('hidden');

    const header = document.getElementById('gameHeader');
    if (header) header.style.display = '';
    const logo = document.getElementById('gameLogo');
    if (logo) logo.classList.add('hidden');
    
    console.log("Left room");
}

async function startGame() {
    if (!currentRoomId) {
        showError("Please join a room first");
        return;
    }

    // If rounds haven't been set, show the rounds modal
    if (!hasPromptedRounds) {
        openRoundsModal();
        return;
    }

    try {
        await connection.invoke("StartGame", currentRoomId);
    } catch (err) {
        console.error("Error starting game:", err);
        showError(err.message || "Failed to start game");
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

// Rounds Management
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
        updateWelcomeHeader();
        
        // Don't auto-start the game - let the room creator click Start Game button when ready
    } catch (err) {
        console.error("Error setting rounds:", err);
        showError(err.message || "Failed to set rounds");
    }
}

async function handleSetRounds() {
    const input = document.getElementById('roundsModalInput');
    const value = parseInt(input.value, 10);
    
    if (value >= 1 && value <= 20) {
        hasPromptedRounds = true;
        await connection.invoke("UpdateRounds", currentRoomId, value);
        closeRoundsModal();
    } else {
        showError("Please enter a valid number between 1 and 20");
    }
}

// Modal name entry (from URL join)
function confirmNameEntryFromModal() {
    handleModalJoinGame();
}

// Card Selection and Submission
function selectWhiteCard(card) {
    if (currentPlayer.isCardCzar) {
        showError("Card Czar cannot play cards!");
        return;
    }

    if (currentPlayer.hasSubmitted) {
        showError("You have already submitted!");
        return;
    }

    const pickCount = gameState?.currentBlackCard?.pickCount ?? gameState?.currentBlackCard?.pick ?? 1;
    const cardIndex = currentPlayer.selectedCards.findIndex(c => c.id === card.id);

    if (cardIndex >= 0) {
        // Deselect
        currentPlayer.selectedCards.splice(cardIndex, 1);
    } else {
        // Select
        if (currentPlayer.selectedCards.length >= pickCount) {
            if (pickCount === 1) {
                currentPlayer.selectedCards = [card];
            } else {
                showError(`You can only select ${pickCount} card${pickCount !== 1 ? 's' : ''}`);
                return;
            }
        } else {
            currentPlayer.selectedCards.push(card);
        }
    }

    renderHand();
    updateBlackCardWithSelection();
    updateSubmitButtonState();
}

async function submitSelectedCards() {
    if (currentPlayer.isCardCzar) {
        showError("Card Czar cannot submit cards!");
        return;
    }

    if (gameState.state !== 1) {
        showError("Cannot submit cards right now");
        return;
    }

    if (currentPlayer.hasSubmitted) {
        showError("You have already submitted your cards");
        return;
    }

    const pickCount = gameState?.currentBlackCard?.pickCount ?? gameState?.currentBlackCard?.pick ?? 1;
    const cardIds = currentPlayer.selectedCards.map(c => c.id);

    if (cardIds.length !== pickCount) {
        showError(`Select ${pickCount} card${pickCount !== 1 ? 's' : ''} to submit`);
        return;
    }

    try {
        await connection.invoke("SubmitCards", currentRoomId, cardIds, currentConnectionId);
        currentPlayer.hasSubmitted = true;
        renderHand();
        updateSubmitButtonState();
        showStatus("Cards submitted! Waiting for other players...");
    } catch (err) {
        console.error("Error submitting cards:", err);
        showError(err.message || "Failed to submit cards");
    }
}

// Game Actions
async function selectWinner(playerId) {
    if (!currentPlayer.isCardCzar) {
        showError("Only the Card Czar can select a winner!");
        return;
    }

    try {
        await connection.invoke("SelectWinner", currentRoomId, playerId, currentConnectionId);
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

async function playAgain() {
    try {
        // Set a new round count and start a fresh game
        const roundCount = totalRounds || 7;
        await connection.invoke("StartGame", currentRoomId, roundCount);
    } catch (err) {
        console.error("Error starting new game:", err);
        showError(err.message || "Failed to start new game");
    }
}

async function exitGame() {
    if (!confirm('Are you sure you want to leave the game?')) {
        return;
    }

    try {
        // Return to lobby
        await connection.invoke("LeaveRoom", currentRoomId);
    } catch (err) {
        console.error("Error exiting game:", err);
        showError(err.message || "Failed to exit game");
    }
}

// Mid-game player leave handlers  
async function handleRestartRound() {
    if (!currentRoomId) return;

    try {
        await connection.invoke("RestartRound", currentRoomId);
        console.log("Round restarted by room creator");
    } catch (err) {
        console.error("Error restarting round:", err);
        showError(err.message || "Failed to restart round");
    }
}

async function handleWaitForMorePlayers() {
    if (!currentRoomId) return;

    try {
        await connection.invoke("WaitForMorePlayers", currentRoomId);
        console.log("Waiting for more players to join");
    } catch (err) {
        console.error("Error waiting for more players:", err);
        showError(err.message || "Failed to wait for more players");
    }
}

// Display Functions
function updateRoundDisplay() {
    const roundLabelEl = document.getElementById('roundLabel');
    const roundNumberEl = document.getElementById('roundNumber');
    const totalRoundsEl = document.getElementById('totalRoundsDisplay');

    if (!roundLabelEl) return;

    if (gameState && gameState.isDeciderRound) {
        roundLabelEl.innerHTML = '⚡ DECIDER ROUND ⚡';
    } else {
        roundLabelEl.innerHTML = `Round: <span id="roundNumber">${roundNumber}</span> / <span id="totalRoundsDisplay">${totalRounds}</span>`;
        if (roundNumberEl) roundNumberEl.textContent = roundNumber;
        if (totalRoundsEl) totalRoundsEl.textContent = totalRounds;
    }
}

function updateSubmitButtonState() {
    const button = document.getElementById('submitCardsBtn');
    if (!button) return;

    const pickCount = gameState?.currentBlackCard?.pickCount ?? gameState?.currentBlackCard?.pick ?? 1;

    if (currentPlayer.isCardCzar || gameState?.state !== 1) {
        button.classList.add('hidden');
        return;
    }

    button.classList.remove('hidden');
    button.disabled = currentPlayer.hasSubmitted || currentPlayer.selectedCards.length !== pickCount;
}

function hideWinnerDisplay() {
    const winnerCard = document.getElementById('winnerCard');
    if (winnerCard) {
        winnerCard.classList.add('hidden');
        return;
    }

    const statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.classList.remove('status-winner');
    }
}

function hideNextRoundButton() {
    const nextRoundBtn = document.getElementById('nextRoundBtn');
    if (nextRoundBtn) {
        nextRoundBtn.classList.add('hidden');
    }
    
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
        playAgainBtn.classList.add('hidden');
    }
    
    const exitGameBtn = document.getElementById('exitGameBtn');
    if (exitGameBtn) {
        exitGameBtn.classList.add('hidden');
    }
}

function hideGameOver() {
    const gameOverDisplay = document.getElementById('gameOverDisplay');
    if (gameOverDisplay) {
        gameOverDisplay.classList.add('hidden');
    }
}

function renderWinningBlackCard(winnerId) {
    if (!gameState?.currentBlackCard) return;

    const blackCardEl = document.getElementById('blackCard');
    if (!blackCardEl) return;

    const winningCardIds = gameState.submittedCards?.[winnerId];
    const winner = gameState.players.find(p => p.connectionId === winnerId);
    const answers = [];

    if (winner && Array.isArray(winningCardIds)) {
        winningCardIds.forEach(cardId => {
            const card = winner.hand?.find(c => c.id === cardId);
            if (card) answers.push(card.text);
        });
    }

    const text = gameState.currentBlackCard.text || '';
    const html = renderBlackCardHtml(text, answers, false);
    blackCardEl.innerHTML = `<span class="black-card-text">${html}</span>`;
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Content Loaded - Initializing game");
    
    // Initialize SignalR connection
    await initializeConnection();
    
    // Check for room code in URL
    checkUrlForRoom();
    
    // Initialize how-to-play section
    initializeHowToPlayCollapse();
    
    // Set up enter key handlers for forms
    document.getElementById('playerName')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createRoom();
    });
    
    document.getElementById('roomCode')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
    
    document.getElementById('modalPlayerName')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleModalJoinGame();
    });
    
    document.getElementById('roundsModalInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSetRounds();
    });
});

window.addEventListener('beforeunload', (e) => {
    if (gameState && gameState.state !== 0 && hasJoinedRoom) {
        const warningMessage = 'You are in the middle of a game. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = warningMessage;
        return warningMessage;
    }
});
