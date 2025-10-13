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
    level = 1;
    linesCleared = 0;
    combo = 0;
    backToBack = 0;
    lockDelay = 0;
    lockDelayMoves = 0;
    dropInterval = 1000;
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
    requestAnimationFrame(update);
}

// Event listener pour le bouton de démarrage
document.getElementById('start-game').addEventListener('click', () => {
    const gridType = document.getElementById('grid-select').value;
    gameMode = document.getElementById('game-mode').value;
    initGame(gridType);
});

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

// Appeler au chargement de la page
displayHighScores();

const TETROMINOES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]],   // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[0, 1, 1], [1, 1, 0]], // S
    [[1, 1, 0], [0, 1, 1]], // Z
    [[1, 0, 0], [1, 1, 1]], // L
    [[0, 0, 1], [1, 1, 1]]  // J
];

// Mise à jour des couleurs pour plus de vivacité
const COLORS = [
    '#FF0000',  // Rouge vif pour I
    '#00FF00',  // Vert vif pour O
    '#0000FF',  // Bleu vif pour T
    '#FFFF00',  // Jaune vif pour S
    '#FF00FF',  // Magenta pour Z
    '#00FFFF',  // Cyan pour L
    '#FFA500'   // Orange pour J
];

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
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = '#000000';
    context.lineWidth = 0.1;
    context.strokeRect(0, 0, COLS, ROWS);

    drawMatrix(board, { x: 0, y: 0 });
    drawGhostPiece();
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

                // Bordure noire
                context.strokeStyle = '#000000';
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

    // Grille de fond
    context.strokeStyle = '#CCCCCC';
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

function initNextQueue() {
    nextPieces = [];
    for (let i = 0; i < 2; i++) {
        nextPieces.push(createPiece());
    }
}

function drawNextQueue() {
    nextContext.fillStyle = '#FFFFFF';
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
    holdContext.fillStyle = '#FFFFFF';
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
}

function rotateRight() {
    const originalShape = piece.shape;
    const newShape = originalShape[0].map((_, colIndex) =>
        originalShape.map(row => row[colIndex]).reverse()
    );
    tryRotate(newShape);
    totalRotations++; // Phase 9 - Track rotations
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

    const playTime = Math.floor((Date.now() - gameStartTime) / 1000);
    saveHighScore(score, linesCleared, level, playTime);

    board.forEach(row => row.fill(0));
    alert(`Game Over!\n\nScore: ${score}\nLignes: ${linesCleared}\nNiveau: ${level}\nTemps: ${formatTime(playTime)}`);

    restartGame();
}

function victoryScreen() {
    isPaused = true;
    cancelAnimationFrame(animationFrameId);

    const playTime = Math.floor((Date.now() - gameStartTime) / 1000);
    saveHighScore(score, linesCleared, level, playTime);

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
    } else if (isTSpin && linesThisTurn > 0) {
        showSpecialMessage(actionName + '! +' + pointsEarned);
    } else if (linesThisTurn === 4) {
        showSpecialMessage(actionName + '! +' + pointsEarned);
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
            piece.x--;
            if (collide(piece.shape)) {
                piece.x++;
            } else {
                resetLockDelay();
                lastMoveWasRotation = false; // Reset rotation flag on movement
                totalMoves++; // Phase 9 - Track moves
            }
        } else if (key === 'ArrowRight' || key === 'UIKeyInputRightArrow') {
            piece.x++;
            if (collide(piece.shape)) {
                piece.x--;
            } else {
                resetLockDelay();
                lastMoveWasRotation = false; // Reset rotation flag on movement
                totalMoves++; // Phase 9 - Track moves
            }
        } else if (key === 'ArrowDown' || key === 'UIKeyInputDownArrow') {
            piece.y++;
            if (collide(piece.shape)) {
                piece.y--;
            } else {
                score += 1; // Soft drop scoring
                updateScore();
                lastMoveWasRotation = false; // Reset rotation flag on movement
            }
        } else if (key === 'ArrowUp' || key === 'UIKeyInputUpArrow') {
            rotateRight();
        } else if (key === ' ') {
            hardDrop();
        } else if (key === 'c' || key === 'C' || key === 'Shift') {
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
