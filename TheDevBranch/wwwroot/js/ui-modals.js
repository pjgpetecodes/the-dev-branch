// Modal Functions

function setJoinLinkEntryFocus(isFocused) {
    const lobby = document.getElementById('lobby');
    if (lobby) {
        lobby.classList.toggle('join-link-focus', !!isFocused);
    }

    document.body.classList.toggle('join-link-entry-pending', !!isFocused);
}

function showNameEntryModal(roomCode) {
    const modal = document.getElementById('nameEntryModal');
    const modalInput = document.getElementById('modalPlayerName');
    modalRoomId = roomCode.trim().toUpperCase();
    
    closeAllModals();
    clearNameError('modal');
    setJoinLinkEntryFocus(!!joinedViaLink);
    
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
    setJoinLinkEntryFocus(false);
    
    if (modalInput) {
        modalInput.value = '';
    }
    
    modalRoomId = null;
    
    if (joinedViaLink) {
        window.history.replaceState({}, document.title, window.location.pathname);
        joinedViaLink = false;
    }
}

function cancelNameEntryFromModal() {
    closeNameEntryModal();
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
        .then(async () => {
            console.log("Join request sent successfully");
            hasJoinedRoom = true;
            disableJoinControls();
            await syncCaptureConsentToHub(captureConsentGranted);
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

async function openWebcamConsentModal() {
    const modal = document.getElementById('webcamConsentModal');
    if (!modal) {
        return;
    }

    closeAllModals();
    modal.classList.remove('hidden');
    modal.classList.add('active');

    if (typeof onWebcamConsentModalOpened === 'function') {
        await onWebcamConsentModalOpened();
    }
}

function closeWebcamConsentModal() {
    const modal = document.getElementById('webcamConsentModal');
    if (!modal) {
        return;
    }

    modal.classList.remove('active');
    modal.classList.add('hidden');

    if (typeof onWebcamConsentModalClosed === 'function') {
        onWebcamConsentModalClosed();
    }
}

async function setWebcamConsentChoice(consentGranted) {
    const resolvedConsent = !!consentGranted;

    const optInButton = document.getElementById('openWebcamConsentBtn');
    const toggleDescription = document.getElementById('momentsCameraToggleDescription');
    document.body.dataset.webcamConsent = resolvedConsent ? 'granted' : 'deferred';

    if (optInButton) {
        optInButton.textContent = resolvedConsent ? 'Disable Camera' : 'Enable Camera';
    }

    if (toggleDescription) {
        toggleDescription.textContent = resolvedConsent
            ? 'Your camera is enabled for key-moment captures. Disable it here any time.'
            : 'Enable your camera to share key-moment captures with everyone in this room. You can disable it any time.';
    }

    document.dispatchEvent(new CustomEvent('webcamConsentChoiceChanged', {
        detail: { consentGranted: resolvedConsent }
    }));

    closeWebcamConsentModal();
}

function closeAllModals() {
    const webcamModal = document.getElementById('webcamConsentModal');
    const wasWebcamOpen = !!(webcamModal && !webcamModal.classList.contains('hidden'));
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.classList.remove('active');
        modal.classList.add('hidden');
    });

    if (wasWebcamOpen && typeof onWebcamConsentModalClosed === 'function') {
        onWebcamConsentModalClosed();
    }
}

window.openWebcamConsentModal = openWebcamConsentModal;
window.closeWebcamConsentModal = closeWebcamConsentModal;
window.setWebcamConsentChoice = setWebcamConsentChoice;
window.cancelNameEntryFromModal = cancelNameEntryFromModal;
window.setJoinLinkEntryFocus = setJoinLinkEntryFocus;
