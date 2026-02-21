// SignalR Event Handlers

function initializeSignalREvents() {
    // Room events
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
        roomCreatorId = connection.connectionId;
        showDemoControls();
        openRoundsModal();
        hasPromptedRounds = false;
    });

    // Player join/leave events
    connection.on("PlayerJoined", (playerName, playerCount, playerNames) => {
        console.log("Player joined:", playerName, "Total players:", playerCount);
        showPlayerJoinedMessage(playerName);
        updateLobbyStatus(playerCount, playerNames);
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

        if (headerEl) headerEl.style.display = 'none';
        if (logoEl) logoEl.classList.add('hidden');
        document.body.classList.remove('in-game');
        document.body.classList.remove('czar-active');
        document.getElementById('leaveGameBtn')?.classList.add('hidden');

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
        
        document.getElementById('notificationArea').innerHTML = '';
    });

    // Game state events
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
        
        if (state.state === 0) { // GameState.Lobby
            const playerNames = state.players.map(p => p.name);
            updateLobbyStatus(state.players.length, playerNames);
            document.getElementById('leaveGameBtn')?.classList.add('hidden');
        } else {
            // Game is active - show game board
            document.getElementById('lobby').style.display = 'none';
            document.getElementById('gameBoard').style.display = 'block';
            document.body.classList.add('in-game');
            document.getElementById('leaveGameBtn')?.classList.remove('hidden');
            
            // Hide main header and show small logo during gameplay
            const header = document.getElementById('gameHeader');
            if (header) header.style.display = 'none';
            const logo = document.getElementById('gameLogo');
            if (logo) logo.classList.remove('hidden');
            
            // Extract current player's data from game state
            const activeConnectionId = isDemoMode ? currentConnectionId : connection.connectionId;
            const currentPlayerData = state.players.find(p => p.connectionId === activeConnectionId);
            if (currentPlayerData) {
                if (currentPlayerData.hand && Array.isArray(currentPlayerData.hand)) {
                    currentPlayer.hand = currentPlayerData.hand;
                    console.log("Restored hand on rejoin:", currentPlayer.hand);
                }
                
                currentPlayer.isCardCzar = currentPlayerData.isCardCzar || false;
                
                // Restore selected cards and submission status
                if (state.submittedCards && state.submittedCards[activeConnectionId]) {
                    const submitted = state.submittedCards[activeConnectionId];
                    currentPlayer.selectedCards = resolveSelectedCards(submitted, currentPlayerData.hand);
                    currentPlayer.hasSubmitted = true;
                    console.log("Restored selected cards on rejoin:", currentPlayer.selectedCards);
                } else {
                    // Only reset if we haven't started selecting yet, otherwise preserve client-side selections
                    currentPlayer.hasSubmitted = false;
                    // Don't reset selectedCards here - preserve client-side selections made before GameStateUpdated arrived
                }
            }
        }
        
        updateGameDisplay();
        renderHand();
        updateShareLink();
        updateTestPlayersList();
        updateDemoPlayerSwitcherPanel();
    });

    connection.on("GameStarted", () => {
        console.log("Game started!");
        document.getElementById('lobby').style.display = 'none';
        document.getElementById('gameBoard').style.display = 'block';
        document.body.classList.add('in-game');
        document.getElementById('leaveGameBtn')?.classList.remove('hidden');
        
        const header = document.getElementById('gameHeader');
        if (header) header.style.display = 'none';
        const logo = document.getElementById('gameLogo');
        if (logo) logo.classList.remove('hidden');
        
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

    // Error handling
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

    // Mid-game player events
    connection.on("PlayerLeftMidGame", (playerName, leftConnectionId, creatorConnectionId) => {
        console.log("Player left mid-game:", playerName);
        console.log("Current connection ID:", connection.connectionId);
        console.log("Creator connection ID:", creatorConnectionId);
        
        const isCreator = connection.connectionId === creatorConnectionId;
        console.log("Is current player the creator?", isCreator);
        
        // Reset czar styling in case Card Czar left
        document.body.classList.remove('czar-active');
        
        if (isCreator) {
            console.log("Showing creator modal");
            const nameEl = document.getElementById('leftPlayerNameCreator');
            const waitNameEl = document.getElementById('waitPlayerName');
            const modalEl = document.getElementById('playerLeftCreatorModal');
            const restartGameBtn = document.getElementById('restartGameBtn');
            const exitGameBtn = document.getElementById('exitGameBtn');
            
            if (nameEl) nameEl.textContent = playerName;
            if (waitNameEl) waitNameEl.textContent = playerName;
            
            const remainingPlayers = (gameState?.players?.length || 0) - 1;
            const hasEnoughPlayers = remainingPlayers >= 3;
            
            console.log("Players in gameState:", gameState?.players?.length, "Remaining after leave:", remainingPlayers, "Enough to restart?", hasEnoughPlayers);
            
            if (hasEnoughPlayers) {
                restartGameBtn?.classList.remove('hidden');
                exitGameBtn?.classList.add('hidden');
            } else {
                restartGameBtn?.classList.add('hidden');
                exitGameBtn?.classList.remove('hidden');
            }
            
            if (modalEl) {
                modalEl.classList.remove('hidden');
            }
        } else {
            console.log("Showing non-creator modal");
            const nameEl = document.getElementById('leftPlayerName');
            const modalEl = document.getElementById('playerLeftModal');
            
            if (nameEl) nameEl.textContent = playerName;
            if (modalEl) {
                modalEl.classList.remove('hidden');
            }
        }
    });

    connection.on("PlayerRejoinedMidGame", (playerName) => {
        console.log("Player rejoined mid-game:", playerName);
        const modal1 = document.getElementById('playerLeftModal');
        const modal2 = document.getElementById('playerLeftCreatorModal');
        
        if (modal1) modal1.classList.add('hidden');
        if (modal2) modal2.classList.add('hidden');
        
        showStatus(`${playerName} has returned! Game continues...`);
    });

    connection.on("WaitingForPlayerReturn", () => {
        console.log("Waiting for player to return");
        if (document.getElementById('playerLeftCreatorModal').classList.contains('hidden') === false) {
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
        document.body.classList.remove('czar-active');
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
        document.body.classList.remove('czar-active');
        showStatus("Game restarted!");
    });

    connection.on("NotEnoughPlayersAfterLeave", (leftPlayerName, remainingPlayerCount, creatorConnectionId) => {
        console.log("Not enough players left:", leftPlayerName, "Remaining:", remainingPlayerCount);
        
        // Reset czar styling in case Card Czar left
        document.body.classList.remove('czar-active');
        
        if (connection.connectionId === creatorConnectionId) {
            document.getElementById('leftPlayerNameCreatorNotEnough').textContent = leftPlayerName;
            document.getElementById('remainingPlayerCountCreator').textContent = remainingPlayerCount;
            document.getElementById('waitPlayerName2').textContent = leftPlayerName;
            document.getElementById('notEnoughPlayersCreatorModal').classList.remove('hidden');
        } else {
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
        document.getElementById('leaveGameBtn')?.classList.add('hidden');
        
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
        hasJoinedRoom = false;
        currentRoomId = '';
        currentPlayerName = '';
        roomCreatorId = '';
        document.body.classList.remove('in-game');
        document.body.classList.remove('czar-active');
        enableJoinControls();
        document.getElementById('lobby').style.display = 'block';
        document.getElementById('gameBoard').style.display = 'none';
        document.getElementById('leaveGameBtn')?.classList.add('hidden');
        
        const lobbyStatus = document.getElementById('lobbyStatus');
        if (lobbyStatus) {
            lobbyStatus.innerHTML = '';
        }
        
        document.getElementById('shareLinkSection').classList.add('hidden');
        updateWelcomeHeader();
    });

    connection.on("RoomDeleted", (message) => {
        console.log("Room deleted:", message);
        hideIdleWarningModal();
        showError(message);
        setTimeout(() => {
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
            
            document.body.classList.remove('in-game');
            document.body.classList.remove('czar-active');
            document.getElementById('gameBoard').style.display = 'none';
            document.getElementById('lobby').style.display = 'block';
            document.getElementById('leaveGameBtn')?.classList.add('hidden');
            document.getElementById('lobbyStatus').innerHTML = '';
            document.getElementById('roundsSelector').classList.add('hidden');
            closeRoundsModal();
            document.getElementById('shareLinkSection').classList.add('hidden');
            updateWelcomeHeader();
            enableJoinControls();
            
            window.history.replaceState({}, document.title, window.location.pathname);
            joinedViaLink = false;
        }, 2000);
    });

    // Idle warning events
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

    // Takedown events
    connection.on("ReceiveTakedown", (senderName, takedownMessage) => {
        showTakedownNotification(senderName, takedownMessage);
    });
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
    if (!currentRoomId) return;
    try {
        await connection.invoke("ExtendRoomIdle", currentRoomId);
        hideIdleWarningModal();
    } catch (err) {
        console.error("Error extending room idle:", err);
    }
}
