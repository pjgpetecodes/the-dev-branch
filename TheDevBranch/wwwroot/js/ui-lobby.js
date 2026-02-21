// Lobby UI Functions

function updateLobbyStatus(playerCount, playerNames) {
    const remaining = Math.max(0, MIN_PLAYERS_TO_START - playerCount);
    
    let message = `<h3>👥 Players in room: ${playerCount}</h3>`;
    
    if (playerNames && playerNames.length > 0) {
        message += '<ul class="lobby-player-list">';
        playerNames.forEach(name => {
            message += `<li>👤 ${name}</li>`;
        });
        message += '</ul>';
    }
    
    // Show/enable start game button for room creator with enough players
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn && hasJoinedRoom) {
        const isCreator = currentConnectionId === roomCreatorId;
        if (isCreator) {
            if (playerCount >= MIN_PLAYERS_TO_START) {
                startGameBtn.disabled = false;
            } else {
                startGameBtn.disabled = true;
            }
        }
    }
    
    if (playerCount < MIN_PLAYERS_TO_START) {
        message += `<p>Waiting for ${remaining} more player${remaining !== 1 ? 's' : ''}...</p>`;
    } else {
        message += `<p class="ready-status">Ready to start!</p>`;
    }
    
    const lobbyStatus = document.getElementById('lobbyStatus');
    if (lobbyStatus) {
        lobbyStatus.classList.remove('hidden');
    }
    
    const notifications = Array.from(lobbyStatus.querySelectorAll('.player-join-notification'));
    lobbyStatus.innerHTML = message;
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
    
    setTimeout(() => {
        messageDiv.classList.add('fade-out');
        setTimeout(() => messageDiv.remove(), 500);
    }, 3000);
}

function disableJoinControls() {
    document.getElementById('playerName').parentElement.classList.add('hidden');
    document.getElementById('roomCode').parentElement.classList.add('hidden');
    document.querySelector('.room-tabs-container').classList.add('hidden');
    document.getElementById('leaveRoomBtn').classList.remove('hidden');
    // Show start game container only for room creator
    if (currentConnectionId === roomCreatorId) {
        document.getElementById('startGameContainer')?.classList.remove('hidden');
    }
}

function enableJoinControls() {
    document.getElementById('playerName').parentElement.classList.remove('hidden');
    document.getElementById('roomCode').parentElement.classList.remove('hidden');
    document.querySelector('.room-tabs-container').classList.remove('hidden');
    document.getElementById('leaveRoomBtn').classList.add('hidden');
    document.getElementById('startGameContainer')?.classList.add('hidden');
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

function updateShareLink() {
    const shareLinkSection = document.getElementById('shareLinkSection');
    const shareLinkInput = document.getElementById('shareLinkInput');
    
    console.log("[updateShareLink] hasJoinedRoom:", hasJoinedRoom, "currentRoomId:", currentRoomId, "gameState:", gameState);
    
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

function updateWelcomeHeader() {
    const welcomeHeader = document.getElementById('welcomeHeader');
    
    if (hasJoinedRoom && currentRoomId) {
        const playerCount = gameState?.players?.length || 0;
        const playerNameToShow = currentPlayerName || document.getElementById('playerName').value.trim();
        
        let html = `<div class="welcome-line-1">Welcome <strong>${playerNameToShow}</strong> to Room <strong>${currentRoomId}</strong></div>`;
        html += `<div class="welcome-line-2">Players in room: <strong>${playerCount}</strong>`;
        
        if (gameState && gameState.state === 0) {
            html += ` | <strong>${totalRounds}</strong> rounds`;
        }
        html += `</div>`;
        
        if (gameState && gameState.state !== 0) {
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
