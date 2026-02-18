// Game Board UI Functions

function renderPlayers() {
    const playersContainer = document.getElementById('playersContainer');
    if (!playersContainer) return;
    if (!gameState) return;

    playersContainer.innerHTML = '';

    gameState.players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'player-card';

        if (player.isCardCzar) {
            div.classList.add('czar');
        }

        let statusIcon = '';
        
        if (gameState.state === 1) {
            if (player.isCardCzar) {
                statusIcon = '👑';
            } else if (player.selectedCardIds && player.selectedCardIds.length > 0) {
                statusIcon = '✅';
            } else {
                statusIcon = '⏳';
            }
        } else if (gameState.state === 2) {
            if (player.isCardCzar) {
                statusIcon = '👑';
            } else {
                statusIcon = '⏳';
            }
        }

        const score = typeof player.score === 'number' ? player.score : 0;

        div.innerHTML = `
            <div class="player-name-row">
                <span class="player-status-icon">${statusIcon}</span>
                <span class="player-name">${escapeHtml(player.name)}</span>
            </div>
            <div class="player-score">${score} ${score === 1 ? 'pt' : 'pts'}</div>
        `;

        playersContainer.appendChild(div);

        if (player.connectionId !== currentConnectionId) {
            div.classList.add('clickable');
            div.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                sendRandomTakedown(player.connectionId);
            };
        }

        if (player.connectionId === currentConnectionId) {
            currentPlayer.isCardCzar = player.isCardCzar || false;
            currentPlayer.isRoomCreator = player.connectionId === roomCreatorId;
        }
    });
}

function updateCzarTheme(isCurrentPlayerCzar) {
    if (isCurrentPlayerCzar) {
        document.body.classList.add('czar-active');
    } else {
        document.body.classList.remove('czar-active');
    }
}

function renderHand() {
    const handEl = document.getElementById('handContainer');
    if (!handEl) return;
    handEl.innerHTML = '';

    if (!currentPlayer.hand || currentPlayer.hand.length === 0) {
        if (currentPlayer.isCardCzar) {
            handEl.innerHTML = '<p class="czar-wait-message">You are the Card Czar this round! 👑<br/>Waiting for other players to submit...</p>';
        } else {
            handEl.innerHTML = '<p>No cards in your hand</p>';
        }
        return;
    }

    currentPlayer.hand.forEach(card => {
        const div = document.createElement('div');
        div.className = 'card white-card mini-card';
        div.dataset.id = card.id;
        div.textContent = card.text;

        const isSelected = currentPlayer.selectedCards.some(c => c.id === card.id);
        if (isSelected) {
            div.classList.add('selected');
        }

        if (currentPlayer.isCardCzar || currentPlayer.hasSubmitted) {
            div.classList.add('submitted');
        } else {
            div.onclick = () => selectWhiteCard(card);
        }
        handEl.appendChild(div);
    });
}

function renderBlackCard() {
    const blackCardEl = document.getElementById('blackCard');
    if (!blackCardEl) return;

    if (!gameState?.currentBlackCard) {
        blackCardEl.textContent = 'Waiting for next round...';
        return;
    }

    const blackCard = gameState.currentBlackCard;
    const pickCount = blackCard.pickCount ?? blackCard.pick ?? 1;

    const answers = [];
    const includeBlankPlaceholders = true;
    
    const html = renderBlackCardHtml(blackCard.text, answers, includeBlankPlaceholders);
    blackCardEl.innerHTML = html;

    const pickInfo = document.getElementById('pickInfo');
    if (pickInfo) {
        pickInfo.textContent = pickCount > 1 ? `Pick ${pickCount}` : '';
    }
}

function updateBlackCardWithSelection() {
    const blackCardEl = document.getElementById('blackCard');
    if (!blackCardEl) return;
    if (!gameState?.currentBlackCard) return;

    const blackCard = gameState.currentBlackCard;
    const pickCount = blackCard.pickCount ?? blackCard.pick ?? 1;

    const answers = currentPlayer.selectedCards
        .map(card => {
            if (!card) return null;
            if (typeof card === 'string') {
                const match = currentPlayer.hand.find(handCard => handCard.id === card);
                return match ? match.text : null;
            }
            return card.text;
        })
        .filter(Boolean);

    const limitedAnswers = answers.slice(0, pickCount);
    const includeBlankPlaceholders = (pickCount > limitedAnswers.length);
    const html = renderBlackCardHtml(blackCard.text, limitedAnswers, includeBlankPlaceholders);
    blackCardEl.innerHTML = html;
}

function renderSubmittedCards() {
    const section = document.getElementById('submittedCardsSection');
    const subsEl = document.getElementById('submittedCardsContainer');
    if (!subsEl) return;
    subsEl.innerHTML = '';

    if (section) {
        section.classList.remove('hidden', 'submitted-cards-collapsed', 'submitted-cards-placeholder');
    }

    const isPlayingPhase = gameState?.state === 1;
    const isJudgingPhase = gameState?.state >= 2;
    const playerHasSubmitted = currentPlayer.hasSubmitted && !currentPlayer.isCardCzar;
    const anyPlayerSubmitted = gameState?.submittedCards && Object.keys(gameState.submittedCards).length > 0;
    
    // Show submissions to czar, during judging/later states, or to anyone during playing phase if someone submitted
    const shouldShowSubmissions = currentPlayer.isCardCzar || isJudgingPhase || (isPlayingPhase && anyPlayerSubmitted);
    
    if (!shouldShowSubmissions || !gameState?.submittedCards || Object.keys(gameState.submittedCards).length === 0) {
        subsEl.innerHTML = '<p>No submissions yet</p>';
        if (section && !shouldShowSubmissions) {
            section.classList.add('hidden');
        }
        return;
    }

    const submittedTitle = document.getElementById('submittedCardsTitle');
    if (submittedTitle) {
        submittedTitle.textContent = currentPlayer.isCardCzar ? 'Select the Winner:' : 'Submitted Cards:';
    }

    const groupsData = [];
    const playersWhoSubmitted = new Set(Object.keys(gameState.submittedCards));
    
    // First, add current player's own cards if they have submitted and are not the czar
    if (currentPlayer.hasSubmitted && !currentPlayer.isCardCzar && (isPlayingPhase || isJudgingPhase)) {
        if (currentPlayer.selectedCards && currentPlayer.selectedCards.length > 0) {
            groupsData.push({ 
                playerId: currentConnectionId, 
                cards: currentPlayer.selectedCards, 
                isPlaceholder: false,
                isCurrentPlayerCard: true
            });
        }
    }
    
    // Then add other players' cards from the submittedCards dict
    Object.entries(gameState.submittedCards).forEach(([playerId, cardIds]) => {
        // Skip if this is the current player (already added above)
        if (playerId === currentConnectionId) {
            return;
        }
        
        const player = gameState.players.find(p => p.connectionId === playerId);
        const isCurrentPlayer = playerId === currentConnectionId;
        const revealCards = isJudgingPhase || currentPlayer.isCardCzar || (isPlayingPhase && isCurrentPlayer);
        
        const cards = [];

        if (revealCards && Array.isArray(cardIds)) {
            cardIds.forEach(cardId => {
                const card = player?.hand?.find(c => c.id === cardId);
                if (card) {
                    cards.push(card);
                }
            });
        }
        
        if (revealCards && cards.length > 0) {
            groupsData.push({ playerId, cards, isPlaceholder: false });
        } else if (isPlayingPhase && !isCurrentPlayer) {
            // Show placeholder for other players who submitted during playing phase
            groupsData.push({ playerId, cards: [], isPlaceholder: true, cardCount: Array.isArray(cardIds) ? cardIds.length : 1 });
        }
    });
    
    if (currentPlayer.isCardCzar && isJudgingPhase) {
        for (let i = groupsData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [groupsData[i], groupsData[j]] = [groupsData[j], groupsData[i]];
        }
    }

    groupsData.forEach(({ playerId, cards, isPlaceholder, cardCount, isCurrentPlayerCard }) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'submitted-card-group';
        
        // Add player name/label if it's the current player
        if (isCurrentPlayerCard) {
            const labelDiv = document.createElement('div');
            labelDiv.style.textAlign = 'center';
            labelDiv.style.fontSize = '0.9em';
            labelDiv.style.color = '#999';
            labelDiv.style.marginBottom = '8px';
            labelDiv.textContent = '(Your submission)';
            groupDiv.appendChild(labelDiv);
        }

        if (isPlaceholder) {
            // Show placeholder cards with question mark
            for (let i = 0; i < cardCount; i++) {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'card white-card placeholder-card';
                cardDiv.textContent = '?';
                cardDiv.style.opacity = '0.6';
                cardDiv.style.backgroundColor = '#999';
                groupDiv.appendChild(cardDiv);
            }
        } else {
            cards.forEach(card => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'card white-card';
                cardDiv.textContent = card.text;
                groupDiv.appendChild(cardDiv);
            });
        }

        if (currentPlayer.isCardCzar && !isPlaceholder) {
            groupDiv.onclick = () => selectWinner(playerId);
            groupDiv.style.cursor = 'pointer';
        }

        subsEl.appendChild(groupDiv);
    });
}

function updateGameDisplay() {
    renderPlayers();
    
    // Show selected cards in black card preview if player has made selections
    if (currentPlayer.selectedCards.length > 0 && !currentPlayer.isCardCzar) {
        updateBlackCardWithSelection();
    } else {
        renderBlackCard();
    }
    
    renderHand();
    
    const isCurrentPlayerCzar = currentPlayer.isCardCzar;
    updateCzarTheme(isCurrentPlayerCzar);

    updateGameStateUI();
    updateSubmittedCardsPresentation();

    const submitBtn = document.getElementById('submitCardsBtn');
    if (submitBtn) {
        const requiredPick = gameState.currentBlackCard?.pickCount ?? gameState.currentBlackCard?.pick ?? 1;
        const selectedCount = currentPlayer.selectedCards.length;
        
        if (currentPlayer.isCardCzar || currentPlayer.hasSubmitted) {
            submitBtn.disabled = true;
            submitBtn.classList.add('hidden');
        } else if (selectedCount === requiredPick) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('hidden');
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.remove('hidden');
        }
    }
}

function updateGameStateUI() {
    if (!gameState) return;

    hideSubmittedCards();
    hideWinnerDisplay();
    hideNextRoundButton();
    hideGameOver();
    
    // Show black card container by default (will be hidden in GameOver state)
    const blackCardContainer = document.querySelector('.black-card-container');
    if (blackCardContainer) {
        blackCardContainer.classList.remove('hidden');
    }

    switch (gameState.state) {
        case 0:
            showStatus('Waiting in lobby...');
            hasShownDeciderAnnouncement = false;
            break;
        case 1: {
            // Check if this is a decider round - announce it once
            if (gameState.isDeciderRound && !hasShownDeciderAnnouncement) {
                showStatus('⚡ DECIDER ROUND ⚡ - This is the final round to break the tie!');
                hasShownDeciderAnnouncement = true;
            }
            
            if (currentPlayer.isCardCzar) {
                const playerCount = getPlayerSubmissionCount();
                if (playerCount.remaining > 0) {
                    showStatus(`You are the Card Czar! Waiting for ${playerCount.remaining} out of ${playerCount.total} player${playerCount.total !== 1 ? 's' : ''} to submit...`);
                } else {
                    showStatus('You are the Card Czar! All players have submitted. Time to choose!');
                }
                renderSubmittedCards(); // Card czar always sees submitted cards
            } else if (currentPlayer.hasSubmitted) {
                const playerCount = getPlayerSubmissionCount();
                showStatus(`Cards submitted! Waiting for ${playerCount.remaining} out of ${playerCount.total} player${playerCount.total !== 1 ? 's' : ''}...`);
                renderSubmittedCards(); // Show submitted cards while waiting for others
            } else {
                // Show submissions from other players even if current player hasn't submitted
                const hasAnySubmissions = gameState.submittedCards && Object.keys(gameState.submittedCards).length > 0;
                if (hasAnySubmissions) {
                    renderSubmittedCards(); // Show other players' placeholder cards
                }
                
                const pickCount = gameState?.currentBlackCard?.pickCount ?? gameState?.currentBlackCard?.pick ?? 1;
                const selectedCount = currentPlayer.selectedCards.length;

                if (selectedCount > 0 && selectedCount === pickCount) {
                    showStatus('Click the Submit button to confirm your choice!');
                } else if (selectedCount > 0 && pickCount > 1) {
                    showStatus(`Select ${pickCount - selectedCount} more card${pickCount - selectedCount !== 1 ? 's' : ''}, then click Submit!`);
                } else if (pickCount > 1) {
                    showStatus(`Select ${pickCount} cards from your hand to play!`);
                } else {
                    showStatus('Select a card from your hand to play!');
                }
            }
            break;
        }
        case 2:
            if (currentPlayer.isCardCzar) {
                showStatus('You are the Card Czar! Select the funniest card.');
            } else {
                showStatus('Card Czar is selecting the winner...');
            }
            hasShownDeciderAnnouncement = false;
            renderSubmittedCards();
            break;
        case 3: {
            hasShownDeciderAnnouncement = false;
            const winner = gameState.players.find(p => p.connectionId === gameState.winningPlayerId);
            if (winner) {
                showWinnerDisplay(winner.name, true); // Keep banner visible during RoundOver
            }
            if (gameState.winningPlayerId) {
                renderWinningBlackCard(gameState.winningPlayerId);
            }
            
            // Check if this is a final/decider round
            if (gameState.isDeciderRound) {
                if (currentPlayer.isRoomCreator) {
                    addStatusMessage('🏆 Final Round Complete! 🏆');
                    showDeciderRoundOptions();
                } else {
                    addStatusMessage('🏆 Final Round Complete! Waiting for room creator to decide... 🏆');
                }
            } else if (currentPlayer.isCardCzar) {
                showNextRoundButton();
            } else {
                if (winner) {
                    addStatusMessage(`Waiting for Card Czar to start the next round...`);
                } else {
                    addStatusMessage('Waiting for Card Czar to start the next round...');
                }
            }
            break;
        }
        case 4: {
            hasShownDeciderAnnouncement = false;
            const winners = [...gameState.players]
                .sort((a, b) => b.score - a.score);
            
            if (winners.length > 0) {
                // Show overall winner banner
                const overallWinner = winners[0];
                showWinnerDisplay(`${overallWinner.name} wins the game!`, true);
            }
            
            // Hide the black card container
            const blackCardContainer = document.querySelector('.black-card-container');
            if (blackCardContainer) {
                blackCardContainer.classList.add('hidden');
            }
            
            showGameOverPanel(winners.slice(0, 3));
            break;
        }
    }
}

function hideSubmittedCards() {
    const section = document.getElementById('submittedCardsSection');
    if (!section) return;

    section.classList.remove('submitted-cards-placeholder');
    section.classList.add('hidden', 'submitted-cards-collapsed');
    
    // Ensure wrapper is back to centered
    const cardsWrapper = document.querySelector('.cards-display-wrapper');
    if (cardsWrapper) {
        cardsWrapper.classList.remove('awaiting-judging');
    }
}

function updateSubmittedCardsPresentation() {
    const cardsWrapper = document.querySelector('.cards-display-wrapper');
    const section = document.getElementById('submittedCardsSection');
    if (!cardsWrapper || !section || !gameState) return;

    const hasSubmissions = gameState.submittedCards && Object.keys(gameState.submittedCards).length > 0;
    const shouldShowCards = gameState.state === 1 && !currentPlayer.isCardCzar && hasSubmissions;
    const isJudgingOrLater = gameState.state >= 2;

    if (shouldShowCards) {
        // Show cards while waiting for others to submit
        section.classList.remove('hidden', 'submitted-cards-collapsed', 'submitted-cards-placeholder');
        cardsWrapper.classList.add('awaiting-judging');
    } else if (isJudgingOrLater) {
        // Show all cards during judging phase
        cardsWrapper.classList.add('awaiting-judging');
        section.classList.remove('hidden', 'submitted-cards-collapsed', 'submitted-cards-placeholder');
    } else {
        // Hide completely when waiting for first card submission
        cardsWrapper.classList.remove('awaiting-judging');
        section.classList.add('hidden');
        section.classList.remove('submitted-cards-collapsed', 'submitted-cards-placeholder');
    }
}

function showNextRoundButton() {
    if (!currentPlayer.isCardCzar) {
        return;
    }

    const statusMsg = document.getElementById('statusMessage');
    if (!statusMsg) return;

    // Check if this is the last round or a decider round
    const isLastRound = gameState?.currentRound >= totalRounds;
    const isDecider = gameState?.isDeciderRound;
    const buttonText = isDecider ? 'Start Decider Round' : (isLastRound ? 'Show Scores' : 'Next Round');
    const buttonMessage = isDecider ? '⚡ It\'s a tie! Click to play the Decider Round!' : (isLastRound ? 'Click Show Scores to see final standings.' : 'You are the Card Czar! Click Next Round to continue.');

    let btn = document.getElementById('nextRoundBtn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'nextRoundBtn';
        btn.className = 'btn-primary next-round-btn-inline';
        btn.textContent = buttonText;
        btn.onclick = nextRound;
        
        // Add message if not already there
        if (!statusMsg.querySelector('.status-subtext')) {
            addStatusMessage(buttonMessage);
        }
        
        statusMsg.appendChild(btn);
    } else {
        btn.textContent = buttonText;
        btn.classList.remove('hidden');
    }
}


function showDeciderRoundOptions() {
    const statusMsg = document.getElementById('statusMessage');
    if (!statusMsg) return;

    // Clear any existing buttons
    const existingPlayAgainBtn = document.getElementById('playAgainBtn');
    const existingExitBtn = document.getElementById('exitGameBtn');
    if (existingPlayAgainBtn) existingPlayAgainBtn.remove();
    if (existingExitBtn) existingExitBtn.remove();

    // Create "Play Again" button
    const playAgainBtn = document.createElement('button');
    playAgainBtn.id = 'playAgainBtn';
    playAgainBtn.className = 'btn-primary next-round-btn-inline';
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.onclick = playAgain;
    statusMsg.appendChild(playAgainBtn);

    // Create "Exit" button
    const exitBtn = document.createElement('button');
    exitBtn.id = 'exitGameBtn';
    exitBtn.className = 'btn-secondary next-round-btn-inline';
    exitBtn.textContent = 'Exit';
    exitBtn.onclick = exitGame;
    statusMsg.appendChild(exitBtn);
}

function addStatusMessage(message) {
    const statusMsg = document.getElementById('statusMessage');
    if (!statusMsg) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'status-subtext';
    msgDiv.textContent = message;
    statusMsg.appendChild(msgDiv);
}

function showWinnerDisplay(winnerName, keepVisible = false) {
    const winnerSection = document.getElementById('winnerCard');
    if (winnerSection) {
        winnerSection.innerHTML = `<h2>🏆 ${winnerName} wins this round! 🏆</h2>`;
        winnerSection.classList.remove('hidden');

        if (!keepVisible) {
            setTimeout(() => {
                winnerSection.classList.add('hidden');
                if (gameState?.state === 1) {
                    updateGameDisplay();
                }
            }, 5000);
        }
        return;
    }

    // Fallback: create a styled winner banner in the status area
    const statusMsg = document.getElementById('statusMessage');
    if (!statusMsg) return;
    
    // Clear and create winner banner
    statusMsg.innerHTML = `<div class="winner-banner"><h2>🏆 ${winnerName} wins this round! 🏆</h2></div>`;
}

function showGameOverPanel(winners) {
    showStatus('🎉 Game Over! 🎉');
    
    const statusMsg = document.getElementById('statusMessage');
    if (!statusMsg) return;

    // Create a results div
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'game-over-results';
    resultsDiv.style.marginTop = '15px';
    
    let resultsHtml = '<h3>Final Standings:</h3>';
    winners.forEach((player, index) => {
        resultsHtml += `<p><strong>${index + 1}. ${player.name}</strong> - ${player.score} point${player.score !== 1 ? 's' : ''}</p>`;
    });
    
    resultsDiv.innerHTML = resultsHtml;
    statusMsg.appendChild(resultsDiv);
    
    // Add buttons for room creator
    if (currentPlayer.isRoomCreator) {
        // Clear any existing buttons
        const existingPlayAgainBtn = document.getElementById('playAgainBtn');
        const existingExitBtn = document.getElementById('exitGameBtn');
        if (existingPlayAgainBtn) existingPlayAgainBtn.remove();
        if (existingExitBtn) existingExitBtn.remove();

        // Create "Play Again" button
        const playAgainBtn = document.createElement('button');
        playAgainBtn.id = 'playAgainBtn';
        playAgainBtn.className = 'btn-primary next-round-btn-inline';
        playAgainBtn.textContent = 'Play Again';
        playAgainBtn.onclick = playAgain;
        statusMsg.appendChild(playAgainBtn);

        // Create "Exit" button
        const exitBtn = document.createElement('button');
        exitBtn.id = 'exitGameBtn';
        exitBtn.className = 'btn-secondary next-round-btn-inline';
        exitBtn.textContent = 'Exit';
        exitBtn.onclick = exitGame;
        statusMsg.appendChild(exitBtn);
    }
}

function showGameOver(winners) {
    const gameBoard = document.getElementById('gameBoard');
    const lobby = document.getElementById('lobby');
    gameBoard.classList.add('hidden');
    lobby.classList.remove('hidden');

    const lobbyStatus = document.getElementById('lobbyStatus');
    lobbyStatus.classList.remove('hidden');
    lobbyStatus.innerHTML = '<h2>🎉 Game Over! 🎉</h2>';

    winners.forEach((player, index) => {
        lobbyStatus.innerHTML += `<p><strong>${index + 1}. ${player.name}</strong> - ${player.score} point${player.score !== 1 ? 's' : ''}</p>`;
    });

    lobbyStatus.innerHTML += '<p>Waiting for room creator to decide what to do...</p>';
}

function showGameOverWithOptions(winners) {
    showStatus('🎉 Game Over! 🎉');
    
    const statusMsg = document.getElementById('statusMessage');
    if (!statusMsg) return;

    winners.forEach((player, index) => {
        statusMsg.innerHTML += `<p><strong>${index + 1}. ${player.name}</strong> - ${player.score} point${player.score !== 1 ? 's' : ''}</p>`;
    });

    // Clear any existing buttons
    const existingPlayAgainBtn = document.getElementById('playAgainBtn');
    const existingExitBtn = document.getElementById('exitGameBtn');
    if (existingPlayAgainBtn) existingPlayAgainBtn.remove();
    if (existingExitBtn) existingExitBtn.remove();

    // Create "Play Again" button
    const playAgainBtn = document.createElement('button');
    playAgainBtn.id = 'playAgainBtn';
    playAgainBtn.className = 'btn-primary next-round-btn-inline';
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.onclick = playAgain;
    statusMsg.appendChild(playAgainBtn);

    // Create "Exit" button
    const exitBtn = document.createElement('button');
    exitBtn.id = 'exitGameBtn';
    exitBtn.className = 'btn-secondary next-round-btn-inline';
    exitBtn.textContent = 'Exit';
    exitBtn.onclick = exitGame;
    statusMsg.appendChild(exitBtn);
}
