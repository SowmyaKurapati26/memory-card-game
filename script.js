// Game elements
const gameBoard = document.getElementById("game-board");
const movesCounter = document.getElementById("moves");
const timeCounter = document.getElementById("time");
const bestScoreElement = document.getElementById("best-score");
const restartBtn = document.getElementById("restart");
const hintBtn = document.getElementById("hint");
const themeToggle = document.getElementById("theme-toggle");
const difficultyToggle = document.getElementById("difficulty-toggle");
const difficultyText = document.getElementById("difficulty-text");
const soundToggle = document.getElementById("sound-toggle");
const gameMessage = document.getElementById("game-message");
const particlesContainer = document.getElementById("particles-container");

// Game state
let currentTheme = 'ocean';
let currentDifficulty = 'easy';
let soundEnabled = true;
let comboCount = 0;
let lastMatchTime = 0;

// Card sets for different difficulties
const cardSets = {
    easy: ["🍎", "🍌", "🍇", "🍓", "🍒", "🥝", "🍍", "🍑"],
    medium: ["🍎", "🍌", "🍇", "🍓", "🍒", "🥝", "🍍", "🍑", "🥥", "🍊"],
    hard: ["🍎", "🍌", "🍇", "🍓", "🍒", "🥝", "🍍", "🍑", "🥥", "🍊", "🍋", "🍐", "🥭", "🍈", "🍉"]
};

let cards = [];
let flippedCards = [];
let matchedCount = 0;
let moves = 0;
let timer;
let time = 0;
let isGameStarted = false;
let bestScore = localStorage.getItem('memoryGameBestScore') || null;
let hintUsed = false;

// Sound effects (using Web Audio API)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration, type = 'sine') {
    if (!soundEnabled) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Initialize game
function init() {
    loadSettings();
    displayBestScore();
    startGame();
    setupEventListeners();
}

// Load saved settings
function loadSettings() {
    const savedTheme = localStorage.getItem('memoryGameTheme') || 'ocean';
    const savedDifficulty = localStorage.getItem('memoryGameDifficulty') || 'easy';
    const savedSound = localStorage.getItem('memoryGameSound') !== 'false';

    setTheme(savedTheme);
    setDifficulty(savedDifficulty);
    soundEnabled = savedSound;
    updateSoundButton();
}

// Save settings
function saveSettings() {
    localStorage.setItem('memoryGameTheme', currentTheme);
    localStorage.setItem('memoryGameDifficulty', currentDifficulty);
    localStorage.setItem('memoryGameSound', soundEnabled);
}

// Theme management
const themes = ['ocean', 'sunset', 'forest', 'space', 'neon'];

function setTheme(theme) {
    currentTheme = theme;
    document.body.className = `theme-${theme}`;
    saveSettings();
}

function cycleTheme() {
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
    playSound(800, 0.2);
}

// Difficulty management
const difficulties = ['easy', 'medium', 'hard'];

function setDifficulty(difficulty) {
    currentDifficulty = difficulty;
    difficultyText.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    gameBoard.className = `game-board difficulty-${difficulty}`;
    saveSettings();
}

function cycleDifficulty() {
    const currentIndex = difficulties.indexOf(currentDifficulty);
    const nextIndex = (currentIndex + 1) % difficulties.length;
    setDifficulty(difficulties[nextIndex]);
    playSound(600, 0.2);
    startGame(); // Restart with new difficulty
}

// Sound management
function toggleSound() {
    soundEnabled = !soundEnabled;
    updateSoundButton();
    saveSettings();
    playSound(soundEnabled ? 1000 : 200, 0.3);
}

function updateSoundButton() {
    const icon = soundToggle.querySelector('.btn-icon');
    icon.textContent = soundEnabled ? '🔊' : '🔇';
}

// Display best score
function displayBestScore() {
    if (bestScore) {
        bestScoreElement.textContent = bestScore;
    } else {
        bestScoreElement.textContent = "--";
    }
}

// Shuffle cards using Fisher-Yates algorithm
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function startGame() {
    gameBoard.innerHTML = "";
    moves = 0;
    time = 0;
    matchedCount = 0;
    flippedCards = [];
    isGameStarted = false;
    hintUsed = false;
    comboCount = 0;
    clearInterval(timer);

    updateDisplay();
    hideMessage();

    // Set up cards based on difficulty
    cards = [...cardSets[currentDifficulty], ...cardSets[currentDifficulty]];
    shuffle(cards);

    cards.forEach((symbol, index) => {
        const card = document.createElement("div");
        card.classList.add("card");
        card.dataset.symbol = symbol;
        card.dataset.index = index;
        card.innerHTML = "?";

        // Add special effect for some cards
        if (Math.random() < 0.1) {
            card.classList.add("special");
        }

        gameBoard.appendChild(card);

        // Add staggered animation
        setTimeout(() => {
            card.style.opacity = "1";
            card.style.transform = "scale(1)";
        }, index * 30);

        card.addEventListener("click", () => flipCard(card));
    });
}

function flipCard(card) {
    if (!isGameStarted) {
        isGameStarted = true;
        startTimer();
    }

    if (card.classList.contains("flip") ||
        card.classList.contains("matched") ||
        flippedCards.length === 2 ||
        card.classList.contains("disabled")) return;

    // Play flip sound
    playSound(400, 0.1, 'square');

    // Add flip animation
    card.style.transform = "rotateY(90deg)";

    setTimeout(() => {
        card.classList.add("flip");
        card.innerHTML = card.dataset.symbol;
        card.style.transform = "rotateY(180deg)";
        flippedCards.push(card);

        if (flippedCards.length === 2) {
            moves++;
            updateDisplay();
            checkMatch();
        }
    }, 150);
}

function checkMatch() {
    const [card1, card2] = flippedCards;

    // Disable all cards temporarily
    document.querySelectorAll('.card').forEach(card => {
        card.classList.add('disabled');
    });

    if (card1.dataset.symbol === card2.dataset.symbol) {
        // Match found
        playSound(800, 0.3, 'sine');
        createParticles(card1);

        // Check for combo
        const currentTime = Date.now();
        if (currentTime - lastMatchTime < 2000) {
            comboCount++;
            showComboEffect();
        } else {
            comboCount = 1;
        }
        lastMatchTime = currentTime;

        setTimeout(() => {
            card1.classList.add("matched");
            card2.classList.add("matched");
            matchedCount += 2;
            flippedCards = [];

            // Re-enable remaining cards
            document.querySelectorAll('.card:not(.matched)').forEach(card => {
                card.classList.remove('disabled');
            });

            if (matchedCount === cards.length) {
                clearInterval(timer);
                setTimeout(() => showWinMessage(), 500);
            }
        }, 500);
    } else {
        // No match
        playSound(200, 0.2, 'sawtooth');

        setTimeout(() => {
            card1.style.transform = "rotateY(90deg)";
            card2.style.transform = "rotateY(90deg)";

            setTimeout(() => {
                card1.classList.remove("flip");
                card1.innerHTML = "?";
                card1.style.transform = "rotateY(0deg)";
                card2.classList.remove("flip");
                card2.innerHTML = "?";
                card2.style.transform = "rotateY(0deg)";
                flippedCards = [];

                // Re-enable all cards
                document.querySelectorAll('.card').forEach(card => {
                    card.classList.remove('disabled');
                });
            }, 150);
        }, 1000);
    }
}

function showComboEffect() {
    const comboText = document.createElement('div');
    comboText.className = 'combo-effect';
    comboText.textContent = `COMBO x${comboCount}!`;
    gameBoard.appendChild(comboText);

    setTimeout(() => {
        comboText.remove();
    }, 600);
}

function createParticles(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;

        particlesContainer.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 2000);
    }
}

function startTimer() {
    timer = setInterval(() => {
        time++;
        updateDisplay();
    }, 1000);
}

function updateDisplay() {
    movesCounter.textContent = moves;
    timeCounter.textContent = `${time}s`;
}

function showWinMessage() {
    const score = moves;
    const timeScore = time;

    // Create confetti effect
    createConfetti();

    // Update best score
    if (!bestScore || score < bestScore) {
        bestScore = score;
        localStorage.setItem('memoryGameBestScore', bestScore);
        displayBestScore();
    }

    let message = `🎉 Congratulations! 🎉<br><br>`;
    message += `You completed the game in:<br>`;
    message += `📊 <strong>${moves} moves</strong><br>`;
    message += `⏱️ <strong>${time} seconds</strong><br>`;
    message += `🔥 <strong>${comboCount} max combo</strong><br><br>`;

    if (score === bestScore) {
        message += `🏆 <strong>New Best Score!</strong> 🏆`;
    } else {
        message += `Your best score: <strong>${bestScore} moves</strong>`;
    }

    showMessage(message);
    playSound(1000, 0.5, 'sine');
}

function createConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.top = '-10px';
        confetti.style.borderRadius = '50%';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '1000';

        document.body.appendChild(confetti);

        const animation = confetti.animate([
            { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
            { transform: `translateY(${window.innerHeight + 100}px) rotate(720deg)`, opacity: 0 }
        ], {
            duration: 3000 + Math.random() * 2000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });

        animation.onfinish = () => confetti.remove();
    }
}

function showMessage(text) {
    gameMessage.innerHTML = text;
    gameMessage.classList.add("show");
}

function hideMessage() {
    gameMessage.classList.remove("show");
}

function useHint() {
    if (hintUsed || flippedCards.length > 0) return;

    hintUsed = true;
    hintBtn.disabled = true;
    hintBtn.style.opacity = "0.5";

    playSound(600, 0.2);

    // Find two matching cards that haven't been matched yet
    const unmatchedCards = Array.from(document.querySelectorAll('.card:not(.matched)'));
    const cardMap = new Map();

    unmatchedCards.forEach(card => {
        const symbol = card.dataset.symbol;
        if (!cardMap.has(symbol)) {
            cardMap.set(symbol, []);
        }
        cardMap.get(symbol).push(card);
    });

    // Find a pair
    for (let [symbol, cards] of cardMap) {
        if (cards.length >= 2) {
            const [card1, card2] = cards.slice(0, 2);

            // Highlight the cards with pulsing effect
            card1.style.boxShadow = "0 0 30px #ffd700, 0 0 60px #ffd700";
            card2.style.boxShadow = "0 0 30px #ffd700, 0 0 60px #ffd700";

            // Add pulsing animation
            let pulseCount = 0;
            const pulseInterval = setInterval(() => {
                pulseCount++;
                if (pulseCount >= 6) {
                    clearInterval(pulseInterval);
                    card1.style.boxShadow = "";
                    card2.style.boxShadow = "";
                } else {
                    const intensity = pulseCount % 2 === 0 ? 0.8 : 0.4;
                    card1.style.boxShadow = `0 0 ${30 * intensity}px #ffd700, 0 0 ${60 * intensity}px #ffd700`;
                    card2.style.boxShadow = `0 0 ${30 * intensity}px #ffd700, 0 0 ${60 * intensity}px #ffd700`;
                }
            }, 300);

            break;
        }
    }
}

// Event listeners
function setupEventListeners() {
    restartBtn.addEventListener("click", () => {
        playSound(500, 0.2);
        startGame();
    });

    hintBtn.addEventListener("click", useHint);
    themeToggle.addEventListener("click", cycleTheme);
    difficultyToggle.addEventListener("click", cycleDifficulty);
    soundToggle.addEventListener("click", toggleSound);

    // Close message when clicking outside
    document.addEventListener("click", (e) => {
        if (e.target === gameMessage) {
            hideMessage();
        }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
        switch (e.key) {
            case 'r':
            case 'R':
                startGame();
                break;
            case 'h':
            case 'H':
                useHint();
                break;
            case 't':
            case 'T':
                cycleTheme();
                break;
            case 'd':
            case 'D':
                cycleDifficulty();
                break;
            case 'm':
            case 'M':
                toggleSound();
                break;
        }
    });
}

// Initialize the game
init();