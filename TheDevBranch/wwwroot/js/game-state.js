// Game State Variables
let connection;
let currentRoomId = '';
let currentConnectionId = '';
let roomCreatorId = '';
let isDemoMode = false;
let hasShownDeciderAnnouncement = false;
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

// Demo mode variables
const testPlayerNamePool = [
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
let isDemoPanelMinimized = localStorage.getItem('demoPanelMinimized') === 'true';
let modalRoomId = null;
