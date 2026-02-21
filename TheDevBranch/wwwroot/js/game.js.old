// Game State
let connection;
let currentRoomId = '';
let currentConnectionId = '';
let roomCreatorId = '';
let isDemoMode = false;
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
        console.log("[RoomCreated] Room created with ID:", roomId);
        hasJoinedRoom = true;
        currentRoomId = roomId;
        document.getElementById('roomIdDisplay').textContent = roomId;
        showLobbyStatus(`Room ${roomId} created! Waiting for players...`);
        updateShareLink();
    });

    connection.on("DemoModeEnabled", () => {
        console.log("[DemoModeEnabled] Demo mode activated");
        isDemoMode = true;
        // In demo mode, current player is the room creator
        roomCreatorId = connection.connectionId;
        showDemoControls();
        // Show rounds selector modal immediately (don't wait for gameState)
        openRoundsModal();
        hasPromptedRounds = false; // Ensure we can prompt
    });

    connection.on("PlayerJoined", (playerName, playerCount, playerNames) => {
        console.log("Player joined:", playerName, "Total players:", playerCount);
        showPlayerJoinedMessage(playerName);
        updateLobbyStatus(playerCount, playerNames);
        // Ensure hasJoinedRoom is set (for regular joinRoom calls that don't get RoomCreated event)
        if (!hasJoinedRoom && currentRoomId) {
            hasJoinedRoom = true;
        }
        updateWelcomeHeader();
    });

    connection.on("PlayerLeft", (playerName, playerCount, playerNames) => {
        console.log("Player left:", playerName, "Total players:", playerCount);
        showPlayerLeftMessage(playerName);
        updateLobbyStatus(playerCount, playerNames);
        updateWelcomeHeader();
    });

    connection.on("RoomCreatorLeft", (creatorName) => {
        console.log("Room creator left:", creatorName);
        showError(`${creatorName} (room creator) left the game. Returning to lobby...`);
        
        // Reset game state
        hasJoinedRoom = false;
        currentRoomId = null;
        gameState = null;
        roundNumber = 0;
        totalRounds = 7;
        
        // Hide game board and show lobby
        const lobbyEl = document.getElementById('lobby');
        const gameBoardEl = document.getElementById('gameBoard');
        const headerEl = document.getElementById('gameHeader');
        const logoEl = document.getElementById('gameLogo');

        if (gameBoardEl) {
            gameBoardEl.classList.add('hidden');
            gameBoardEl.style.display = 'none';
        }

        if (lobbyEl) {
            lobbyEl.classList.remove('hidden');
            lobbyEl.style.display = 'block';
        }

        if (headerEl) headerEl.style.display = 'block';
        if (logoEl) logoEl.classList.add('hidden');
        document.body.classList.remove('in-game');

        hideGameOver();
        
        // Reset join controls
        enableJoinControls();
        document.getElementById('leaveRoomBtn').classList.add('hidden');
        updateWelcomeHeader();

        const lobbyStatus = document.getElementById('lobbyStatus');
        if (lobbyStatus) {
            lobbyStatus.innerHTML = '';
            lobbyStatus.classList.add('hidden');
        }

        const shareLinkSection = document.getElementById('shareLinkSection');
        if (shareLinkSection) {
            shareLinkSection.classList.add('hidden');
        }
        
        // Clear any notifications
        document.getElementById('notificationArea').innerHTML = '';
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
        updateTestPlayersList(); // Update demo controls if in demo mode
        updateDemoPlayerSwitcherPanel(); // Update floating panel if in demo mode during gameplay
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
        
        // Show demo player switcher panel if in demo mode
        if (isDemoMode) {
            showDemoPlayerSwitcherPanel();
        }
        
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
            const restartGameBtn = document.getElementById('restartGameBtn');
            const exitGameBtn = document.getElementById('exitGameBtn');
            console.log("Name element found:", !!nameEl);
            console.log("Modal element found:", !!modalEl);
            
            if (nameEl) nameEl.textContent = playerName;
            if (waitNameEl) waitNameEl.textContent = playerName;
            
            // Check if there are enough players to restart (need at least 3 remaining for a 3-player minimum game)
            // Subtract 1 because the player who left is still in the gameState.players array at this point
            const remainingPlayers = (gameState?.players?.length || 0) - 1;
            const hasEnoughPlayers = remainingPlayers >= 3;
            
            console.log("Players in gameState:", gameState?.players?.length, "Remaining after leave:", remainingPlayers, "Enough to restart?", hasEnoughPlayers);
            
            // Show restart game if enough players, otherwise show exit game
            if (hasEnoughPlayers) {
                restartGameBtn?.classList.remove('hidden');
                exitGameBtn?.classList.add('hidden');
            } else {
                restartGameBtn?.classList.add('hidden');
                exitGameBtn?.classList.remove('hidden');
            }
            
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
        
        // Clear lobby status to remove old player list
        const lobbyStatus = document.getElementById('lobbyStatus');
        if (lobbyStatus) {
            lobbyStatus.innerHTML = '';
        }
        
        // Hide share link section
        document.getElementById('shareLinkSection').classList.add('hidden');
        
        // Update welcome header to hide it
        updateWelcomeHeader();
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

    connection.on("ReceiveTakedown", (senderName, takedownMessage) => {
        showTakedownNotification(senderName, takedownMessage);
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
    
    let message = `<h3>👥 Players in room: ${playerCount}</h3>`;
    
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
    if (lobbyStatus) {
        lobbyStatus.classList.remove('hidden');
    }
    
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
    const lobbyStatus = document.getElementById('lobbyStatus');
    lobbyStatus.innerHTML = `<p>${message}</p>`;
    lobbyStatus.classList.remove('hidden');
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

function showStatus(message, isWinner = false) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    if (isWinner) {
        statusEl.classList.add('status-winner');
    } else {
        statusEl.classList.remove('status-winner');
    }
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
    const errorText = message || 'Please enter a valid Room code';
    const roomIdError = document.getElementById('roomIdErrorMain');
    const roomCodeInput = document.getElementById('roomCode');
    if (roomIdError && roomCodeInput) {
        roomIdError.textContent = errorText;
        roomIdError.classList.remove('hidden');
        roomCodeInput.classList.add('input-error');
    }
}

function clearRoomIdError() {
    const roomIdError = document.getElementById('roomIdErrorMain');
    const roomCodeInput = document.getElementById('roomCode');
    if (roomIdError && roomCodeInput) {
        roomIdError.textContent = '';
        roomIdError.classList.add('hidden');
        roomCodeInput.classList.remove('input-error');
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

function validateRoomId(roomCode) {
    if (!roomCode) {
        setRoomIdError("Please enter a room code");
        return false;
    }

    const code = roomCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(code)) {
        setRoomIdError("Room code must be exactly 5 alphanumeric characters");
        return false;
    }

    return true;
}

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
        // Call CreateRoom with player name - server auto-generates room code
        await connection.invoke("CreateRoom", playerName);
        console.log("[createRoom] CreateRoom invoke succeeded");
        
        currentPlayerName = playerName;
        // The RoomCreated and PlayerJoined events will update the UI
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
    // Use passed parameter (from share link) or read from input field (manual entry)
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
        // Set the room ID for regular join rooms (server may override if DEMO mode)
        currentRoomId = roomCode;
        await connection.invoke("JoinRoom", roomCode, playerName);
        // RoomCreated event will override currentRoomId if DEMO mode is detected
        hasJoinedRoom = true;
        disableJoinControls();
        updateWelcomeHeader();
        // The RoomCreated event will set currentRoomId and show the share link
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
    document.getElementById('roomCode').parentElement.classList.add('hidden');
    document.querySelector('.room-options').classList.add('hidden');
    document.getElementById('leaveRoomBtn').classList.remove('hidden');
}

function enableJoinControls() {
    document.getElementById('playerName').parentElement.classList.remove('hidden');
    document.getElementById('roomCode').parentElement.classList.remove('hidden');
    document.querySelector('.room-options').classList.remove('hidden');
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
        updateWelcomeHeader();
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
        // Deselect the card
        currentPlayer.selectedCards = currentPlayer.selectedCards.filter(id => id !== cardId);
    } else {
        if (currentPlayer.selectedCards.length >= pickCount) {
            // For single card selection, replace the current card
            if (pickCount === 1) {
                currentPlayer.selectedCards = [cardId];
            } else {
                showError(`You can only select ${pickCount} card${pickCount !== 1 ? 's' : ''}`);
                return;
            }
        } else {
            currentPlayer.selectedCards.push(cardId);
        }
    }

    renderHand();
    updateBlackCardWithSelection();
    updateSubmitButtonState();
    updateGameStateUI();
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
        // Always pass currentConnectionId as the third parameter
        // This works for both demo mode and normal mode
        await connection.invoke("SubmitCards", currentRoomId, currentPlayer.selectedCards, currentConnectionId);
        currentPlayer.hasSubmitted = true;
        renderHand();
        updateGameStateUI();
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
        // Always pass currentConnectionId as the third parameter
        // This works for both demo mode (when currentConnectionId differs from connection.connectionId)
        // and normal mode (when they're the same, it just gets ignored on the server)
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

function updateGameDisplay() {
    if (!gameState) return;

    // Update players
    renderPlayers();

    // Update black card with any current selections
    updateBlackCardWithSelection();

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
        
        // Make the entire card clickable if it's not the current player
        if (player.connectionId !== connection.connectionId) {
            playerCard.classList.add('clickable');
            playerCard.style.cursor = 'pointer';
            playerCard.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendRandomTakedown(player.connectionId);
            };
        }
        
        container.appendChild(playerCard);

        // Check if this is the current player (use currentConnectionId to support demo mode player switching)
        if (player.connectionId === currentConnectionId) {
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
        cardDiv.dataset.cardId = card.id;
        
        if (currentPlayer.selectedCards.includes(card.id)) {
            cardDiv.classList.add('selected');
        }
        
        if (currentPlayer.isCardCzar || currentPlayer.hasSubmitted) {
            cardDiv.classList.add('submitted');
        } else {
            // Submit card on click
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
                const selectedCount = currentPlayer.selectedCards.length;
                
                if (selectedCount > 0 && selectedCount === pickCount) {
                    // User has selected the right number of cards but hasn't submitted
                    showStatus("Click the Submit button to confirm your choice!");
                } else if (selectedCount > 0 && pickCount > 1) {
                    // User has selected some cards but needs more
                    showStatus(`Select ${pickCount - selectedCount} more card${pickCount - selectedCount !== 1 ? 's' : ''}, then click Submit!`);
                } else if (pickCount > 1) {
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

    updateSubmittedCardsPresentation();
}

function renderSubmittedCards() {
    const section = document.getElementById('submittedCardsSection');
    const container = document.getElementById('submittedCardsContainer');
    const title = document.getElementById('submittedCardsTitle');
    
    section.classList.remove('hidden', 'submitted-cards-collapsed', 'submitted-cards-placeholder');
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

    // Always show submit button for players during Playing state
    button.classList.remove('hidden');
    button.disabled = currentPlayer.hasSubmitted || currentPlayer.selectedCards.length !== pickCount;
}

function hideSubmittedCards() {
    const section = document.getElementById('submittedCardsSection');
    if (!section) return;

    section.classList.remove('hidden', 'submitted-cards-placeholder');
    section.classList.add('submitted-cards-collapsed');
}

function updateSubmittedCardsPresentation() {
    const cardsWrapper = document.querySelector('.cards-display-wrapper');
    const section = document.getElementById('submittedCardsSection');
    if (!cardsWrapper || !section || !gameState) return;

    const shouldPlaceholder =
        gameState.state === 1 && !currentPlayer.isCardCzar && currentPlayer.hasSubmitted;

    if (shouldPlaceholder) {
        // First set to collapsed (0 width) for animation start state
        section.classList.remove('hidden', 'submitted-cards-placeholder');
        section.classList.add('submitted-cards-collapsed');
        cardsWrapper.classList.add('awaiting-judging');
        
        // Use requestAnimationFrame twice to ensure browser paints the collapsed state
        // before expanding to placeholder state, triggering the smooth animation
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                section.classList.remove('submitted-cards-collapsed');
                section.classList.add('submitted-cards-placeholder');
            });
        });
    } else if (gameState.state !== 2) {
        // Remove animation state and hide section completely
        cardsWrapper.classList.remove('awaiting-judging');
        section.classList.remove('submitted-cards-collapsed', 'submitted-cards-placeholder');
        section.classList.add('hidden');
    } else {
        // In judging state, keep awaiting-judging for consistent positioning
        cardsWrapper.classList.add('awaiting-judging');
    }
}

function renderBlackCardHtml(text, answers, includeBlankPlaceholders = false) {
    const parts = text.split(/_{2,}/);
    const escapeHtml = (value) => value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    let html = '';

    if (parts.length > 1) {
        // Card with blank(s) - split on blanks
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
            
            // Add answer or blank placeholder
            if (index < parts.length - 1) {
                if (index < answers.length) {
                    html += `<span class="black-card-answer">${escapeHtml(answers[index])}</span>`;
                } else if (includeBlankPlaceholders) {
                    html += '<span class="black-card-blank">____</span>';
                }
            }
        });
    } else if (answers.length > 0) {
        // No blanks in text - join answers with " / "
        html += escapeHtml(text);
        html += ` <span class="black-card-answer">${escapeHtml(answers.join(' / '))}</span>`;
    } else {
        // No answers yet
        html += escapeHtml(text);
    }

    return html;
}

function updateBlackCardWithSelection() {
    const blackCardEl = document.getElementById('blackCard');
    if (!blackCardEl || !gameState?.currentBlackCard) return;

    // Get selected cards text for the currently controlled player
    const selectedAnswers = [];
    const controlledPlayer = gameState?.players?.find(p => p.connectionId === currentConnectionId);
    const controlledHand = controlledPlayer?.hand || currentPlayer.hand || [];
    const submittedCardIds = gameState?.submittedCards?.[currentConnectionId] || [];
    const selectedCardIds = currentPlayer.selectedCards.length > 0
        ? currentPlayer.selectedCards
        : submittedCardIds;

    if (selectedCardIds.length > 0) {
        selectedCardIds.forEach(cardId => {
            const card = controlledHand.find(c => c.id === cardId);
            if (card) selectedAnswers.push(card.text);
        });
    }

    const text = gameState.currentBlackCard.text || '';
    const html = renderBlackCardHtml(text, selectedAnswers, true);
    blackCardEl.innerHTML = `<span class="black-card-text">${html}</span>`;
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

function showWinnerDisplay(winnerName) {
    showStatus(`🎉 ${winnerName} won this round! 🎉`, true);
}

function hideWinnerDisplay() {
    // Winner display now reuses status message, so just remove winner styling
    const statusMsg = document.getElementById('statusMessage');
    statusMsg.classList.remove('status-winner');
    
    // Remove the next round button if it exists
    const existingBtn = document.getElementById('nextRoundBtn');
    if (existingBtn) {
        existingBtn.remove();
    }
}

function showNextRoundButton() {
    if (currentPlayer.isCardCzar) {
        const statusMsg = document.getElementById('statusMessage');
        
        // Only add button if it doesn't already exist
        if (!document.getElementById('nextRoundBtn')) {
            const btn = document.createElement('button');
            btn.id = 'nextRoundBtn';
            btn.className = 'btn-primary next-round-btn-inline';
            btn.textContent = 'Next Round';
            btn.onclick = nextRound;
            statusMsg.appendChild(btn);
        }
    }
}

function hideNextRoundButton() {
    const btn = document.getElementById('nextRoundBtn');
    if (btn) {
        btn.remove();
    }
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
    initializeHowToPlayCollapse();

    const mainNameInput = document.getElementById('playerName');
    if (mainNameInput) {
        mainNameInput.addEventListener('input', () => clearNameError('main'));
    }

    const modalNameInput = document.getElementById('modalPlayerName');
    if (modalNameInput) {
        modalNameInput.addEventListener('input', () => clearNameError('modal'));
    }

    const roomCodeInput = document.getElementById('roomCode');
    if (roomCodeInput) {
        roomCodeInput.addEventListener('input', () => clearRoomIdError());
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
    const roomCode = urlParams.get('room');
    
    if (roomCode) {
        // Validate format is 5-char alphanumeric
        if (!validateRoomId(roomCode)) {
            joinedViaLink = false;
            document.getElementById('roomCode').value = '';
            return;
        }

        joinedViaLink = true;
        // Don't populate the input field - we'll use the room code directly from URL
        // Hide player name input so user focuses on the modal instead
        document.getElementById('playerName').parentElement.classList.add('hidden');
        document.querySelector('.room-options').classList.add('hidden');
        showNameEntryModal(roomCode);
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

async function confirmNameEntry(roomCode) {
    const nameInput = document.getElementById('modalPlayerName');
    const playerName = nameInput.value.trim();
    
    if (!playerName) {
        setNameError('modal', 'Please enter your name.');
        return;
    }

    clearNameError('modal');
    
    currentPlayerName = playerName;
    document.getElementById('playerName').value = playerName;
    
    // If roomCode was provided (joining via link), proceed to join with that room code
    // Try to join - if it fails, modal stays open so they can retry with different name
    if (roomCode) {
        const joinSucceeded = await joinRoom(roomCode);
        // Only close modal if join was successful
        if (joinSucceeded) {
            // Ensure welcome header is displayed
            updateWelcomeHeader();
            closeNameEntryModal();
            nameInput.value = '';
            modalRoomId = null;
            // Scroll to top so user sees the welcome header
            setTimeout(() => window.scrollTo(0, 0), 100);
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
    
    console.log("[updateShareLink] hasJoinedRoom:", hasJoinedRoom, "currentRoomId:", currentRoomId, "gameState:", gameState);
    
    // Show share link whenever we have a room ID and have joined
    // - gameState doesn't exist yet, OR
    // - gameState exists and we're in lobby (state === 0), OR
    // - gameState exists and it's a non-lobby state (allow sharing anytime once in a room)
    if (hasJoinedRoom && currentRoomId) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
        shareLinkInput.value = shareUrl;
        shareLinkSection.classList.remove('hidden');
        console.log("[updateShareLink] SHOWING share link:", shareUrl);
    } else {
        shareLinkSection.classList.add('hidden');
        console.log("[updateShareLink] HIDING share link");
    }
}

function updateWelcomeHeader() {
    const welcomeHeader = document.getElementById('welcomeHeader');
    
    if (hasJoinedRoom && currentRoomId) {
        const playerCount = gameState?.players?.length || 0;
        const playerNameToShow = currentPlayerName || document.getElementById('playerName').value.trim();
        
        let html = `<div class="welcome-line-1">Welcome <strong>${playerNameToShow}</strong> to Room <strong>${currentRoomId}</strong></div>`;
        html += `<div class="welcome-line-2">Players in room: <strong>${playerCount}</strong>`;
        
        // Add round info based on game state
        if (gameState && gameState.state === 0) { // In lobby
            html += ` | <strong>${totalRounds}</strong> rounds`;
        }
        html += `</div>`;
        
        if (gameState && gameState.state !== 0) { // Game is active
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

// Easter Egg: Takedown Functions
function sendRandomTakedown(targetPlayerId) {
    if (!currentRoomId || !gameState) return;
    
    // Server will select a random takedown
    connection.invoke("SendTakedown", currentRoomId, targetPlayerId)
        .catch(err => console.error("Error sending takedown:", err));
}

function showTakedownNotification(senderName, takedownMessage) {
    const notifArea = document.getElementById('notificationArea');
    
    const notification = document.createElement('div');
    notification.className = 'takedown-notification';
    notification.innerHTML = `<strong>${senderName}</strong> roasted you: <em>"${takedownMessage}"</em>`;
    
    notifArea.appendChild(notification);
    
    // Remove after 8 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 8000);
}

// Demo Mode Controls
const testPlayerNamePool = [
    // Diverse mix of names from various cultures and backgrounds
    "Aisha", "Carlos", "Dmitri", "Elena", "Fatima", "Giovanni", "Hassan",
    "Ingrid", "Jamal", "Keiko", "Liam", "Mei", "Nadia", "Oscar", "Priya",
    "Quinn", "Raj", "Sofia", "Tariq", "Uma", "Viktor", "Wei", "Xena",
    "Yuki", "Zara", "Amir", "Briana", "Chen", "Diego", "Emeka", "Freya",
    "Gabriel", "Hana", "Ivan", "Jin", "Keira", "Lars", "Maya", "Nia",
    "Omar", "Petra", "Rashid", "Sasha", "Tenzin", "Ula", "Vera", "Wang",
    "Yara", "Zeke", "Amara", "Bruno", "Camila", "Dev", "Esther", "Felix"
];

const MAX_ROOM_PLAYERS = 10;
const MAX_BUTTON_SLOTS = 6;

let availableTestPlayerNames = [];
let usedTestPlayerNames = new Set();

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
    // Initialize the names pool with the correct number of slots
    const slotsAvailable = getAvailableSlots();
    initializeTestPlayerNames(slotsAvailable);
    
    // Create demo controls section
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
    
    // Find lobby element and append demo section
    const lobby = document.getElementById('lobby');
    if (lobby) {
        const startGameBtn = document.getElementById('startGameBtn');
        if (startGameBtn) {
            startGameBtn.parentElement.insertBefore(demoSection, startGameBtn);
        } else {
            lobby.appendChild(demoSection);
        }
    }
    
    // Create buttons for test players
    const buttonContainer = document.getElementById('testPlayerButtons');
    availableTestPlayerNames.forEach(name => {
        createTestPlayerButton(name, buttonContainer);
    });
    
    updateTestPlayersList();
}

async function addTestPlayerAndRefresh(playerName, button) {
    // Add the player
    await addTestPlayer(playerName);
    
    // Remove the button
    const buttonContainer = document.getElementById('testPlayerButtons');
    if (button && buttonContainer) {
        button.remove();
        
        // Remove from available names
        const index = availableTestPlayerNames.indexOf(playerName);
        if (index > -1) {
            availableTestPlayerNames.splice(index, 1);
        }
        
        // Check if we should add a new button based on room capacity
        const slotsAvailable = getAvailableSlots();
        const currentButtonCount = buttonContainer.children.length;
        
        // Only add a new button if we're still under the capacity
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
    // Only allow in demo mode
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
    // Only allow in demo mode
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
        
        // Make this name available again in the pool
        usedTestPlayerNames.delete(playerName);
        
        // When a player is removed, we might be able to add a button back
        const buttonContainer = document.getElementById('testPlayerButtons');
        if (buttonContainer) {
            const slotsAvailable = getAvailableSlots();
            const currentButtonCount = buttonContainer.children.length;
            
            // If we have room for more buttons, add one
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
    // Only update test players list in demo mode
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
    
    // Only allow switching in demo mode
    if (!isDemoMode) {
        console.warn(`[switchToPlayer] Attempted to switch outside demo mode`);
        showError("Player switching is only available in demo mode");
        return;
    }
    
    if (!gameState) {
        console.warn(`[switchToPlayer] gameState is not set`);
        return;
    }
    
    // Find the player (can be test player or real player in demo mode)
    const targetPlayer = gameState.players.find(p => p.name === testPlayerName);
    console.log(`[switchToPlayer] Found player: ${targetPlayer ? targetPlayer.name : 'NOT FOUND'}, isCardCzar: ${targetPlayer ? targetPlayer.isCardCzar : 'N/A'}`);
    
    if (!targetPlayer) {
        console.error(`Player ${testPlayerName} not found in gameState`);
        showError(`Could not find player: ${testPlayerName}`);
        return;
    }
    
    // Check if this player has submitted cards
    const hasSubmittedCards = gameState.submittedCards && gameState.submittedCards[targetPlayer.connectionId];
    const submittedCards = hasSubmittedCards ? gameState.submittedCards[targetPlayer.connectionId] : [];
    
    // Switch current player context to this player
    currentPlayer = {
        hand: targetPlayer.hand || [],
        isCardCzar: targetPlayer.isCardCzar || false,
        selectedCards: submittedCards,
        hasSubmitted: !!hasSubmittedCards
    };
    currentPlayerName = testPlayerName;
    currentConnectionId = targetPlayer.connectionId; // Update connection ID to match the player we're controlling
    
    console.log(`[switchToPlayer] Successfully switched to: ${testPlayerName}, isCardCzar: ${targetPlayer.isCardCzar}, hasSubmitted: ${currentPlayer.hasSubmitted}`);
    updateWelcomeHeader();
    updateGameDisplay(); // Re-render the entire game board for this player's perspective
    renderHand();
    updateDemoPlayerSwitcherPanel(); // Update the panel to highlight current player
    
    // Show a notification
    showStatus(`Now controlling: ${testPlayerName} ${targetPlayer.isCardCzar ? '(Card Czar)' : ''}`);
}

let isDemoPanelMinimized = localStorage.getItem('demoPanelMinimized') === 'true';

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
    // Only show in demo mode
    if (!isDemoMode) return;
    
    // Remove existing panel if any
    const existing = document.getElementById('demoPlayerSwitcherPanel');
    if (existing) existing.remove();
    
    // Create floating panel
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
    
    // Header
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
    
    // Players container
    const playersContainer = document.createElement('div');
    playersContainer.id = 'demoPanelPlayers';
    playersContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 6px;
    `;
    panel.appendChild(playersContainer);
    
    // Add to page
    document.body.appendChild(panel);
    
    // Apply minimized state and update the player list
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

// How to Play Toggle Functions
function initializeHowToPlayCollapse() {
    // Collapse by default on all screen sizes
    collapseHowToPlay();
}

function toggleHowToPlay() {
    const btn = document.getElementById('howToPlayBtn');
    const content = document.getElementById('howToPlayContent');
    
    if (btn && content) {
        btn.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
    }
}

function collapseHowToPlay() {
    const btn = document.getElementById('howToPlayBtn');
    const content = document.getElementById('howToPlayContent');
    
    if (btn && content) {
        btn.classList.add('collapsed');
        content.classList.add('collapsed');
    }
}

function expandHowToPlay() {
    const btn = document.getElementById('howToPlayBtn');
    const content = document.getElementById('howToPlayContent');
    
    if (btn && content) {
        btn.classList.remove('collapsed');
        content.classList.remove('collapsed');
    }
}
