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
        }

        updateRoundDisplay();
        updateWelcomeHeader();
        
        // Update lobby status if still in lobby
        if (state.state === 0) { // GameState.Lobby
            const playerNames = state.players.map(p => p.name);
            updateLobbyStatus(state.players.length, playerNames);
        } else {
            // If game is active (not in lobby), show game board
            document.getElementById('lobby').style.display = 'none';
            document.getElementById('gameBoard').style.display = 'block';
            document.body.classList.add('in-game');
            
            // Hide main header and show small logo during gameplay
            const header = document.getElementById('gameHeader');
            if (header) header.style.display = 'none';
            const logo = document.getElementById('gameLogo');
            if (logo) logo.classList.remove('hidden');
            
            // Extract current player's data from game state (needed when rejoining mid-game)
            const currentPlayerData = state.players.find(p => p.connectionId === connection.connectionId);
            if (currentPlayerData) {
                // Set hand
                if (currentPlayerData.hand && Array.isArray(currentPlayerData.hand)) {
                    currentPlayer.hand = currentPlayerData.hand;
                    console.log("Restored hand on rejoin:", currentPlayer.hand);
                }
                
                // Set card czar status
                currentPlayer.isCardCzar = currentPlayerData.isCardCzar || false;
                
                // Restore selected cards and submission status from gameState.submittedCards
                if (state.submittedCards && state.submittedCards[connection.connectionId]) {
                    currentPlayer.selectedCards = state.submittedCards[connection.connectionId];
                    currentPlayer.hasSubmitted = true;
                    console.log("Restored selected cards on rejoin:", currentPlayer.selectedCards);
                }
            }
        }
        
        updateGameDisplay();
        renderHand(); // Render hand after restoring data (needed when rejoining mid-game)
        updateShareLink(); // Call after updateGameDisplay to ensure state is ready
    });

    connection.on("GameStarted", () => {
        console.log("Game started!");
        document.getElementById('lobby').style.display = 'none';
        document.getElementById('gameBoard').style.display = 'block';
        document.body.classList.add('in-game');
        
        // Hide main header and show small logo during gameplay
        const header = document.getElementById('gameHeader');
        if (header) header.style.display = 'none';
        const logo = document.getElementById('gameLogo');
        if (logo) logo.classList.remove('hidden');
        
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
        if (isDuplicateNameError(message)) {
            const modal = document.getElementById('nameEntryModal');
            if (modal && !modal.classList.contains('hidden')) {
                setNameError('modal');
            } else {
                setNameError('main');
            }
                hasJoinedRoom = false;
                currentRoomId = '';
                currentPlayerName = '';
                enableJoinControls();
                updateWelcomeHeader();
                document.getElementById('roomIdDisplay').textContent = '';
                return;
        }

        if (typeof message === 'string' && message.toLowerCase().includes('player name is required')) {
            const modal = document.getElementById('nameEntryModal');
            if (modal && !modal.classList.contains('hidden')) {
                setNameError('modal', 'Please enter your name.');
            } else {
                setNameError('main', 'Please enter your name.');
            }
            return;
        }

        showError(message);
    });

    connection.on("PlayerLeftMidGame", (playerName, leftConnectionId, creatorConnectionId) => {
        console.log("Player left mid-game:", playerName);
        console.log("Current connection ID:", connection.connectionId);
        console.log("Creator connection ID:", creatorConnectionId);
        
        const isCreator = connection.connectionId === creatorConnectionId;
        console.log("Is current player the creator?", isCreator);
        
        if (isCreator) {
            // Show creator modal with action buttons
            console.log("Showing creator modal");
            const nameEl = document.getElementById('leftPlayerNameCreator');
            const waitNameEl = document.getElementById('waitPlayerName');
            const modalEl = document.getElementById('playerLeftCreatorModal');
            console.log("Name element found:", !!nameEl);
            console.log("Modal element found:", !!modalEl);
            
            if (nameEl) nameEl.textContent = playerName;
            if (waitNameEl) waitNameEl.textContent = playerName;
            if (modalEl) {
                modalEl.classList.remove('hidden');
                console.log("Modal classes:", modalEl.className);
            }
        } else {
            // Show non-creator modal (waiting message)
            console.log("Showing non-creator modal");
            const nameEl = document.getElementById('leftPlayerName');
            const modalEl = document.getElementById('playerLeftModal');
            console.log("Name element found:", !!nameEl);
            console.log("Modal element found:", !!modalEl);
            
            if (nameEl) nameEl.textContent = playerName;
            if (modalEl) {
                modalEl.classList.remove('hidden');
                console.log("Modal classes:", modalEl.className);
            }
        }
    });

    connection.on("PlayerRejoinedMidGame", (playerName) => {
        console.log("Player rejoined mid-game:", playerName);
        const modal1 = document.getElementById('playerLeftModal');
        const modal2 = document.getElementById('playerLeftCreatorModal');
        console.log("playerLeftModal element found:", !!modal1);
        console.log("playerLeftCreatorModal element found:", !!modal2);
        
        if (modal1) {
            console.log("Modal 1 before - hidden?", modal1.classList.contains('hidden'));
            modal1.classList.add('hidden');
            console.log("Modal 1 after - hidden?", modal1.classList.contains('hidden'));
        }
        if (modal2) {
            console.log("Modal 2 before - hidden?", modal2.classList.contains('hidden'));
            modal2.classList.add('hidden');
            console.log("Modal 2 after - hidden?", modal2.classList.contains('hidden'));
        }
        
        showStatus(`${playerName} has returned! Game continues...`);
    });

    connection.on("WaitingForPlayerReturn", () => {
        console.log("Waiting for player to return");
        if (document.getElementById('playerLeftCreatorModal').classList.contains('hidden') === false) {
            // Update creator modal to show waiting status
            document.getElementById('playerLeftCreatorModal').classList.add('hidden');
        }
    });

    connection.on("RoundRestarted", () => {
        console.log("Round restarted");
        currentPlayer.selectedCards = [];
        currentPlayer.hasSubmitted = false;
        hideWinnerDisplay();
        hideNextRoundButton();
        updateRoundDisplay();
        updateWelcomeHeader();
        document.getElementById('playerLeftModal').classList.add('hidden');
        document.getElementById('playerLeftCreatorModal').classList.add('hidden');
        showStatus("Round restarted!");
    });

    connection.on("GameRestarted", () => {
        console.log("Game restarted");
        currentPlayer.selectedCards = [];
        currentPlayer.hasSubmitted = false;
        roundNumber = 1;
        hideWinnerDisplay();
        hideNextRoundButton();
        updateRoundDisplay();
        updateWelcomeHeader();
        document.getElementById('playerLeftModal').classList.add('hidden');
        document.getElementById('playerLeftCreatorModal').classList.add('hidden');
        showStatus("Game restarted!");
    });

    connection.on("NotEnoughPlayersAfterLeave", (leftPlayerName, remainingPlayerCount, creatorConnectionId) => {
        console.log("Not enough players left:", leftPlayerName, "Remaining:", remainingPlayerCount);
        
        if (connection.connectionId === creatorConnectionId) {
            // Show creator modal with wait/quit options
            document.getElementById('leftPlayerNameCreatorNotEnough').textContent = leftPlayerName;
            document.getElementById('remainingPlayerCountCreator').textContent = remainingPlayerCount;
            document.getElementById('waitPlayerName2').textContent = leftPlayerName;
            document.getElementById('notEnoughPlayersCreatorModal').classList.remove('hidden');
        } else {
            // Show non-creator modal (waiting message)
            document.getElementById('leftPlayerNameNotEnough').textContent = leftPlayerName;
            document.getElementById('remainingPlayerCount').textContent = remainingPlayerCount;
            document.getElementById('notEnoughPlayersModal').classList.remove('hidden');
        }
    });

    connection.on("ReturningToLobby", () => {
        console.log("Returning to lobby to wait for more players");
        closeAllModals();
        document.getElementById('lobby').style.display = 'block';
        document.getElementById('gameBoard').style.display = 'none';
        document.body.classList.remove('in-game');
        
        // Show header and hide logo when returning to lobby
        const header = document.getElementById('gameHeader');
        if (header) header.style.display = '';
        const logo = document.getElementById('gameLogo');
        if (logo) logo.classList.add('hidden');
        
        showStatus("Returning to lobby to wait for more players...");
    });

    connection.on("GameQuit", (message) => {
        console.log("Game quit:", message);
        closeAllModals();
        showError(message);
        // Reset state and return to join screen
        hasJoinedRoom = false;
        currentRoomId = '';
        currentPlayerName = '';
        roomCreatorId = '';
        document.body.classList.remove('in-game');
        document.body.classList.remove('czar-active');
        enableJoinControls();
        document.getElementById('lobby').style.display = 'block';
        document.getElementById('gameBoard').style.display = 'none';
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
            document.body.classList.remove('in-game');
            document.body.classList.remove('czar-active');
            document.getElementById('gameBoard').style.display = 'none';
            document.getElementById('lobby').style.display = 'block';
            document.getElementById('lobbyStatus').innerHTML = '';
            document.getElementById('roundsSelector').classList.add('hidden');
            closeRoundsModal();
            document.getElementById('shareLinkSection').classList.add('hidden');
            updateWelcomeHeader();
            enableJoinControls();
            
            // Clear room parameter from URL to prevent rejoining deleted room
            window.history.replaceState({}, document.title, window.location.pathname);
            joinedViaLink = false;
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
    document.getElementById('notificationArea').appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function setNameError(target, message) {
    const errorText = message || 'Name already taken. Please choose another.';
    if (target === 'modal') {
        const modalError = document.getElementById('nameErrorModal');
        const modalInput = document.getElementById('modalPlayerName');
        if (modalError && modalInput) {
            modalError.textContent = errorText;
            modalError.classList.remove('hidden');
            modalInput.classList.add('input-error');
        }
        return;
    }

    const mainError = document.getElementById('nameErrorMain');
    const mainInput = document.getElementById('playerName');
    if (mainError && mainInput) {
        mainError.textContent = errorText;
        mainError.classList.remove('hidden');
        mainInput.classList.add('input-error');
    }
}

function clearNameError(target) {
    if (target === 'modal') {
        const modalError = document.getElementById('nameErrorModal');
        const modalInput = document.getElementById('modalPlayerName');
        if (modalError && modalInput) {
            modalError.textContent = '';
            modalError.classList.add('hidden');
            modalInput.classList.remove('input-error');
        }
        return;
    }

    const mainError = document.getElementById('nameErrorMain');
    const mainInput = document.getElementById('playerName');
    if (mainError && mainInput) {
        mainError.textContent = '';
        mainError.classList.add('hidden');
        mainInput.classList.remove('input-error');
    }
}

function setRoomIdError(message) {
    const errorText = message || 'Please enter a valid Room ID';
    const roomIdError = document.getElementById('roomIdErrorMain');
    const roomIdInput = document.getElementById('roomId');
    if (roomIdError && roomIdInput) {
        roomIdError.textContent = errorText;
        roomIdError.classList.remove('hidden');
        roomIdInput.classList.add('input-error');
    }
}

function clearRoomIdError() {
    const roomIdError = document.getElementById('roomIdErrorMain');
    const roomIdInput = document.getElementById('roomId');
    if (roomIdError && roomIdInput) {
        roomIdError.textContent = '';
        roomIdError.classList.add('hidden');
        roomIdInput.classList.remove('input-error');
    }
}

function getJoinErrorMessage(err) {
    if (!err) {
        return '';
    }

    if (typeof err.message === 'string') {
        return err.message;
    }

    if (typeof err.toString === 'function') {
        return err.toString();
    }

    return '';
}

function isDuplicateNameError(message) {
    if (!message) {
        return false;
    }

    const normalizedMessage = message.toLowerCase();
    return /name\s+already\s+taken/.test(normalizedMessage)
        || /already\s+taken/.test(normalizedMessage)
        || /name\s+already/.test(normalizedMessage);
}

function isNegativeRoomId(roomId) {
    const numeric = Number(roomId);
    return Number.isFinite(numeric) && numeric < 0;
}

function validateRoomId(roomId) {
    if (!roomId) {
        setRoomIdError("Please enter a room ID");
        return false;
    }

    if (!/^\d+$/.test(roomId)) {
        setRoomIdError("Room ID must be a positive number");
        return false;
    }

    const numeric = Number(roomId);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        setRoomIdError("Room ID must be a positive number");
        return false;
    }

    return true;
}

async function joinRoom() {
    const playerName = document.getElementById('playerName').value.trim();
    const roomId = document.getElementById('roomId').value.trim();

    clearNameError('main');
    clearNameError('modal');
    clearRoomIdError();

    if (!playerName) {
        setNameError('main', 'Please enter your name.');
        return false;
    }

    if (!validateRoomId(roomId)) {
        return false;
    }


    try {
        await connection.invoke("JoinRoom", roomId, playerName);
            // Only set these after successful join
            currentRoomId = roomId;
            currentPlayerName = playerName;
            document.getElementById('roomIdDisplay').textContent = roomId;
        // Mark as joined and disable controls
        hasJoinedRoom = true;
        disableJoinControls();
        updateWelcomeHeader();
        updateShareLink(); // Show share link even if GameStateUpdated hasn't fired yet
        // The PlayerJoined event will handle updating the lobby status and button
        return true;
    } catch (err) {
        console.error("Error joining room:", err);
        // Extract the error message from the server response
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
            return;
        }

        showError(errorMessage);
    }

    return false;
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
    document.body.classList.remove('in-game');

    // Show header and hide logo when leaving room
    const header = document.getElementById('gameHeader');
    if (header) header.style.display = '';
    const logo = document.getElementById('gameLogo');
    if (logo) logo.classList.add('hidden');
    
    console.log("Left room");
}

async function handleWait() {
    if (!currentRoomId) return;

    try {
        await connection.invoke("WaitForPlayerReturn", currentRoomId);
        console.log("Waiting for player to return");
    } catch (err) {
        console.error("Error waiting for player return:", err);
        showError(err.message || "Failed to wait for player");
    }
}

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

async function handleRestartGame() {
    if (!currentRoomId) return;

    try {
        await connection.invoke("RestartGame", currentRoomId);
        console.log("Game restarted by room creator");
    } catch (err) {
        console.error("Error restarting game:", err);
        showError(err.message || "Failed to restart game");
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

async function handleQuitGame() {
    if (!currentRoomId) return;

    try {
        await connection.invoke("QuitGame", currentRoomId);
        console.log("Game quit by room creator");
    } catch (err) {
        console.error("Error quitting game:", err);
        showError(err.message || "Failed to quit game");
    }
}

function closeAllModals() {
    document.getElementById('playerLeftModal').classList.add('hidden');
    document.getElementById('playerLeftCreatorModal').classList.add('hidden');
    document.getElementById('notEnoughPlayersModal').classList.add('hidden');
    document.getElementById('notEnoughPlayersCreatorModal').classList.add('hidden');
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

    updateCzarTheme();
}

function updateCzarTheme() {
    document.body.classList.toggle('czar-active', currentPlayer.isCardCzar);
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

function getPlayerSubmissionCount() {
    if (!gameState) return { total: 0, submitted: 0, remaining: 0 };
    
    // Count total players who need to submit (everyone except the Card Czar)
    const totalPlayers = gameState.players.length - 1; // Exclude Card Czar
    
    // Count players who have submitted (check if they have selectedCardIds)
    const submittedPlayers = gameState.players.filter(p => !p.isCardCzar && p.selectedCardIds && p.selectedCardIds.length > 0).length;
    
    return {
        total: totalPlayers,
        submitted: submittedPlayers,
        remaining: totalPlayers - submittedPlayers
    };
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
                const playerCount = getPlayerSubmissionCount();
                if (playerCount.remaining > 0) {
                    showStatus(`You are the Card Czar! Waiting for ${playerCount.remaining} out of ${playerCount.total} player${playerCount.total !== 1 ? 's' : ''} to submit...`);
                } else {
                    showStatus("You are the Card Czar! All players have submitted. Time to choose!");
                }
            } else if (currentPlayer.hasSubmitted) {
                const playerCount = getPlayerSubmissionCount();
                showStatus(`Cards submitted! Waiting for ${playerCount.remaining} out of ${playerCount.total} player${playerCount.total !== 1 ? 's' : ''}...`);
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
            renderWinningBlackCard(gameState.winningPlayerId);
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

    // Collect all card groups
    const groupsData = [];
    Object.entries(gameState.submittedCards).forEach(([playerId, cardIds]) => {
        const player = gameState.players.find(p => p.connectionId === playerId);
        const cards = [];
        
        if (Array.isArray(cardIds)) {
            cardIds.forEach(cardId => {
                const card = player?.hand?.find(c => c.id === cardId);
                if (card) {
                    cards.push(card);
                }
            });
        }
        
        if (cards.length > 0) {
            groupsData.push({ playerId, cards });
        }
    });

    // Shuffle groups if Czar to hide player identity
    if (currentPlayer.isCardCzar) {
        for (let i = groupsData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [groupsData[i], groupsData[j]] = [groupsData[j], groupsData[i]];
        }
    }

    // Display card groups (shuffled for Czar)
    groupsData.forEach(({ playerId, cards }) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'submitted-card-group';

        cards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card white-card mini-card';
            cardDiv.textContent = card.text;
            groupDiv.appendChild(cardDiv);
        });

        if (currentPlayer.isCardCzar) {
            groupDiv.onclick = () => selectWinner(playerId);
            groupDiv.style.cursor = 'pointer';
        } else {
            groupDiv.style.cursor = 'default';
        }

        container.appendChild(groupDiv);
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
    const parts = text.split(/_{2,}/);
    const escapeHtml = (value) => value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    let html = '';

    if (parts.length > 1) {
        parts.forEach((part, index) => {
            let normalizedPart = part;
            if (index > 0) {
                const trimmedLeading = part.replace(/^\s+/, '');
                if (/^[.,!?]/.test(trimmedLeading)) {
                    normalizedPart = trimmedLeading;
                } else {
                    normalizedPart = part.replace(/^\s+/, ' ');
                }
            }
            html += escapeHtml(normalizedPart);
            if (index < answers.length) {
                html += `<span class="black-card-answer">${escapeHtml(answers[index])}</span>`;
            }
        });
    } else if (answers.length > 0) {
        html += escapeHtml(text);
        html += ` <span class="black-card-answer">${escapeHtml(answers.join(' / '))}</span>`;
    } else {
        html += escapeHtml(text);
    }

    blackCardEl.innerHTML = `<span class="black-card-text">${html}</span>`;
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
    
    // Check if current player is the room creator
    const isRoomCreator = connection && connection.connectionId === roomCreatorId;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '15px';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.marginTop = '20px';
    
    if (isRoomCreator) {
        // Room creator sees both options
        const playAgainButton = document.createElement('button');
        playAgainButton.className = 'btn-primary';
        playAgainButton.textContent = 'Play Again';
        playAgainButton.onclick = () => handleRestartGame();
        
        const leaveButton = document.createElement('button');
        leaveButton.className = 'btn-danger';
        leaveButton.textContent = 'Leave Room';
        leaveButton.onclick = () => leaveRoom();
        
        buttonContainer.appendChild(playAgainButton);
        buttonContainer.appendChild(leaveButton);
    } else {
        // Non-creators see a single button
        const button = document.createElement('button');
        button.className = 'btn-primary';
        button.textContent = 'Return to Lobby';
        button.onclick = () => location.reload();
        
        buttonContainer.appendChild(button);
    }
    
    display.appendChild(h2);
    display.appendChild(p);
    display.appendChild(buttonContainer);
}

function hideGameOver() {
    document.getElementById('gameOverDisplay').classList.add('hidden');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeConnection();
    checkUrlForRoom();

    const mainNameInput = document.getElementById('playerName');
    if (mainNameInput) {
        mainNameInput.addEventListener('input', () => clearNameError('main'));
    }

    const modalNameInput = document.getElementById('modalPlayerName');
    if (modalNameInput) {
        modalNameInput.addEventListener('input', () => clearNameError('modal'));
    }

    const roomIdInput = document.getElementById('roomId');
    if (roomIdInput) {
        roomIdInput.addEventListener('input', () => clearRoomIdError());
    }
});

// Warn players if they try to leave during an active game
window.addEventListener('beforeunload', (e) => {
    // Only warn if in an active game (not in lobby)
    if (gameState && gameState.state !== 0 && hasJoinedRoom) {
        // Modern browsers ignore the message and show their own, but we return it for compatibility
        const warningMessage = 'You are in the middle of a game. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = warningMessage;
        return warningMessage;
    }
});

function checkUrlForRoom() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId) {
        if (isNegativeRoomId(roomId)) {
            joinedViaLink = false;
            document.getElementById('roomId').value = '';
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

let modalRoomId = null; // Store the room ID for modal joins

function showNameEntryModal(roomId) {
    const modal = document.getElementById('nameEntryModal');
    const input = document.getElementById('modalPlayerName');
    if (modal && input) {
        modalRoomId = roomId; // Store the room ID for later use
        clearNameError('modal');
        modal.classList.remove('hidden');
        input.focus();
        
        // Allow Enter key to submit
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                confirmNameEntryFromModal();
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

function confirmNameEntryFromModal() {
    confirmNameEntry(modalRoomId);
}

async function confirmNameEntry(roomId) {
    const nameInput = document.getElementById('modalPlayerName');
    const playerName = nameInput.value.trim();
    
    if (!playerName) {
        setNameError('modal', 'Please enter your name.');
        return;
    }

    clearNameError('modal');
    
    currentPlayerName = playerName;
    document.getElementById('playerName').value = playerName;
    
    // If roomId was provided (joining via link), proceed to join
    // Try to join - if it fails, modal stays open so they can retry with different name
    if (roomId) {
        const joinSucceeded = await joinRoom();
        // Only close modal if join was successful
        if (joinSucceeded) {
            closeNameEntryModal();
            nameInput.value = '';
            modalRoomId = null;
        }
    } else {
        // Fresh start - modal can close
        closeNameEntryModal();
    }
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
    
    // Show share link whenever we have a room ID and have joined, and either:
    // - gameState exists and we're in lobby, OR
    // - gameState doesn't exist yet but we just joined (it will arrive shortly)
    if (hasJoinedRoom && currentRoomId && (!gameState || gameState.state === 0)) {
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
