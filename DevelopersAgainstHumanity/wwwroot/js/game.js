// Game State
let connection;
let currentRoomId = '';
let currentPlayer = {
    hand: [],
    isCardCzar: false,
    selectedCard: null
};
let gameState = null;
let roundNumber = 1;

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

    connection.on("PlayerJoined", (playerName) => {
        console.log("Player joined:", playerName);
        showLobbyStatus(`${playerName} joined the room!`);
    });

    connection.on("GameStateUpdated", (state) => {
        console.log("Game state updated:", state);
        gameState = state;
        updateGameDisplay();
    });

    connection.on("GameStarted", () => {
        console.log("Game started!");
        document.getElementById('lobby').style.display = 'none';
        document.getElementById('gameBoard').style.display = 'block';
        showStatus("Game started! Get ready to play!");
    });

    connection.on("HandUpdated", (hand) => {
        console.log("Hand updated:", hand);
        currentPlayer.hand = hand;
        renderHand();
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
        roundNumber++;
        document.getElementById('roundNumber').textContent = roundNumber;
        currentPlayer.selectedCard = null;
        hideWinnerDisplay();
        hideNextRoundButton();
    });

    connection.on("Error", (message) => {
        console.error("Error:", message);
        showError(message);
    });

    // Start connection
    try {
        await connection.start();
        console.log("SignalR Connected");
    } catch (err) {
        console.error("SignalR Connection Error:", err);
        showError("Failed to connect to game server. Please refresh the page.");
    }
}

// UI Functions
function showLobbyStatus(message) {
    document.getElementById('lobbyStatus').innerHTML = `<p>${message}</p>`;
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

async function joinRoom() {
    const playerName = document.getElementById('playerName').value.trim();
    const roomId = document.getElementById('roomId').value.trim();

    if (!playerName) {
        showError("Please enter your name");
        return;
    }

    if (!roomId) {
        showError("Please enter a room ID");
        return;
    }

    currentRoomId = roomId;
    document.getElementById('roomIdDisplay').textContent = roomId;

    try {
        await connection.invoke("JoinRoom", roomId, playerName);
        showLobbyStatus(`Joined room ${roomId}! Waiting for game to start...`);
        
        // Enable the Start Game button after joining
        document.getElementById('startGameBtn').disabled = false;
    } catch (err) {
        console.error("Error joining room:", err);
        showError("Failed to join room");
    }
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

    try {
        currentPlayer.selectedCard = cardId;
        await connection.invoke("SubmitCard", currentRoomId, cardId);
        renderHand(); // Re-render to show selected state
        showStatus("Card submitted! Waiting for other players...");
    } catch (err) {
        console.error("Error submitting card:", err);
        showError(err.message || "Failed to submit card");
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
        container.innerHTML = '<p style="color: #fff;">No cards yet...</p>';
        return;
    }

    currentPlayer.hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card white-card mini-card';
        cardDiv.textContent = card.text;
        
        if (card.id === currentPlayer.selectedCard) {
            cardDiv.classList.add('selected');
        }
        
        if (currentPlayer.isCardCzar || currentPlayer.selectedCard) {
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
            } else if (currentPlayer.selectedCard) {
                showStatus("Card submitted! Waiting for other players...");
            } else {
                showStatus("Select a card from your hand to play!");
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

    Object.entries(gameState.submittedCards).forEach(([playerId, cardId]) => {
        const player = gameState.players.find(p => p.connectionId === playerId);
        const card = player?.hand?.find(c => c.id === cardId);
        
        if (card) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card white-card mini-card';
            cardDiv.textContent = card.text;
            
            // Only Card Czar can click to select winner
            if (currentPlayer.isCardCzar) {
                cardDiv.onclick = () => selectWinner(playerId);
                cardDiv.style.cursor = 'pointer';
            } else {
                cardDiv.style.cursor = 'default';
            }
            
            container.appendChild(cardDiv);
        }
    });
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
});
