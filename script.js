const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold');
const holdContext = holdCanvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Configuration des différentes grilles de jeu
const GRID_CONFIGS = {
    standard: { rows: 20, cols: 10 },
    square: { rows: 15, cols: 15 },
    wide: { rows: 15, cols: 25 },
    tall: { rows: 25, cols: 8 },
    mini: { rows: 12, cols: 8 }
};

let ROWS, COLS, BLOCK_SIZE;
const NEXT_BLOCK_SIZE = 30;

// Fonction pour calculer la taille optimale des blocs
function calculateBlockSize(rows, cols) {
    const maxWidth = window.innerWidth * 0.8;  // 80% de la largeur de la fenêtre
    const maxHeight = window.innerHeight * 0.8; // 80% de la hauteur de la fenêtre
    
    const blockWidth = Math.floor(maxWidth / cols);
    const blockHeight = Math.floor(maxHeight / rows);
    
    return Math.min(blockWidth, blockHeight, 40); // Maximum 40px pour éviter des blocs trop grands
}

// Fonction d'initialisation du jeu
function initGame(gridType) {
    const config = GRID_CONFIGS[gridType];
    ROWS = config.rows;
    COLS = config.cols;
    BLOCK_SIZE = calculateBlockSize(ROWS, COLS);

    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;

    nextCanvas.width = 4 * NEXT_BLOCK_SIZE;
    nextCanvas.height = 8 * NEXT_BLOCK_SIZE;

    holdCanvas.width = 4 * NEXT_BLOCK_SIZE;
    holdCanvas.height = 4 * NEXT_BLOCK_SIZE;

    context.scale(BLOCK_SIZE, BLOCK_SIZE);
    nextContext.scale(NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
    holdContext.scale(NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);

    board = createBoard();
    score = 0;
    level = gameSettings.startLevel; // Phase 8 - Use start level from settings
    linesCleared = 0;
    combo = 0;
    backToBack = 0;
    lockDelay = 0;
    lockDelayMoves = 0;
    dropInterval = Math.max(100, 1000 - (level * 50)); // Phase 8 - Adjust speed based on start level
    pieceBag = [];
    holdPiece = null;
    canHold = true;
    pieceCount = 0;
    gameStartTime = Date.now();

    // Phase 4 - Reset advanced scoring variables
    lastMoveWasRotation = false;
    tSpinType = null;
    perfectClearBonus = 0;

    // Phase 9 - Reset metrics
    totalMoves = 0;
    totalRotations = 0;
    totalHardDrops = 0;
    totalSoftDrops = 0;
    updateScore();
    updateLevel();
    updateCombo();
    updateBackToBack();
    piece = createPiece();
    initNextQueue();
    drawHoldPiece();

    // Configuration selon le mode de jeu
    const timerElement = document.getElementById('game-timer');
    const linesGoalElement = document.getElementById('lines-goal');

    if (gameMode === 'sprint') {
        timerElement.style.display = 'block';
        linesGoalElement.style.display = 'block';
        updateLinesGoal();
    } else if (gameMode === 'ultra') {
        timerElement.style.display = 'block';
        linesGoalElement.style.display = 'none';
        gameTimer = ultraTimeLimit;
    } else {
        timerElement.style.display = 'none';
        linesGoalElement.style.display = 'none';
    }

    document.getElementById('game-container').style.display = 'flex';
    document.getElementById('grid-menu').style.display = 'none';

    isPaused = false;
    lastTime = 0;
    dropCounter = 0;

    // Phase 10 - Start recording replay
    const replaySeed = Date.now();
    startRecording(replaySeed, gameMode, gridType);

    requestAnimationFrame(update);
}

// Phase 6 - Apply theme
function applyTheme(themeName) {
    currentTheme = themeName;
    COLORS = [...THEMES[themeName].colors];

    // Apply to body
    document.body.style.backgroundColor = THEMES[themeName].bg === '#FFFFFF' ? '#f0f0f0' : THEMES[themeName].bg;
    document.body.style.color = THEMES[themeName].bg === '#FFFFFF' ? '#000' : '#fff';

    // Save theme preference
    localStorage.setItem('tetrisTheme', themeName);
}

// Event listener pour le bouton de démarrage
document.getElementById('start-game').addEventListener('click', () => {
    const gridType = document.getElementById('grid-select').value;
    gameMode = document.getElementById('game-mode').value;
    const theme = document.getElementById('theme-select').value;

    applyTheme(theme); // Phase 6 - Apply theme
    audioManager.init(); // Phase 6 - Initialize audio
    initGame(gridType);
});

// Phase 6 - Load saved theme on page load
const savedTheme = localStorage.getItem('tetrisTheme') || 'classic';
document.getElementById('theme-select').value = savedTheme;
applyTheme(savedTheme);

// Afficher les high scores au chargement
function displayHighScores() {
    const scores = getHighScores();
    const scoresList = document.getElementById('scores-list');

    if (scores.length === 0) {
        scoresList.innerHTML = '<p style="color: #666;">Aucun score enregistré</p>';
        return;
    }

    let html = '<table style="width: 100%; border-collapse: collapse;">';
    html += '<tr style="border-bottom: 2px solid #333;"><th>Rang</th><th>Score</th><th>Lignes</th><th>Niveau</th></tr>';

    scores.forEach((s, index) => {
        html += `<tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 5px; text-align: center;">${index + 1}</td>
            <td style="padding: 5px; text-align: center; font-weight: bold;">${s.score}</td>
            <td style="padding: 5px; text-align: center;">${s.lines}</td>
            <td style="padding: 5px; text-align: center;">${s.level}</td>
        </tr>`;
    });

    html += '</table>';
    scoresList.innerHTML = html;
}

// Phase 7 - Display stats
function displayStats() {
    const statsContent = document.getElementById('stats-content');
    const pieceNames = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];

    let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">';

    // Statistiques générales
    html += '<div style="border: 2px solid #2196F3; padding: 15px; border-radius: 8px;">';
    html += '<h3 style="color: #2196F3; margin-top: 0;">🎮 Général</h3>';
    html += `<p><strong>Total parties:</strong> ${gameStats.totalGames}</p>`;
    html += `<p><strong>Victoires:</strong> ${gameStats.gamesWon}</p>`;
    html += `<p><strong>Défaites:</strong> ${gameStats.gamesLost}</p>`;
    html += `<p><strong>Win rate:</strong> ${gameStats.totalGames > 0 ? ((gameStats.gamesWon / gameStats.totalGames) * 100).toFixed(1) : 0}%</p>`;
    html += `<p><strong>Temps total:</strong> ${formatTime(gameStats.totalPlayTime)}</p>`;
    html += '</div>';

    // Statistiques de performance
    html += '<div style="border: 2px solid #4CAF50; padding: 15px; border-radius: 8px;">';
    html += '<h3 style="color: #4CAF50; margin-top: 0;">⭐ Performance</h3>';
    html += `<p><strong>Score total:</strong> ${gameStats.totalScore.toLocaleString()}</p>`;
    html += `<p><strong>Lignes totales:</strong> ${gameStats.totalLines}</p>`;
    html += `<p><strong>Score moyen:</strong> ${gameStats.totalGames > 0 ? Math.floor(gameStats.totalScore / gameStats.totalGames).toLocaleString() : 0}</p>`;
    html += `<p><strong>Lignes/partie:</strong> ${gameStats.totalGames > 0 ? (gameStats.totalLines / gameStats.totalGames).toFixed(1) : 0}</p>`;
    html += '</div>';

    // Records
    html += '<div style="border: 2px solid #FF9800; padding: 15px; border-radius: 8px;">';
    html += '<h3 style="color: #FF9800; margin-top: 0;">🏆 Records</h3>';
    html += `<p><strong>Meilleur combo:</strong> x${gameStats.highestCombo}</p>`;
    html += `<p><strong>Meilleur B2B:</strong> x${gameStats.highestBackToBack}</p>`;
    html += `<p><strong>Sprint le plus rapide:</strong> ${gameStats.fastestSprint === Infinity ? 'N/A' : formatTime(gameStats.fastestSprint)}</p>`;
    html += '</div>';

    // Spéciaux
    html += '<div style="border: 2px solid #9C27B0; padding: 15px; border-radius: 8px;">';
    html += '<h3 style="color: #9C27B0; margin-top: 0;">✨ Spéciaux</h3>';
    html += `<p><strong>Total Tetris:</strong> ${gameStats.totalTetrises}</p>`;
    html += `<p><strong>Total T-Spins:</strong> ${gameStats.totalTSpins}</p>`;
    html += `<p><strong>Perfect Clears:</strong> ${gameStats.totalPerfectClears}</p>`;
    html += '</div>';

    html += '</div>';

    // Statistiques par pièce
    html += '<div style="margin-top: 20px; border: 2px solid #00BCD4; padding: 15px; border-radius: 8px;">';
    html += '<h3 style="color: #00BCD4; margin-top: 0;">🎲 Pièces Utilisées</h3>';
    html += '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; text-align: center;">';

    const totalPieces = gameStats.pieceStats.reduce((a, b) => a + b, 0);
    gameStats.pieceStats.forEach((count, index) => {
        const percentage = totalPieces > 0 ? ((count / totalPieces) * 100).toFixed(1) : 0;
        html += `<div style="background: ${COLORS[index]}; color: white; padding: 10px; border-radius: 5px;">`;
        html += `<strong>${pieceNames[index]}</strong><br>`;
        html += `${count}<br>`;
        html += `<small>${percentage}%</small>`;
        html += `</div>`;
    });

    html += '</div>';
    html += '</div>';

    // Phase 7 - Achievements section
    html += '<div style="margin-top: 20px; border: 2px solid #9C27B0; padding: 15px; border-radius: 8px;">';
    html += '<h3 style="color: #9C27B0; margin-top: 0;">🏆 Achievements (' + unlockedAchievements.length + '/' + ACHIEVEMENTS.length + ')</h3>';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">';

    ACHIEVEMENTS.forEach(achievement => {
        const unlocked = unlockedAchievements.includes(achievement.id);
        const opacity = unlocked ? '1' : '0.3';
        const bgColor = unlocked ? '#4CAF50' : '#ccc';

        html += `<div style="background: ${bgColor}; color: white; padding: 15px; border-radius: 8px; opacity: ${opacity};">`;
        html += `<div style="font-size: 32px; text-align: center; margin-bottom: 5px;">${achievement.icon}</div>`;
        html += `<div style="font-weight: bold; text-align: center; margin-bottom: 3px;">${achievement.name}</div>`;
        html += `<div style="font-size: 12px; text-align: center;">${achievement.desc}</div>`;
        html += `</div>`;
    });

    html += '</div>';
    html += '</div>';

    statsContent.innerHTML = html;
}

// Phase 7 - Event listeners for stats modal
document.getElementById('view-stats').addEventListener('click', () => {
    displayStats();
    document.getElementById('stats-modal').style.display = 'block';
});

document.getElementById('close-stats').addEventListener('click', () => {
    document.getElementById('stats-modal').style.display = 'none';
});

// Close on backdrop click
document.getElementById('stats-modal').addEventListener('click', (e) => {
    if (e.target.id === 'stats-modal') {
        document.getElementById('stats-modal').style.display = 'none';
    }
});

// Appeler au chargement de la page
displayHighScores();
loadStats(); // Phase 7 - Load stats
loadSettings(); // Phase 8 - Load settings

const TETROMINOES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]],   // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[0, 1, 1], [1, 1, 0]], // S
    [[1, 1, 0], [0, 1, 1]], // Z
    [[1, 0, 0], [1, 1, 1]], // L
    [[0, 0, 1], [1, 1, 1]]  // J
];

// Phase 6 - Themes system
const THEMES = {
    classic: {
        name: 'Classic',
        bg: '#FFFFFF',
        grid: '#CCCCCC',
        border: '#000000',
        colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500']
    },
    dark: {
        name: 'Dark Mode',
        bg: '#1a1a1a',
        grid: '#444444',
        border: '#666666',
        colors: ['#ff6b6b', '#51cf66', '#339af0', '#ffd43b', '#ff6b9d', '#22b8cf', '#ff922b']
    },
    neon: {
        name: 'Neon',
        bg: '#0a0a0a',
        grid: '#00ff00',
        border: '#00ff00',
        colors: ['#ff0080', '#00ff00', '#00ffff', '#ffff00', '#ff00ff', '#0080ff', '#ff8000']
    }
};

let currentTheme = 'classic';
let COLORS = [...THEMES[currentTheme].colors];

let pieceBag = [];

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function fillBag() {
    pieceBag = [0, 1, 2, 3, 4, 5, 6];
    for (let i = pieceBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieceBag[i], pieceBag[j]] = [pieceBag[j], pieceBag[i]];
    }
}

function createPiece() {
    if (pieceBag.length === 0) {
        fillBag();
    }
    const typeId = pieceBag.pop();
    const piece = TETROMINOES[typeId];

    // Phase 7 - Track piece stats
    if (gameStats.pieceStats) {
        gameStats.pieceStats[typeId]++;
    }

    // Phase 10 - Record piece in replay
    if (isRecording && currentReplay) {
        currentReplay.recordPiece(typeId);
    }

    return {
        x: Math.floor(COLS / 2) - Math.floor(piece[0].length / 2),
        y: 0,
        shape: piece,
        color: COLORS[typeId],
        typeId: typeId
    };
}

function drawGhostPiece() {
    let ghostY = piece.y;
    while (!collide(piece.shape, piece.x, ghostY + 1)) {
        ghostY++;
    }

    const blockSize = 0.8;
    const padding = (1 - blockSize) / 2;

    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = 'rgba(150, 150, 150, 0.3)';
                context.fillRect(
                    x + piece.x + padding,
                    y + ghostY + padding,
                    blockSize,
                    blockSize
                );
                context.strokeStyle = '#888888';
                context.lineWidth = 0.05;
                context.strokeRect(
                    x + piece.x + padding,
                    y + ghostY + padding,
                    blockSize,
                    blockSize
                );
            }
        });
    });
}

function draw() {
    // Phase 6 - Use theme background
    context.fillStyle = THEMES[currentTheme].bg;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Phase 6 - Use theme border
    context.strokeStyle = THEMES[currentTheme].border;
    context.lineWidth = 0.1;
    context.strokeRect(0, 0, COLS, ROWS);

    drawMatrix(board, { x: 0, y: 0 });
    // Phase 8 - Only draw ghost piece if setting is enabled
    if (gameSettings.showGhostPiece) {
        drawGhostPiece();
    }
    drawMatrix(piece.shape, { x: piece.x, y: piece.y }, piece.color);
}

function drawMatrix(matrix, offset, color) {
    const blockSize = 0.8; // Taille du bloc (plus petit que 1 pour voir la grille)
    const padding = (1 - blockSize) / 2; // Centrage du bloc

    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                // Animation flash pour les lignes à clear
                const isClearing = linesToClear.includes(y + offset.y);

                // Couleur principale du bloc
                let blockColor = color || COLORS[value - 1];
                if (isClearing) {
                    blockColor = '#FFFFFF'; // Flash blanc
                }

                context.fillStyle = blockColor;
                context.fillRect(
                    x + offset.x + padding,
                    y + offset.y + padding,
                    blockSize,
                    blockSize
                );

                // Effet de lumière (haut-gauche plus clair)
                if (!isClearing) {
                    context.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    context.fillRect(
                        x + offset.x + padding,
                        y + offset.y + padding,
                        blockSize / 2,
                        blockSize / 2
                    );
                }

                // Bordure (Phase 6 - use theme border)
                context.strokeStyle = THEMES[currentTheme].border;
                context.lineWidth = 0.05;
                context.strokeRect(
                    x + offset.x + padding,
                    y + offset.y + padding,
                    blockSize,
                    blockSize
                );
            }
        });
    });

    // Phase 8 - Only draw grid lines if setting is enabled
    if (gameSettings.showGridLines) {
        // Grille de fond (Phase 6 - use theme grid)
        context.strokeStyle = THEMES[currentTheme].grid;
        context.lineWidth = 0.02;
        for (let x = 0; x <= COLS; x++) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, ROWS);
            context.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(COLS, y);
            context.stroke();
        }
    }
}

function initNextQueue() {
    nextPieces = [];
    for (let i = 0; i < 2; i++) {
        nextPieces.push(createPiece());
    }
}

function drawNextQueue() {
    // Phase 6 - Use theme background
    nextContext.fillStyle = THEMES[currentTheme].bg;
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    const pieceHeight = (nextCanvas.height / NEXT_BLOCK_SIZE) / 2;

    nextPieces.forEach((nextPiece, index) => {
        const shape = nextPiece.shape;
        const color = nextPiece.color;

        const scale = Math.min(
            (nextCanvas.width / NEXT_BLOCK_SIZE) / shape[0].length,
            pieceHeight / shape.length
        ) * 0.6;

        const xOffset = ((nextCanvas.width / NEXT_BLOCK_SIZE) - (shape[0].length * scale)) / 2;
        const yOffset = (index * pieceHeight) + ((pieceHeight - (shape.length * scale)) / 2);

        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    nextContext.fillStyle = color;
                    nextContext.fillRect(
                        (x * scale) + xOffset,
                        (y * scale) + yOffset,
                        scale * 0.9,
                        scale * 0.9
                    );

                    nextContext.strokeStyle = '#000000';
                    nextContext.lineWidth = scale * 0.1;
                    nextContext.strokeRect(
                        (x * scale) + xOffset,
                        (y * scale) + yOffset,
                        scale * 0.9,
                        scale * 0.9
                    );
                }
            });
        });
    });
}

function drawHoldPiece() {
    // Phase 6 - Use theme background
    holdContext.fillStyle = THEMES[currentTheme].bg;
    holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);

    if (!holdPiece) return;

    const shape = holdPiece.shape;
    const color = holdPiece.color;

    const scale = Math.min(
        (holdCanvas.width / NEXT_BLOCK_SIZE) / shape[0].length,
        (holdCanvas.height / NEXT_BLOCK_SIZE) / shape.length
    ) * 0.6;

    const xOffset = ((holdCanvas.width / NEXT_BLOCK_SIZE) - (shape[0].length * scale)) / 2;
    const yOffset = ((holdCanvas.height / NEXT_BLOCK_SIZE) - (shape.length * scale)) / 2;

    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                holdContext.fillStyle = canHold ? color : '#888888';
                holdContext.fillRect(
                    (x * scale) + xOffset,
                    (y * scale) + yOffset,
                    scale * 0.9,
                    scale * 0.9
                );

                holdContext.strokeStyle = '#000000';
                holdContext.lineWidth = scale * 0.1;
                holdContext.strokeRect(
                    (x * scale) + xOffset,
                    (y * scale) + yOffset,
                    scale * 0.9,
                    scale * 0.9
                );
            }
        });
    });
}

function merge() {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + piece.y][x + piece.x] = piece.typeId + 1;
            }
        });
    });
}

function rotate() {
    const originalShape = piece.shape;
    const newShape = originalShape[0].map((_, colIndex) => originalShape.map(row => row[colIndex]).reverse());
    const pos = piece.x;
    let offset = 1;
    while (collide(newShape)) {
        piece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > newShape[0].length) {
            piece.x = pos; // reset position
            return; // can't rotate
        }
    }
    piece.shape = newShape;
}

function rotateLeft() {
    const originalShape = piece.shape;
    const newShape = originalShape[0].map((_, colIndex) =>
        originalShape.map(row => row[row.length-1-colIndex])
    );
    tryRotate(newShape);
    totalRotations++; // Phase 9 - Track rotations
    audioManager.playRotate(); // Phase 6 - Play sound
}

function rotateRight() {
    const originalShape = piece.shape;
    const newShape = originalShape[0].map((_, colIndex) =>
        originalShape.map(row => row[colIndex]).reverse()
    );
    tryRotate(newShape);
    totalRotations++; // Phase 9 - Track rotations
    audioManager.playRotate(); // Phase 6 - Play sound
}

function tryRotate(newShape) {
    const originalShape = piece.shape;
    const originalX = piece.x;
    const originalY = piece.y;

    // Wall kick tests (simplified SRS-like)
    const kickTests = [
        { x: 0, y: 0 },   // No kick
        { x: -1, y: 0 },  // Left
        { x: 1, y: 0 },   // Right
        { x: -2, y: 0 },  // Left 2
        { x: 2, y: 0 },   // Right 2
        { x: 0, y: -1 },  // Up
        { x: -1, y: -1 }, // Left + Up
        { x: 1, y: -1 },  // Right + Up
    ];

    piece.shape = newShape;

    for (let i = 0; i < kickTests.length; i++) {
        const kick = kickTests[i];
        piece.x = originalX + kick.x;
        piece.y = originalY + kick.y;

        if (!collide(piece.shape)) {
            // Marquer rotation réussie pour T-Spin detection
            lastMoveWasRotation = true;

            // Si kick index > 0, c'est potentiellement un vrai T-Spin
            if (piece.typeId === 2 && i > 0) { // T piece et kick utilisé
                tSpinType = 'normal';
            } else if (piece.typeId === 2 && i === 0) {
                tSpinType = 'mini'; // T piece sans kick
            }

            resetLockDelay();
            draw();
            return;
        }
    }

    // All kicks failed, revert
    piece.shape = originalShape;
    piece.x = originalX;
    piece.y = originalY;
}

function softDrop() {
    piece.y++;
    if (collide(piece.shape)) {
        piece.y--;
    } else {
        score += 1;
        updateScore();
        lastMoveWasRotation = false; // Reset rotation flag
        totalSoftDrops++; // Phase 9 - Track soft drops
        audioManager.playSoftDrop(); // Phase 6 - Play sound
    }
}

function hardDrop() {
    let dropDistance = 0;
    while (!collide(piece.shape, piece.x, piece.y + 1)) {
        piece.y++;
        dropDistance++;
    }
    score += dropDistance * 2;
    totalHardDrops++; // Phase 9 - Track hard drops
    audioManager.playHardDrop(); // Phase 6 - Play sound
    merge();
    resetPiece();
    sweepBoard();
    updateScore();
}

function collide(shape, posX = piece.x, posY = piece.y) {
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[0].length; x++) {
            if (shape[y][x] !== 0) {
                const newY = y + posY;
                const newX = x + posX;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }

                if (newY >= 0 && board[newY] && board[newY][newX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function resetPiece() {
    piece = nextPieces.shift();
    nextPieces.push(createPiece());
    canHold = true;
    pieceCount++;
    drawNextQueue();
    if (collide(piece.shape)) {
        gameOver();
    }
}

function gameOver() {
    isPaused = true;
    cancelAnimationFrame(animationFrameId);

    audioManager.playGameOver(); // Phase 6 - Play sound

    const playTime = Math.floor((Date.now() - gameStartTime) / 1000);
    stopRecording(); // Phase 10 - Stop recording replay
    saveHighScore(score, linesCleared, level, playTime);
    updateGameStats(); // Phase 7 - Update stats

    board.forEach(row => row.fill(0));
    alert(`Game Over!\n\nScore: ${score}\nLignes: ${linesCleared}\nNiveau: ${level}\nTemps: ${formatTime(playTime)}`);

    restartGame();
}

function victoryScreen() {
    isPaused = true;
    cancelAnimationFrame(animationFrameId);

    const playTime = Math.floor((Date.now() - gameStartTime) / 1000);
    stopRecording(); // Phase 10 - Stop recording replay
    saveHighScore(score, linesCleared, level, playTime);
    updateGameStats(); // Phase 7 - Update stats

    let message = '';
    if (gameMode === 'sprint') {
        message = `Sprint Terminé!\n\nTemps: ${formatTime(playTime)}\nScore: ${score}`;
    } else if (gameMode === 'ultra') {
        message = `Ultra Terminé!\n\nScore: ${score}\nLignes: ${linesCleared}`;
    }

    alert(message);
    restartGame();
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function saveHighScore(score, lines, level, time) {
    let highScores = JSON.parse(localStorage.getItem('tetrisHighScores')) || [];

    highScores.push({
        score: score,
        lines: lines,
        level: level,
        time: time,
        date: new Date().toISOString()
    });

    // Trier par score décroissant et garder top 10
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10);

    localStorage.setItem('tetrisHighScores', JSON.stringify(highScores));
}

function getHighScores() {
    return JSON.parse(localStorage.getItem('tetrisHighScores')) || [];
}

function holdCurrentPiece() {
    if (!canHold) return;

    if (holdPiece === null) {
        holdPiece = piece;
        piece = nextPieces.shift();
        nextPieces.push(createPiece());
        drawNextQueue();
    } else {
        const temp = holdPiece;
        holdPiece = piece;
        piece = temp;
        piece.x = Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2);
        piece.y = 0;
    }

    canHold = false;
    audioManager.playHold(); // Phase 6 - Play sound
    drawHoldPiece();
    draw();
}

function updateLevel() {
    level = Math.floor(linesCleared / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level * 50));
    const levelElement = document.getElementById('level');
    if (levelElement) {
        levelElement.innerText = level;
    }
}

function sweepBoard() {
    // Détecter les lignes complètes
    linesToClear = [];
    for (let y = board.length - 1; y >= 0; --y) {
        let complete = true;
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                complete = false;
                break;
            }
        }
        if (complete) {
            linesToClear.push(y);
        }
    }

    if (linesToClear.length > 0) {
        // Démarrer l'animation
        clearingLines = true;
        setTimeout(() => {
            actuallyRemoveLines();
        }, 200); // Animation de 200ms
    } else {
        // Reset combo si aucune ligne clearée
        if (combo > 0) {
            combo = 0;
            updateCombo();
        }
    }
}

// Phase 4 - Détecter si c'est un vrai T-Spin
function detectTSpin() {
    // Vérifier que c'est une pièce T
    if (piece.typeId !== 2) return null;

    // Vérifier qu'une rotation vient d'avoir lieu
    if (!lastMoveWasRotation) return null;

    // Vérifier les 4 coins autour du centre de la pièce T
    // Le centre de la T est à la position [0][1] de la shape
    const centerX = piece.x + 1;
    const centerY = piece.y;

    // Les 4 coins autour du centre (diagonales)
    const corners = [
        { x: centerX - 1, y: centerY - 1 }, // Top-left
        { x: centerX + 1, y: centerY - 1 }, // Top-right
        { x: centerX - 1, y: centerY + 1 }, // Bottom-left
        { x: centerX + 1, y: centerY + 1 }  // Bottom-right
    ];

    // Compter combien de coins sont occupés ou hors limite
    let occupiedCorners = 0;
    corners.forEach(corner => {
        if (corner.x < 0 || corner.x >= COLS || corner.y < 0 || corner.y >= ROWS) {
            occupiedCorners++; // Hors limite = occupé
        } else if (board[corner.y] && board[corner.y][corner.x] !== 0) {
            occupiedCorners++;
        }
    });

    // Si 3+ coins occupés, c'est un T-Spin valide
    if (occupiedCorners >= 3) {
        return tSpinType || 'normal';
    }

    return null;
}

// Phase 4 - Détecter Perfect Clear (board complètement vide)
function isPerfectClear() {
    for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] !== 0) {
                return false;
            }
        }
    }
    return true;
}

// Phase 4 - Afficher message spécial pour T-Spin et Perfect Clear
function showSpecialMessage(message) {
    const messageElement = document.getElementById('special-message');
    if (messageElement) {
        messageElement.innerText = message;
        messageElement.style.display = 'block';

        // Cacher après 2 secondes
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 2000);
    }
}

function actuallyRemoveLines() {
    const linesThisTurn = linesToClear.length;

    // Phase 4 - Détection T-Spin
    const isTSpin = detectTSpin();

    // Supprimer les lignes
    linesToClear.sort((a, b) => b - a); // Trier en ordre décroissant
    linesToClear.forEach(y => {
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
    });

    linesCleared += linesThisTurn;

    // Phase 4 - Nouveau système de scoring (Guideline Tetris)
    let pointsEarned = 0;
    let actionName = '';

    if (isTSpin) {
        // T-Spin scoring
        if (isTSpin === 'mini') {
            actionName = linesThisTurn === 1 ? 'T-Spin Mini Single' : 'T-Spin Mini';
            pointsEarned = linesThisTurn === 1 ? 200 : 400;
        } else {
            // T-Spin normal
            if (linesThisTurn === 1) {
                actionName = 'T-Spin Single';
                pointsEarned = 800;
            } else if (linesThisTurn === 2) {
                actionName = 'T-Spin Double';
                pointsEarned = 1200;
            } else if (linesThisTurn === 3) {
                actionName = 'T-Spin Triple';
                pointsEarned = 1600;
            }
        }

        // Back-to-Back T-Spin bonus
        if (backToBack > 0) {
            pointsEarned = Math.floor(pointsEarned * 1.5);
            actionName = 'Back-to-Back ' + actionName;
        }
        backToBack++;
    } else if (linesThisTurn === 4) {
        // Tetris
        actionName = 'Tetris';
        pointsEarned = 800;

        // Back-to-Back Tetris bonus
        if (backToBack > 0) {
            pointsEarned = 1200;
            actionName = 'Back-to-Back Tetris';
        }
        backToBack++;
    } else {
        // Line clears normaux
        const lineScores = [0, 100, 300, 500]; // Single, Double, Triple
        actionName = ['', 'Single', 'Double', 'Triple'][linesThisTurn] || '';
        pointsEarned = lineScores[linesThisTurn] || 0;
        backToBack = 0;
    }

    // Multiplier par niveau
    pointsEarned *= level;

    // Combo bonus
    if (combo > 0) {
        pointsEarned += combo * 50 * level;
    }
    combo++;

    // Perfect Clear bonus
    if (isPerfectClear()) {
        const perfectClearBonus = linesThisTurn === 1 ? 800 :
                                   linesThisTurn === 2 ? 1200 :
                                   linesThisTurn === 3 ? 1800 :
                                   linesThisTurn === 4 ? 2000 : 3500;
        pointsEarned += perfectClearBonus;
        showSpecialMessage('PERFECT CLEAR! +' + perfectClearBonus);
        audioManager.playPerfectClear(); // Phase 6 - Play sound
        gameStats.totalPerfectClears++; // Phase 7 - Track perfect clears
    } else if (isTSpin && linesThisTurn > 0) {
        showSpecialMessage(actionName + '! +' + pointsEarned);
        audioManager.playTSpin(); // Phase 6 - Play sound
        gameStats.totalTSpins++; // Phase 7 - Track T-Spins
    } else if (linesThisTurn === 4) {
        showSpecialMessage(actionName + '! +' + pointsEarned);
        audioManager.playTetris(); // Phase 6 - Play sound
        gameStats.totalTetrises++; // Phase 7 - Track Tetrises
    } else if (linesThisTurn > 0) {
        audioManager.playLineClear(linesThisTurn); // Phase 6 - Play sound
    }

    score += pointsEarned;

    // Reset rotation flag
    lastMoveWasRotation = false;
    tSpinType = null;

    updateLevel();
    updateCombo();
    updateBackToBack();
    updateScore();
    updateLinesGoal();

    linesToClear = [];
    clearingLines = false;
}

// Variables globales pour la pause
let isPaused = false;
let animationFrameId = null;

function togglePause() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pause');
    
    if (isPaused) {
        pauseBtn.classList.add('paused');
        cancelAnimationFrame(animationFrameId);
    } else {
        pauseBtn.classList.remove('paused');
        lastTime = 0;
        requestAnimationFrame(update);
    }
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let level = 1;
let linesCleared = 0;
let combo = 0;
let backToBack = 0;
let lockDelay = 0;
let lockDelayMax = 500;
let lockDelayMoves = 0;
let lockDelayMaxMoves = 15;
let board;
let piece;
let nextPieces = [];
let holdPiece = null;
let canHold = true;
let pieceCount = 0;
let gameStartTime = 0;
let linesToClear = [];
let clearingLines = false;
let gameMode = 'marathon';
let sprintGoal = 40;
let ultraTimeLimit = 120; // 2 minutes en secondes
let gameTimer = 0;

// Phase 4 - Advanced Scoring
let lastMoveWasRotation = false;
let tSpinType = null; // null, 'mini', 'normal'
let perfectClearBonus = 0;

// Phase 9 - Competitive Metrics
let totalMoves = 0;
let totalRotations = 0;
let totalHardDrops = 0;
let totalSoftDrops = 0;

// Phase 6 - Audio System
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.isMuted = false;
        this.volume = 0.3;
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTone(frequency, duration, type = 'sine', volumeMultiplier = 1) {
        if (this.isMuted || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(this.volume * volumeMultiplier, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playMove() {
        this.playTone(200, 0.05, 'square', 0.3);
    }

    playRotate() {
        this.playTone(400, 0.08, 'sine', 0.4);
    }

    playSoftDrop() {
        this.playTone(300, 0.03, 'triangle', 0.2);
    }

    playHardDrop() {
        this.playTone(150, 0.15, 'sawtooth', 0.5);
        setTimeout(() => this.playTone(100, 0.1, 'sawtooth', 0.5), 50);
    }

    playLineClear(lines) {
        const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        for (let i = 0; i < lines; i++) {
            setTimeout(() => {
                this.playTone(frequencies[i], 0.15, 'sine', 0.6);
            }, i * 80);
        }
    }

    playTetris() {
        this.playTone(1046.50, 0.1, 'sine', 0.7);
        setTimeout(() => this.playTone(1318.51, 0.1, 'sine', 0.7), 100);
        setTimeout(() => this.playTone(1567.98, 0.2, 'sine', 0.7), 200);
    }

    playTSpin() {
        this.playTone(880, 0.08, 'square', 0.6);
        setTimeout(() => this.playTone(1174.66, 0.08, 'square', 0.6), 80);
        setTimeout(() => this.playTone(1480, 0.12, 'square', 0.6), 160);
    }

    playPerfectClear() {
        const melody = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        melody.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.8), i * 100);
        });
    }

    playGameOver() {
        this.playTone(440, 0.3, 'sine', 0.6);
        setTimeout(() => this.playTone(415.30, 0.3, 'sine', 0.6), 300);
        setTimeout(() => this.playTone(349.23, 0.5, 'sine', 0.6), 600);
    }

    playHold() {
        this.playTone(660, 0.1, 'triangle', 0.4);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}

const audioManager = new AudioManager();

// Phase 8 - Settings System
let gameSettings = {
    volume: 30,
    showGhostPiece: true,
    showGridLines: true,
    startLevel: 1,
    colorblindMode: false,
    highContrast: false
};

// Phase 10 - Replay System
let isRecording = false;
let isReplaying = false;
let replayData = null;
let currentReplay = null;
let replayStartTime = 0;
let replayInputIndex = 0;
let replaySpeed = 1.0; // 1x speed by default

// Phase 10 - Replay structure
class Replay {
    constructor(seed, gameMode, gridType) {
        this.seed = seed;
        this.gameMode = gameMode;
        this.gridType = gridType;
        this.inputs = [];
        this.pieces = []; // Record piece sequence
        this.startTime = Date.now();
        this.metadata = {
            score: 0,
            lines: 0,
            level: 1,
            duration: 0,
            date: new Date().toISOString(),
            version: '1.0'
        };
    }

    recordInput(action, data = null) {
        const timestamp = Date.now() - this.startTime;
        this.inputs.push({ time: timestamp, action, data });
    }

    recordPiece(typeId) {
        this.pieces.push(typeId);
    }

    finalize(score, lines, level, duration) {
        this.metadata.score = score;
        this.metadata.lines = lines;
        this.metadata.level = level;
        this.metadata.duration = duration;
    }

    toJSON() {
        return {
            seed: this.seed,
            gameMode: this.gameMode,
            gridType: this.gridType,
            inputs: this.inputs,
            pieces: this.pieces,
            metadata: this.metadata
        };
    }

    static fromJSON(json) {
        const replay = new Replay(json.seed, json.gameMode, json.gridType);
        replay.inputs = json.inputs;
        replay.pieces = json.pieces || [];
        replay.metadata = json.metadata;
        replay.startTime = 0;
        return replay;
    }
}

// Phase 10 - Replay storage functions
function saveReplays() {
    const replays = getAllReplays();
    localStorage.setItem('tetrisReplays', JSON.stringify(replays));
}

function getAllReplays() {
    const saved = localStorage.getItem('tetrisReplays');
    return saved ? JSON.parse(saved) : [];
}

function addReplay(replay) {
    let replays = getAllReplays();
    replays.unshift(replay.toJSON()); // Add to beginning

    // Keep only top 10 replays by score
    replays.sort((a, b) => b.metadata.score - a.metadata.score);
    replays = replays.slice(0, 10);

    localStorage.setItem('tetrisReplays', JSON.stringify(replays));
}

function startRecording(seed, gameMode, gridType) {
    currentReplay = new Replay(seed, gameMode, gridType);
    isRecording = true;
    isReplaying = false;
}

function stopRecording() {
    if (currentReplay && isRecording) {
        const duration = Math.floor((Date.now() - currentReplay.startTime) / 1000);
        currentReplay.finalize(score, linesCleared, level, duration);
        addReplay(currentReplay);
    }
    isRecording = false;
    currentReplay = null;
}

function recordInput(action, data = null) {
    if (isRecording && currentReplay) {
        currentReplay.recordInput(action, data);
    }
}

// Phase 8 - Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('tetrisSettings');
    if (saved) {
        gameSettings = { ...gameSettings, ...JSON.parse(saved) };
    }
    applySettings();
}

// Phase 8 - Save settings to localStorage
function saveSettings() {
    localStorage.setItem('tetrisSettings', JSON.stringify(gameSettings));
}

// Phase 8 - Apply all settings
function applySettings() {
    // Apply volume
    audioManager.volume = gameSettings.volume / 100;
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    if (volumeSlider) volumeSlider.value = gameSettings.volume;
    if (volumeValue) volumeValue.innerText = gameSettings.volume;

    // Apply ghost piece toggle
    const ghostToggle = document.getElementById('ghost-piece-toggle');
    if (ghostToggle) ghostToggle.checked = gameSettings.showGhostPiece;

    // Apply grid lines toggle
    const gridToggle = document.getElementById('grid-lines-toggle');
    if (gridToggle) gridToggle.checked = gameSettings.showGridLines;

    // Apply start level
    const startLevelInput = document.getElementById('start-level');
    if (startLevelInput) startLevelInput.value = gameSettings.startLevel;

    // Apply colorblind mode
    const colorblindToggle = document.getElementById('colorblind-mode');
    if (colorblindToggle) colorblindToggle.checked = gameSettings.colorblindMode;

    // Apply high contrast
    const highContrastToggle = document.getElementById('high-contrast');
    if (highContrastToggle) highContrastToggle.checked = gameSettings.highContrast;

    // Apply colorblind colors if enabled
    if (gameSettings.colorblindMode) {
        applyColorblindPalette();
    }

    // Apply high contrast if enabled
    if (gameSettings.highContrast) {
        applyHighContrast();
    }
}

// Phase 8 - Colorblind-friendly palette
function applyColorblindPalette() {
    // Colorblind-safe colors (avoiding red-green confusion)
    const colorblindColors = [
        '#0173B2', // Blue (I)
        '#ECE133', // Yellow (O)
        '#DE8F05', // Orange (T)
        '#029E73', // Teal (S)
        '#CC78BC', // Pink (Z)
        '#CA9161', // Tan (L)
        '#949494'  // Grey (J)
    ];
    COLORS = [...colorblindColors];
}

// Phase 8 - High contrast mode
function applyHighContrast() {
    document.body.style.filter = 'contrast(1.5)';
}

// Phase 8 - Reset contrast
function resetContrast() {
    document.body.style.filter = '';
}

// Phase 8 - Reset settings to defaults
function resetSettings() {
    gameSettings = {
        volume: 30,
        showGhostPiece: true,
        showGridLines: true,
        startLevel: 1,
        colorblindMode: false,
        highContrast: false
    };
    applySettings();
    // Restore theme colors if colorblind mode was disabled
    if (!gameSettings.colorblindMode) {
        applyTheme(currentTheme);
    }
    // Reset contrast
    if (!gameSettings.highContrast) {
        resetContrast();
    }
    saveSettings();
}

// Phase 8 - Event listeners for settings modal
document.getElementById('view-settings').addEventListener('click', () => {
    applySettings(); // Sync UI with current settings
    document.getElementById('settings-modal').style.display = 'block';
});

document.getElementById('close-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').style.display = 'none';
});

// Close on backdrop click
document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target.id === 'settings-modal') {
        document.getElementById('settings-modal').style.display = 'none';
    }
});

// Phase 8 - Volume slider
document.getElementById('volume-slider').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('volume-value').innerText = value;
    gameSettings.volume = value;
    audioManager.volume = value / 100;
});

// Phase 8 - Ghost piece toggle
document.getElementById('ghost-piece-toggle').addEventListener('change', (e) => {
    gameSettings.showGhostPiece = e.target.checked;
});

// Phase 8 - Grid lines toggle
document.getElementById('grid-lines-toggle').addEventListener('change', (e) => {
    gameSettings.showGridLines = e.target.checked;
});

// Phase 8 - Start level input
document.getElementById('start-level').addEventListener('change', (e) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= 20) {
        gameSettings.startLevel = value;
    }
});

// Phase 8 - Colorblind mode toggle
document.getElementById('colorblind-mode').addEventListener('change', (e) => {
    gameSettings.colorblindMode = e.target.checked;
    if (e.target.checked) {
        applyColorblindPalette();
    } else {
        applyTheme(currentTheme); // Restore theme colors
    }
});

// Phase 8 - High contrast toggle
document.getElementById('high-contrast').addEventListener('change', (e) => {
    gameSettings.highContrast = e.target.checked;
    if (e.target.checked) {
        applyHighContrast();
    } else {
        resetContrast();
    }
});

// Phase 8 - Reset button
document.getElementById('reset-settings').addEventListener('click', () => {
    if (confirm('Réinitialiser tous les paramètres aux valeurs par défaut ?')) {
        resetSettings();
    }
});

// Phase 8 - Save button
document.getElementById('save-settings').addEventListener('click', () => {
    saveSettings();
    alert('Paramètres sauvegardés !');
    document.getElementById('settings-modal').style.display = 'none';
});

// Phase 10 - Replay viewer functions
function displayReplays() {
    const replays = getAllReplays();
    const replaysContent = document.getElementById('replays-content');

    if (replays.length === 0) {
        replaysContent.innerHTML = '<p style="text-align: center; color: #666;">Aucun replay enregistré. Jouez une partie pour créer votre premier replay !</p>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';

    replays.forEach((replay, index) => {
        const date = new Date(replay.metadata.date);
        const dateStr = date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR');

        const modeLabel = replay.gameMode === 'marathon' ? 'Marathon' :
                          replay.gameMode === 'sprint' ? 'Sprint' : 'Ultra';

        const gridLabel = replay.gridType === 'standard' ? '10×20' :
                          replay.gridType === 'square' ? '15×15' :
                          replay.gridType === 'wide' ? '25×15' :
                          replay.gridType === 'tall' ? '8×25' : '8×12';

        html += `<div style="border: 2px solid #9C27B0; padding: 15px; border-radius: 8px; background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);">`;
        html += `<div style="display: flex; justify-content: space-between; align-items: center;">`;
        html += `<div>`;
        html += `<h3 style="margin: 0 0 10px 0; color: #9C27B0;">🎬 Replay #${index + 1}</h3>`;
        html += `<p style="margin: 5px 0;"><strong>Score:</strong> ${replay.metadata.score.toLocaleString()}</p>`;
        html += `<p style="margin: 5px 0;"><strong>Lignes:</strong> ${replay.metadata.lines} | <strong>Niveau:</strong> ${replay.metadata.level}</p>`;
        html += `<p style="margin: 5px 0;"><strong>Mode:</strong> ${modeLabel} | <strong>Grille:</strong> ${gridLabel}</p>`;
        html += `<p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Date:</strong> ${dateStr}</p>`;
        html += `<p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Durée:</strong> ${formatTime(replay.metadata.duration)}</p>`;
        html += `<p style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Inputs:</strong> ${replay.inputs.length} actions | <strong>Pièces:</strong> ${replay.pieces.length}</p>`;
        html += `</div>`;
        html += `</div>`;
        html += `</div>`;
    });

    html += '</div>';
    replaysContent.innerHTML = html;
}

// Phase 10 - Event listeners for replays modal
document.getElementById('view-replays').addEventListener('click', () => {
    displayReplays();
    document.getElementById('replays-modal').style.display = 'block';
});

document.getElementById('close-replays').addEventListener('click', () => {
    document.getElementById('replays-modal').style.display = 'none';
});

// Close on backdrop click
document.getElementById('replays-modal').addEventListener('click', (e) => {
    if (e.target.id === 'replays-modal') {
        document.getElementById('replays-modal').style.display = 'none';
    }
});

// Phase 7 - Statistiques détaillées
let gameStats = {
    totalGames: 0,
    totalLines: 0,
    totalScore: 0,
    totalPlayTime: 0, // en secondes
    pieceStats: [0, 0, 0, 0, 0, 0, 0], // Count pour chaque tetromino (I, O, T, S, Z, L, J)
    highestCombo: 0,
    highestBackToBack: 0,
    totalTSpins: 0,
    totalPerfectClears: 0,
    totalTetrises: 0,
    fastestSprint: Infinity, // en secondes
    gamesWon: 0,
    gamesLost: 0
};

// Phase 7 - Achievements system
const ACHIEVEMENTS = [
    { id: 'first_game', name: 'Premier Pas', desc: 'Jouer une première partie', icon: '🎮', check: () => gameStats.totalGames >= 1 },
    { id: 'games_10', name: 'Joueur Régulier', desc: 'Jouer 10 parties', icon: '🎯', check: () => gameStats.totalGames >= 10 },
    { id: 'games_100', name: 'Vétéran', desc: 'Jouer 100 parties', icon: '⭐', check: () => gameStats.totalGames >= 100 },
    { id: 'first_tetris', name: 'Premier Tetris', desc: 'Réaliser un Tetris', icon: '🔷', check: () => gameStats.totalTetrises >= 1 },
    { id: 'tetris_master', name: 'Maître du Tetris', desc: 'Réaliser 50 Tetris', icon: '💎', check: () => gameStats.totalTetrises >= 50 },
    { id: 'first_tspin', name: 'T-Spin Novice', desc: 'Réaliser un T-Spin', icon: '🔄', check: () => gameStats.totalTSpins >= 1 },
    { id: 'tspin_expert', name: 'Expert T-Spin', desc: 'Réaliser 25 T-Spins', icon: '🌀', check: () => gameStats.totalTSpins >= 25 },
    { id: 'perfect_clear', name: 'Perfection', desc: 'Réaliser un Perfect Clear', icon: '✨', check: () => gameStats.totalPerfectClears >= 1 },
    { id: 'combo_5', name: 'Combo Warrior', desc: 'Réaliser un combo x5', icon: '🔥', check: () => gameStats.highestCombo >= 5 },
    { id: 'combo_10', name: 'Combo Master', desc: 'Réaliser un combo x10', icon: '💥', check: () => gameStats.highestCombo >= 10 },
    { id: 'lines_100', name: 'Centurion', desc: 'Clearer 100 lignes (total)', icon: '📏', check: () => gameStats.totalLines >= 100 },
    { id: 'lines_1000', name: 'Millénaire', desc: 'Clearer 1000 lignes (total)', icon: '📐', check: () => gameStats.totalLines >= 1000 },
    { id: 'score_10k', name: 'Score Solide', desc: 'Atteindre 10 000 points (total)', icon: '🏅', check: () => gameStats.totalScore >= 10000 },
    { id: 'score_100k', name: 'Score Légendaire', desc: 'Atteindre 100 000 points (total)', icon: '🏆', check: () => gameStats.totalScore >= 100000 },
    { id: 'sprint_fast', name: 'Sprinter', desc: 'Finir Sprint en moins de 2 min', icon: '⚡', check: () => gameStats.fastestSprint <= 120 },
    { id: 'sprint_pro', name: 'Pro Sprint', desc: 'Finir Sprint en moins de 1 min', icon: '🚀', check: () => gameStats.fastestSprint <= 60 },
    { id: 'time_1h', name: 'Marathonien', desc: 'Jouer 1h au total', icon: '⏰', check: () => gameStats.totalPlayTime >= 3600 },
    { id: 'time_10h', name: 'Accro', desc: 'Jouer 10h au total', icon: '🕐', check: () => gameStats.totalPlayTime >= 36000 },
    { id: 'win_10', name: 'Gagnant Né', desc: 'Gagner 10 parties', icon: '🎊', check: () => gameStats.gamesWon >= 10 },
    { id: 'win_50', name: 'Champion', desc: 'Gagner 50 parties', icon: '👑', check: () => gameStats.gamesWon >= 50 }
];

let unlockedAchievements = [];

// Phase 7 - Load achievements from localStorage
function loadAchievements() {
    const saved = localStorage.getItem('tetrisAchievements');
    if (saved) {
        unlockedAchievements = JSON.parse(saved);
    }
}

// Phase 7 - Save achievements to localStorage
function saveAchievements() {
    localStorage.setItem('tetrisAchievements', JSON.stringify(unlockedAchievements));
}

// Phase 7 - Check for new achievements
function checkAchievements() {
    const newlyUnlocked = [];

    ACHIEVEMENTS.forEach(achievement => {
        if (!unlockedAchievements.includes(achievement.id) && achievement.check()) {
            unlockedAchievements.push(achievement.id);
            newlyUnlocked.push(achievement);
        }
    });

    if (newlyUnlocked.length > 0) {
        saveAchievements();
        // Show notifications for new achievements
        newlyUnlocked.forEach((achievement, index) => {
            setTimeout(() => {
                showAchievementNotification(achievement);
            }, index * 2500); // Stagger notifications
        });
    }
}

// Phase 7 - Show achievement notification
function showAchievementNotification(achievement) {
    const notification = document.getElementById('achievement-notification');
    const icon = document.getElementById('achievement-icon');
    const name = document.getElementById('achievement-name');
    const desc = document.getElementById('achievement-desc');

    icon.innerText = achievement.icon;
    name.innerText = achievement.name;
    desc.innerText = achievement.desc;

    notification.style.display = 'block';
    notification.style.animation = 'slideIn 0.5s ease-out';

    // Hide after 2 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-out';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 500);
    }, 2000);
}

// Phase 7 - Load stats from localStorage
function loadStats() {
    const saved = localStorage.getItem('tetrisStats');
    if (saved) {
        gameStats = JSON.parse(saved);
    }
    loadAchievements(); // Also load achievements
}

// Phase 7 - Save stats to localStorage
function saveStats() {
    localStorage.setItem('tetrisStats', JSON.stringify(gameStats));
}

// Phase 7 - Update stats
function updateGameStats() {
    const playTime = Math.floor((Date.now() - gameStartTime) / 1000);
    gameStats.totalGames++;
    gameStats.totalLines += linesCleared;
    gameStats.totalScore += score;
    gameStats.totalPlayTime += playTime;

    if (combo > gameStats.highestCombo) {
        gameStats.highestCombo = combo;
    }

    if (backToBack > gameStats.highestBackToBack) {
        gameStats.highestBackToBack = backToBack;
    }

    // Sprint record
    if (gameMode === 'sprint' && linesCleared >= sprintGoal) {
        if (playTime < gameStats.fastestSprint) {
            gameStats.fastestSprint = playTime;
        }
        gameStats.gamesWon++;
    } else if (gameMode === 'ultra') {
        gameStats.gamesWon++;
    } else {
        gameStats.gamesLost++;
    }

    saveStats();
    checkAchievements(); // Phase 7 - Check for new achievements
}

function update(time = 0) {
    if (isPaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;

    // Gestion des timers selon le mode
    if (gameMode === 'sprint') {
        // Sprint: chronomètre qui monte
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        updateTimer(elapsed);
    } else if (gameMode === 'ultra') {
        // Ultra: compte à rebours
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        gameTimer = ultraTimeLimit - elapsed;
        updateTimer(gameTimer);

        if (gameTimer <= 0) {
            victoryScreen();
            return;
        }
    }

    // Check if piece is on ground
    const onGround = collide(piece.shape, piece.x, piece.y + 1);

    if (onGround) {
        lockDelay += deltaTime;

        // Lock piece if delay exceeded or max moves reached
        if (lockDelay >= lockDelayMax || lockDelayMoves >= lockDelayMaxMoves) {
            merge();
            resetPiece();
            sweepBoard();
            updateScore();
            lockDelay = 0;
            lockDelayMoves = 0;
            dropCounter = 0;
        }
    } else {
        lockDelay = 0;
        lockDelayMoves = 0;

        if (dropCounter > dropInterval) {
            piece.y++;
            dropCounter = 0;
        }
    }

    draw();
    drawNextQueue();
    drawHoldPiece();
    updateMetrics(); // Phase 9 - Update metrics in real-time
    animationFrameId = requestAnimationFrame(update);
}

function updateScore() {
    scoreElement.innerText = score;
}

function updateTimer(seconds) {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.innerText = formatTime(seconds);
    }
}

function updateLinesGoal() {
    const linesCountElement = document.getElementById('lines-count');
    if (linesCountElement) {
        linesCountElement.innerText = linesCleared;
    }

    // Vérifier la victoire en mode Sprint
    if (gameMode === 'sprint' && linesCleared >= sprintGoal) {
        victoryScreen();
    }
}

function updateCombo() {
    const comboElement = document.getElementById('combo');
    if (comboElement) {
        if (combo > 1) {
            comboElement.innerText = `Combo x${combo - 1}`;
            comboElement.style.display = 'block';
        } else {
            comboElement.style.display = 'none';
        }
    }
}

function updateBackToBack() {
    const b2bElement = document.getElementById('back-to-back');
    if (b2bElement) {
        if (backToBack > 1) {
            b2bElement.innerText = `Back-to-Back x${backToBack}`;
            b2bElement.style.display = 'block';
        } else {
            b2bElement.style.display = 'none';
        }
    }
}

// Phase 9 - Calculate competitive metrics
function calculateMetrics() {
    const elapsedSeconds = (Date.now() - gameStartTime) / 1000;
    if (elapsedSeconds === 0) return {pps: 0, apm: 0, kpp: 0, efficiency: 0};

    const pps = (pieceCount / elapsedSeconds).toFixed(2);
    const totalActions = totalMoves + totalRotations + totalHardDrops;
    const apm = ((totalActions / elapsedSeconds) * 60).toFixed(0);
    const kpp = pieceCount > 0 ? (totalActions / pieceCount).toFixed(2) : 0;
    const efficiency = pieceCount > 0 ? ((linesCleared / pieceCount) * 100).toFixed(1) : 0;

    return {pps, apm, kpp, efficiency};
}

// Phase 9 - Update metrics display
function updateMetrics() {
    const metrics = calculateMetrics();

    const ppsElement = document.getElementById('metric-pps');
    const apmElement = document.getElementById('metric-apm');
    const kppElement = document.getElementById('metric-kpp');
    const efficiencyElement = document.getElementById('metric-efficiency');

    if (ppsElement) ppsElement.innerText = metrics.pps;
    if (apmElement) apmElement.innerText = metrics.apm;
    if (kppElement) kppElement.innerText = metrics.kpp;
    if (efficiencyElement) efficiencyElement.innerText = metrics.efficiency + '%';
}

function resetLockDelay() {
    if (collide(piece.shape, piece.x, piece.y + 1)) {
        lockDelay = 0;
        lockDelayMoves++;
    }
}

// Mise à jour des event listeners
document.addEventListener('keydown', event => {
    const key = event.key;

    if (!isPaused) {
        if (key === 'ArrowLeft' || key === 'UIKeyInputLeftArrow') {
            recordInput('moveLeft'); // Phase 10 - Record input
            piece.x--;
            if (collide(piece.shape)) {
                piece.x++;
            } else {
                resetLockDelay();
                lastMoveWasRotation = false; // Reset rotation flag on movement
                totalMoves++; // Phase 9 - Track moves
            }
        } else if (key === 'ArrowRight' || key === 'UIKeyInputRightArrow') {
            recordInput('moveRight'); // Phase 10 - Record input
            piece.x++;
            if (collide(piece.shape)) {
                piece.x--;
            } else {
                resetLockDelay();
                lastMoveWasRotation = false; // Reset rotation flag on movement
                totalMoves++; // Phase 9 - Track moves
            }
        } else if (key === 'ArrowDown' || key === 'UIKeyInputDownArrow') {
            recordInput('softDrop'); // Phase 10 - Record input
            piece.y++;
            if (collide(piece.shape)) {
                piece.y--;
            } else {
                score += 1; // Soft drop scoring
                updateScore();
                lastMoveWasRotation = false; // Reset rotation flag on movement
            }
        } else if (key === 'ArrowUp' || key === 'UIKeyInputUpArrow') {
            recordInput('rotateRight'); // Phase 10 - Record input
            rotateRight();
        } else if (key === ' ') {
            recordInput('hardDrop'); // Phase 10 - Record input
            hardDrop();
        } else if (key === 'c' || key === 'C' || key === 'Shift') {
            recordInput('hold'); // Phase 10 - Record input
            holdCurrentPiece();
        }
    }
    if (key === 'p' || key === 'P') {
        togglePause();
    }
    if (key === 'r' || key === 'R') {
        restartGame();
    }
    draw();
});

// Ajout des gestionnaires d'événements pour les boutons
document.getElementById('left').addEventListener('click', () => {
    piece.x--;
    if (collide(piece.shape)) {
        piece.x++;
    }
    draw();
});

document.getElementById('right').addEventListener('click', () => {
    piece.x++;
    if (collide(piece.shape)) {
        piece.x--;
    }
    draw();
});

document.getElementById('down').addEventListener('click', () => {
    softDrop();
    draw();
});

document.getElementById('up').addEventListener('click', () => {
    rotateRight();
    draw();
});

document.getElementById('rotate-left').addEventListener('click', () => {
    if (!isPaused) {
        rotateLeft();
        draw();
    }
});

document.getElementById('rotate-right').addEventListener('click', () => {
    if (!isPaused) {
        rotateRight();
        draw();
    }
});

document.getElementById('pause').addEventListener('click', togglePause);

// Phase 6 - Mute button
document.getElementById('mute').addEventListener('click', () => {
    const isMuted = audioManager.toggleMute();
    const muteBtn = document.getElementById('mute');
    const icon = muteBtn.querySelector('i');

    if (isMuted) {
        icon.classList.remove('fa-volume-up');
        icon.classList.add('fa-volume-mute');
    } else {
        icon.classList.remove('fa-volume-mute');
        icon.classList.add('fa-volume-up');
    }
});

// Support tactile pour mobile
let touchStartX = null;
let touchStartY = null;

// Seuil minimum pour détecter un swipe (évite les mouvements accidentels)
const SWIPE_THRESHOLD = 30;

// Attacher les touch listeners UNIQUEMENT au canvas pour ne pas bloquer les boutons HTML
canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault(); // Empêche le scroll sur le canvas uniquement
}, {passive: false}); // Requis pour preventDefault() sur iOS Safari 11.3+

canvas.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Vérifier que le swipe dépasse le seuil minimum
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < SWIPE_THRESHOLD) {
        touchStartX = null;
        touchStartY = null;
        return; // Swipe trop petit, ignoré
    }

    // Ne traiter les swipes que si le jeu n'est pas en pause
    if (!isPaused) {
        // Détecter la direction du swipe
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                piece.x++;
                if (collide(piece.shape)) piece.x--;
            } else {
                piece.x--;
                if (collide(piece.shape)) piece.x++;
            }
        } else {
            if (deltaY > 0) {
                softDrop();
            } else {
                rotateRight();
            }
        }
        draw();
    }

    touchStartX = null;
    touchStartY = null;
    e.preventDefault();
}, {passive: false});

// Fonction pour redémarrer le jeu avec une nouvelle grille
function restartGame() {
    cancelAnimationFrame(animationFrameId);
    context.clearRect(0, 0, canvas.width, canvas.height);
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('grid-menu').style.display = 'block';
}
