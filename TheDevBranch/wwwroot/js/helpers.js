// Helper Functions

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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

function getPlayerSubmissionCount() {
    if (!gameState) return { total: 0, submitted: 0, remaining: 0 };
    
    const totalPlayers = gameState.players.length - 1;
    const submittedPlayers = gameState.players.filter(p => !p.isCardCzar && p.selectedCardIds && p.selectedCardIds.length > 0).length;
    
    return {
        total: totalPlayers,
        submitted: submittedPlayers,
        remaining: totalPlayers - submittedPlayers
    };
}

function resolveSelectedCards(selectedCards, hand) {
    if (!Array.isArray(selectedCards)) {
        return [];
    }

    if (selectedCards.length === 0) {
        return [];
    }

    const allObjects = selectedCards.every(card => card && typeof card === 'object');
    if (allObjects) {
        return selectedCards;
    }

    const handCards = Array.isArray(hand) ? hand : [];
    return selectedCards
        .map(cardId => handCards.find(card => card.id === cardId))
        .filter(Boolean);
}

function renderBlackCardHtml(text, answers, includeBlankPlaceholders = false) {
    const parts = text.split(/_{2,}/);

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
            
            if (index < parts.length - 1) {
                const nextPart = parts[index + 1] ?? '';
                const nextTrimmed = nextPart.replace(/^\s+/, '');
                const punctuationOnly = nextTrimmed.match(/^([.,!?]+)\s*$/);
                const punctuationSuffix = punctuationOnly ? punctuationOnly[1] : '';

                if (punctuationSuffix) {
                    parts[index + 1] = '';
                }

                if (index < answers.length) {
                    html += `<span class="black-card-answer">${escapeHtml(answers[index])}${escapeHtml(punctuationSuffix)}</span>`;
                } else if (includeBlankPlaceholders) {
                    html += `<span class="black-card-blank">____${escapeHtml(punctuationSuffix)}</span>`;
                }
            }
        });
    } else if (answers.length > 0) {
        html += escapeHtml(text);
        html += ` <span class="black-card-answer">${escapeHtml(answers.join(' / '))}</span>`;
    } else {
        html += escapeHtml(text);
    }

    return html;
}

function checkUrlForRoom() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    
    if (roomCode) {
        if (!validateRoomId(roomCode)) {
            joinedViaLink = false;
            document.getElementById('roomCode').value = '';
            return;
        }

        joinedViaLink = true;
        document.getElementById('playerName').parentElement.classList.add('hidden');
        document.querySelector('.room-tabs-container').classList.add('hidden');
        showNameEntryModal(roomCode);
    }
}

function initializeHowToPlayCollapse() {
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
