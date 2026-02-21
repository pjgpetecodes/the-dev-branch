// Modal Functions

function showNameEntryModal(roomCode) {
    const modal = document.getElementById('nameEntryModal');
    const modalInput = document.getElementById('modalPlayerName');
    modalRoomId = roomCode.trim().toUpperCase();
    
    closeAllModals();
    clearNameError('modal');
    
    modal.classList.remove('hidden');
    modal.classList.add('active');
    
    if (modalInput) {
        modalInput.value = '';
        modalInput.focus();
    }
    
    const roomCodeEl = document.getElementById('nameEntryRoomCode');
    if (roomCodeEl) {
        roomCodeEl.textContent = modalRoomId;
    }
}

function closeNameEntryModal() {
    const modal = document.getElementById('nameEntryModal');
    const modalInput = document.getElementById('modalPlayerName');
    
    modal.classList.remove('active');
    modal.classList.add('hidden');
    clearNameError('modal');
    
    if (modalInput) {
        modalInput.value = '';
    }
    
    modalRoomId = null;
    
    if (joinedViaLink) {
        window.history.replaceState({}, document.title, window.location.pathname);
        joinedViaLink = false;
    }
}

function handleModalJoinGame() {
    const modalInput = document.getElementById('modalPlayerName');
    const playerName = modalInput.value.trim();
    
    clearNameError('modal');

    if (!playerName) {
        setNameError('modal', 'Please enter your name');
        return;
    }

    if (!modalRoomId) {
        setNameError('modal', 'Room code is missing');
        return;
    }

    currentPlayerName = playerName;
    currentRoomId = modalRoomId;
    
    connection.invoke("JoinRoom", modalRoomId, playerName)
        .then(() => {
            console.log("Join request sent successfully");
            hasJoinedRoom = true;
            disableJoinControls();
            closeNameEntryModal();
        })
        .catch(err => {
            console.error("Error in JoinRoom:", err);
            
            const errorMessage = getJoinErrorMessage(err);
            
            if (isDuplicateNameError(errorMessage)) {
                setNameError('modal', 'Name already taken. Please choose another.');
            } else {
                setNameError('modal', errorMessage || 'An error occurred. Please try again.');
            }
        });
}

function openRoundsModal() {
    const modal = document.getElementById('roundsModal');
    const input = document.getElementById('roundsModalInput');
    
    closeAllModals();
    
    modal.classList.remove('hidden');
    modal.classList.add('active');
    
    if (input) {
        input.value = totalRounds;
        input.focus();
    }
}

function closeRoundsModal() {
    const modal = document.getElementById('roundsModal');
    modal.classList.remove('active');
    modal.classList.add('hidden');
}

function handleSetRounds() {
    const input = document.getElementById('roundsModalInput');
    const value = parseInt(input.value, 10);
    
    if (value >= 1 && value <= 20) {
        hasPromptedRounds = true;
        connection.invoke("UpdateRounds", currentRoomId, value)
            .catch(err => {
                console.error("Error setting rounds:", err);
                showError("Failed to set rounds");
            });
        closeRoundsModal();
    } else {
        showError("Please enter a valid number between 1 and 20");
    }
}

function showWaitModal() {
    const modal = document.getElementById('waitModal');
    closeAllModals();
    modal.classList.remove('hidden');
    modal.classList.add('active');
}

function closeWaitModal() {
    const modal = document.getElementById('waitModal');
    modal.classList.remove('active');
    modal.classList.add('hidden');
}

function handleWait() {
    connection.invoke("WaitForPlayerReturn", currentRoomId)
        .catch(err => console.error("Error waiting for player return:", err));
    closeWaitModal();
}

function handleRestartGame() {
    connection.invoke("RestartGame", currentRoomId)
        .catch(err => console.error("Error restarting game:", err));
    closeWaitModal();
}

function handleQuitGame() {
    if (!confirm('Are you sure you want to leave the room?')) {
        return;
    }

    connection.invoke("QuitGame", currentRoomId)
        .catch(err => console.error("Error quitting game:", err));
    closeWaitModal();
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.classList.remove('active');
        modal.classList.add('hidden');
    });
}
