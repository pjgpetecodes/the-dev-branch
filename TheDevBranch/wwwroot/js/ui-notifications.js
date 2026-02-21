// Notification and Status UI Functions

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

function showTakedownNotification(senderName, takedownMessage) {
    const notifArea = document.getElementById('notificationArea');
    
    const notification = document.createElement('div');
    notification.className = 'takedown-notification';
    notification.innerHTML = `<strong>${senderName}</strong> roasted you: <em>"${takedownMessage}"</em>`;
    
    notifArea.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 8000);
}

function sendRandomTakedown(targetPlayerId) {
    if (!currentRoomId || !gameState) return;
    
    connection.invoke("SendTakedown", currentRoomId, targetPlayerId)
        .catch(err => console.error("Error sending takedown:", err));
}
