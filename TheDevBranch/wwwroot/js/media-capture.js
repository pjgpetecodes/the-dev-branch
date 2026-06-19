const MEDIA_CAPTURE_HUB_METHODS = {
    setCaptureConsent: 'SetCaptureConsent',
    uploadMomentCapture: 'UploadMomentCapture'
};

const MEDIA_CAPTURE_HUB_EVENTS = {
    captureConsentUpdated: 'CaptureConsentUpdated',
    momentCaptureAdded: 'MomentCaptureAdded',
    momentCaptureRejected: 'MomentCaptureRejected',
    roundCaptureGalleryCleared: 'RoundCaptureGalleryCleared'
};

const MEDIA_CAPTURE_LIMITS = {
    maxDecodedPayloadBytes: 20 * 1024,
    maxEncodedPayloadCharacters: 30000,
    maxCaptureDurationMs: 7000
};

const MEDIA_CAPTURE_MOMENTS = {
    submit: 'Submit',
    reveal: 'Reveal',
    winner: 'Winner'
};

let mediaCaptureInitialized = false;
let mediaCaptureInFlight = false;
let mediaCaptureCurrentStream = null;
const mediaCapturedMomentKeys = new Set();
const mediaCaptureQueuedAtByKey = new Map();
const mediaGalleryItems = new Map();
const mediaPendingCaptureMomentKeysById = new Map();

function initializeMediaCapture() {
    if (mediaCaptureInitialized) {
        return;
    }

    mediaCaptureInitialized = true;
    captureConsentGranted = false;
    document.body.dataset.webcamConsent = 'deferred';
    refreshWebcamConsentButton();
    renderMomentCaptureGallery();
    bindWebcamConsentButtons();

    document.addEventListener('webcamConsentChoiceChanged', async (event) => {
        const consentGranted = !!event.detail?.consentGranted;
        applyCaptureConsentState(consentGranted);
        await syncCaptureConsentToHub(consentGranted);
    });
}

async function requestWebcamConsentAndEnable() {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        showStatus('This browser cannot access the camera for key-moment captures.');
        return false;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                width: { ideal: 640, max: 960 },
                height: { ideal: 360, max: 540 },
                frameRate: { ideal: 16, max: 24 },
                facingMode: 'user'
            }
        });

        mediaCaptureCurrentStream = stream;
        showStatus('Camera enabled for key moments.');
        return true;
    } catch (err) {
        if (isCameraPermissionError(err)) {
            showStatus('Camera permission not granted. Allow camera access in browser site settings and try again.');
            return false;
        }

        console.warn('Failed to enable camera for key moments:', err);
        showStatus('Could not enable camera right now. You can keep playing without captures.');
        return false;
    } finally {
        cleanupMediaCaptureTracks();
    }
}

function bindWebcamConsentButtons() {
    const openButton = document.getElementById('openWebcamConsentBtn');
    const allowButton = document.getElementById('allowWebcamBtn');
    const deferButton = document.getElementById('deferWebcamBtn');

    if (openButton && !openButton.dataset.captureBound) {
        openButton.dataset.captureBound = 'true';
        openButton.addEventListener('click', async () => {
            if (typeof openWebcamConsentModal === 'function') {
                await openWebcamConsentModal();
                return;
            }

            await openWebcamConsentModalFallback();
        });
    }

    if (allowButton && !allowButton.dataset.captureBound) {
        allowButton.dataset.captureBound = 'true';
        allowButton.addEventListener('click', async () => {
            if (typeof setWebcamConsentChoice === 'function') {
                await setWebcamConsentChoice(true);
                return;
            }

            await setWebcamConsentChoiceFallback(true);
        });
    }

    if (deferButton && !deferButton.dataset.captureBound) {
        deferButton.dataset.captureBound = 'true';
        deferButton.addEventListener('click', async () => {
            if (typeof setWebcamConsentChoice === 'function') {
                await setWebcamConsentChoice(false);
                return;
            }

            await setWebcamConsentChoiceFallback(false);
        });
    }
}

async function openWebcamConsentModalFallback() {
    if (captureConsentGranted) {
        document.dispatchEvent(new CustomEvent('webcamConsentChoiceChanged', {
            detail: { consentGranted: true }
        }));
        return;
    }

    const modal = document.getElementById('webcamConsentModal');
    if (!modal) {
        return;
    }

    modal.classList.remove('hidden');
    modal.classList.add('active');
}

async function setWebcamConsentChoiceFallback(consentGranted) {
    let resolvedConsent = !!consentGranted;
    if (resolvedConsent) {
        resolvedConsent = await requestWebcamConsentAndEnable();
    }

    document.dispatchEvent(new CustomEvent('webcamConsentChoiceChanged', {
        detail: { consentGranted: resolvedConsent }
    }));

    if (!consentGranted || resolvedConsent) {
        const modal = document.getElementById('webcamConsentModal');
        if (modal) {
            modal.classList.remove('active');
            modal.classList.add('hidden');
        }
    }
}

function applyCaptureConsentState(consentGranted) {
    captureConsentGranted = !!consentGranted;
    document.body.dataset.webcamConsent = captureConsentGranted ? 'granted' : 'deferred';
    refreshWebcamConsentButton();

    if (!captureConsentGranted) {
        cleanupMediaCaptureTracks();
    }
}

function refreshWebcamConsentButton() {
    const optInButton = document.getElementById('openWebcamConsentBtn');
    if (!optInButton) {
        return;
    }

    optInButton.textContent = captureConsentGranted ? 'Camera Enabled' : 'Enable Camera';
}

async function syncCaptureConsentToHub(consentGranted) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected || !currentRoomId) {
        return;
    }

    try {
        await connection.invoke(MEDIA_CAPTURE_HUB_METHODS.setCaptureConsent, currentRoomId, {
            consentGranted: !!consentGranted,
            updatedAtUtc: new Date().toISOString()
        });
    } catch (err) {
        console.warn('Failed to sync capture consent:', err);
    }
}

function handleCaptureConsentUpdated(connectionId, update) {
    if (!connectionId || connectionId !== currentConnectionId) {
        return;
    }

    applyCaptureConsentState(!!update?.consentGranted);
}

function handleMediaCaptureStateTransition(previousState, nextState) {
    if (previousState === nextState) {
        return;
    }

    if (nextState === 2) {
        const activeRound = Number(gameState?.currentRound ?? roundNumber ?? 0);
        if (hasRecentSubmitCapture(activeRound)) {
            return;
        }
        queueMomentCapture(MEDIA_CAPTURE_MOMENTS.reveal, "Smile, you're on camera! Reveal moment.");
    } else if (nextState === 3) {
        queueMomentCapture(MEDIA_CAPTURE_MOMENTS.winner, "Smile, you're on camera! Winner moment.");
    }
}

function queueSubmitMomentCapture() {
    queueMomentCapture(MEDIA_CAPTURE_MOMENTS.submit, "Smile, you're on camera! Submission captured.");
}

function queueMomentCapture(moment, promptText) {
    if (!captureConsentGranted || !currentRoomId || !hasJoinedRoom || mediaCaptureInFlight) {
        return;
    }

    const activeRound = Number(gameState?.currentRound ?? roundNumber ?? 0);
    if (!activeRound) {
        return;
    }

    const captureKey = `${activeRound}:${moment}`;
    if (mediaCapturedMomentKeys.has(captureKey)) {
        return;
    }

    mediaCapturedMomentKeys.add(captureKey);
    mediaCaptureQueuedAtByKey.set(captureKey, Date.now());
    runMomentCapture(moment, activeRound, promptText, captureKey);
}

async function runMomentCapture(moment, round, promptText, captureKey) {
    mediaCaptureInFlight = true;

    try {
        showCapturePrompt(promptText || "Smile, you're on camera!");
        await delayMediaCapture(450);

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                width: { ideal: 640, max: 960 },
                height: { ideal: 360, max: 540 },
                frameRate: { ideal: 16, max: 24 },
                facingMode: 'user'
            }
        });

        mediaCaptureCurrentStream = stream;

        const clipPayload = await tryCaptureVideoClip(stream);
        const payload = clipPayload || await captureStillFrame(stream);

        if (!payload) {
            return;
        }

        const captureId = createCaptureId();
        mediaPendingCaptureMomentKeysById.set(captureId, captureKey);

        await connection.invoke(MEDIA_CAPTURE_HUB_METHODS.uploadMomentCapture, currentRoomId, {
            captureId,
            roundNumber: round,
            moment,
            consentGranted: captureConsentGranted,
            mimeType: payload.mimeType,
            durationMs: payload.durationMs,
            payloadByteCount: payload.payloadByteCount,
            payloadBase64: payload.payloadBase64
        });
    } catch (err) {
        if (isCameraPermissionError(err)) {
            applyCaptureConsentState(false);
            syncCaptureConsentToHub(false);
            showStatus('Camera permission denied. Gameplay continues without captures.');
            mediaCapturedMomentKeys.delete(captureKey);
            mediaCaptureQueuedAtByKey.delete(captureKey);
            return;
        }

        console.warn('Moment capture skipped:', err);
        mediaCapturedMomentKeys.delete(captureKey);
        mediaCaptureQueuedAtByKey.delete(captureKey);
    } finally {
        cleanupMediaCaptureTracks();
        mediaCaptureInFlight = false;
    }
}

function hasRecentSubmitCapture(roundNumberValue) {
    if (!roundNumberValue) {
        return false;
    }

    const submitKey = `${roundNumberValue}:${MEDIA_CAPTURE_MOMENTS.submit}`;
    const submitCapturedAt = mediaCaptureQueuedAtByKey.get(submitKey);
    if (!submitCapturedAt) {
        return false;
    }

    return Date.now() - submitCapturedAt < 4000;
}

function isCameraPermissionError(err) {
    const name = err?.name ?? '';
    return name === 'NotAllowedError' || name === 'SecurityError';
}

async function tryCaptureVideoClip(stream) {
    if (typeof MediaRecorder === 'undefined') {
        return null;
    }

    const mimeType = getPreferredVideoMimeType();
    if (!mimeType) {
        return null;
    }

    const chunks = [];
    const durationMs = 1200;
    const startAt = Date.now();

    try {
        const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 54000
        });

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                chunks.push(event.data);
            }
        };

        recorder.start(250);
        await delayMediaCapture(durationMs);

        if (recorder.state === 'recording') {
            recorder.stop();
        }

        await waitForMediaRecorderStop(recorder);
        const blob = new Blob(chunks, { type: mimeType });
        const payload = await buildCapturePayload(blob, Math.min(Date.now() - startAt, MEDIA_CAPTURE_LIMITS.maxCaptureDurationMs));
        return payload;
    } catch (err) {
        console.warn('Video clip capture failed, falling back to still image:', err);
        return null;
    }
}

function waitForMediaRecorderStop(recorder) {
    return new Promise((resolve) => {
        if (recorder.state === 'inactive') {
            resolve();
            return;
        }

        recorder.addEventListener('stop', () => resolve(), { once: true });
    });
}

function getPreferredVideoMimeType() {
    const candidates = ['video/webm', 'video/webm;codecs=vp8'];
    return candidates.find(candidate => MediaRecorder.isTypeSupported(candidate)) || null;
}

async function captureStillFrame(stream) {
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;

    await waitForVideoReady(video);

    const sourceWidth = video.videoWidth || 640;
    const sourceHeight = video.videoHeight || 360;
    const qualityLevels = [0.72, 0.6, 0.5, 0.42];
    const scaleLevels = [1, 0.85, 0.72, 0.62];
    const mimeCandidates = ['image/webp', 'image/jpeg'];

    for (const scale of scaleLevels) {
        const targetWidth = Math.max(160, Math.round(sourceWidth * scale));
        const targetHeight = Math.max(90, Math.round(sourceHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) {
            continue;
        }

        context.drawImage(video, 0, 0, targetWidth, targetHeight);

        for (const mimeType of mimeCandidates) {
            for (const quality of qualityLevels) {
                const blob = await canvasToBlob(canvas, mimeType, quality);
                if (!blob) {
                    continue;
                }

                const payload = await buildCapturePayload(blob, 0);
                if (payload) {
                    return payload;
                }
            }
        }
    }

    return null;
}

function waitForVideoReady(video) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Video stream timed out before capture')), 2500);

        const complete = () => {
            clearTimeout(timeout);
            resolve();
        };

        video.addEventListener('loadeddata', complete, { once: true });
        video.play().catch(() => { });
    });
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });
}

async function buildCapturePayload(blob, durationMs) {
    if (!blob || blob.size <= 0 || blob.size > MEDIA_CAPTURE_LIMITS.maxDecodedPayloadBytes) {
        return null;
    }

    const payloadBase64 = await blobToBase64(blob);
    if (!payloadBase64 || payloadBase64.length > MEDIA_CAPTURE_LIMITS.maxEncodedPayloadCharacters) {
        return null;
    }

    return {
        mimeType: normalizeCaptureMimeType(blob.type || 'image/jpeg'),
        durationMs: Math.max(0, Math.min(durationMs, MEDIA_CAPTURE_LIMITS.maxCaptureDurationMs)),
        payloadByteCount: blob.size,
        payloadBase64
    };
}

function normalizeCaptureMimeType(mimeType) {
    const normalized = (mimeType || '').split(';')[0].trim().toLowerCase();
    if (normalized === 'video/webm') {
        return 'video/webm';
    }
    if (normalized === 'image/webp') {
        return 'image/webp';
    }
    return 'image/jpeg';
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            const splitIndex = result.indexOf(',');
            resolve(splitIndex >= 0 ? result.substring(splitIndex + 1) : '');
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read capture blob'));
        reader.readAsDataURL(blob);
    });
}

function delayMediaCapture(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createCaptureId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().replace(/-/g, '');
    }

    return `${Date.now()}${Math.random().toString(16).slice(2, 10)}`;
}

function handleMomentCaptureAdded(item) {
    if (!item?.captureId) {
        return;
    }

    mediaPendingCaptureMomentKeysById.delete(item.captureId);
    mediaGalleryItems.set(item.captureId, item);
    renderMomentCaptureGallery();
}

function handleMomentCaptureRejected(evt) {
    if (!evt?.rejection) {
        return;
    }

    if (evt.captureId && mediaPendingCaptureMomentKeysById.has(evt.captureId)) {
        const captureKey = mediaPendingCaptureMomentKeysById.get(evt.captureId);
        if (captureKey) {
            mediaCapturedMomentKeys.delete(captureKey);
        }
        mediaPendingCaptureMomentKeysById.delete(evt.captureId);
    }

    console.warn('Moment capture rejected:', evt.rejection.code, evt.rejection.message);
    showCapturePrompt(evt.rejection.message || 'Capture skipped. Gameplay continues.');
}

function handleRoundCaptureGalleryCleared(nextRoundNumber) {
    if (typeof nextRoundNumber === 'number' && nextRoundNumber > 0) {
        roundNumber = nextRoundNumber;
    }

    mediaGalleryItems.clear();
    mediaCapturedMomentKeys.clear();
    mediaCaptureQueuedAtByKey.clear();
    mediaPendingCaptureMomentKeysById.clear();
    renderMomentCaptureGallery();
}

function renderMomentCaptureGallery() {
    const grid = document.getElementById('momentsGalleryGrid');
    if (!grid) {
        return;
    }

    grid.innerHTML = '';

    const items = Array.from(mediaGalleryItems.values())
        .sort((a, b) => new Date(a.capturedAtUtc || 0).getTime() - new Date(b.capturedAtUtc || 0).getTime());

    if (items.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'moments-gallery-placeholder';
        placeholder.textContent = 'Moments captured this round will appear here.';
        grid.appendChild(placeholder);
        return;
    }

    items.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'submitted-card-group moments-gallery-card';
        card.style.padding = '6px';
        card.style.background = 'rgba(255,255,255,0.08)';
        card.style.borderRadius = '8px';

        const mediaElement = createGalleryMediaElement(item);
        if (mediaElement) {
            mediaElement.style.width = '100%';
            mediaElement.style.borderRadius = '6px';
            mediaElement.style.display = 'block';
            card.appendChild(mediaElement);
        }

        const caption = document.createElement('div');
        caption.style.marginTop = '6px';
        caption.style.fontSize = '0.72rem';
        caption.style.color = 'rgba(255,255,255,0.92)';
        caption.textContent = `${item.moment || 'Moment'} • ${formatCaptureTime(item.capturedAtUtc)}`;
        card.appendChild(caption);

        grid.appendChild(card);
    });
}

function createGalleryMediaElement(item) {
    if (!item?.payloadBase64 || !item?.mimeType) {
        return null;
    }

    const source = `data:${item.mimeType};base64,${item.payloadBase64}`;
    if (item.mimeType.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = source;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        video.controls = false;
        video.preload = 'metadata';
        video.addEventListener('canplay', () => {
            video.play().catch(() => { });
        }, { once: true });
        return video;
    }

    const image = document.createElement('img');
    image.src = source;
    image.alt = `${item.moment || 'Moment'} capture`;
    image.loading = 'lazy';
    return image;
}

function formatCaptureTime(capturedAtUtc) {
    if (!capturedAtUtc) {
        return 'just now';
    }

    const time = new Date(capturedAtUtc);
    if (Number.isNaN(time.getTime())) {
        return 'just now';
    }

    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function cleanupMediaCaptureTracks() {
    if (!mediaCaptureCurrentStream) {
        return;
    }

    mediaCaptureCurrentStream.getTracks().forEach(track => track.stop());
    mediaCaptureCurrentStream = null;
}

function showCapturePrompt(message) {
    const notifArea = document.getElementById('notificationArea');
    if (!notifArea) {
        return;
    }

    const notification = document.createElement('div');
    notification.className = 'player-join-notification';
    notification.textContent = message;
    notifArea.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 2200);
}

function resetMediaCaptureSession() {
    cleanupMediaCaptureTracks();
    mediaCaptureInFlight = false;
    mediaCapturedMomentKeys.clear();
    mediaCaptureQueuedAtByKey.clear();
    mediaGalleryItems.clear();
    mediaPendingCaptureMomentKeysById.clear();
    applyCaptureConsentState(false);
    renderMomentCaptureGallery();
}

window.requestWebcamConsentAndEnable = requestWebcamConsentAndEnable;
