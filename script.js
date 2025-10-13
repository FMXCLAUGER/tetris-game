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
    updateScore();
    updateLevel();
    updateCombo();
    updateBackToBack();
    piece = createPiece();
    initNextQueue();
    drawHoldPiece();

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
    initGame(gridType);
});

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
                // Couleur principale du bloc
                const blockColor = color || COLORS[value - 1];
                context.fillStyle = blockColor;
                context.fillRect(
                    x + offset.x + padding,
                    y + offset.y + padding,
                    blockSize,
                    blockSize
                );

                // Effet de lumière (haut-gauche plus clair)
                context.fillStyle = 'rgba(255, 255, 255, 0.3)';
                context.fillRect(
                    x + offset.x + padding,
                    y + offset.y + padding,
                    blockSize / 2,
                    blockSize / 2
                );

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
}

function rotateRight() {
    const originalShape = piece.shape;
    const newShape = originalShape[0].map((_, colIndex) => 
        originalShape.map(row => row[colIndex]).reverse()
    );
    tryRotate(newShape);
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

    for (const kick of kickTests) {
        piece.x = originalX + kick.x;
        piece.y = originalY + kick.y;

        if (!collide(piece.shape)) {
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
    }
}

function hardDrop() {
    let dropDistance = 0;
    while (!collide(piece.shape, piece.x, piece.y + 1)) {
        piece.y++;
        dropDistance++;
    }
    score += dropDistance * 2;
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
    drawNextQueue();
    if (collide(piece.shape)) {
        board.forEach(row => row.fill(0));
        score = 0;
        updateScore();
        alert('Game Over');
    }
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
    let rowCount = 1;
    let linesThisTurn = 0;
    outer: for (let y = board.length - 1; y > 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }

        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;

        score += rowCount * 10;
        rowCount *= 2;
        linesThisTurn++;
    }

    if (linesThisTurn > 0) {
        linesCleared += linesThisTurn;

        // Tetris (4 lines) detection
        if (linesThisTurn === 4) {
            // Back-to-Back bonus (50% extra)
            if (backToBack > 0) {
                score += Math.floor((rowCount - 1) * 10 * 0.5);
            }
            backToBack++;
        } else {
            backToBack = 0;
        }

        // Combo bonus
        if (combo > 0) {
            score += combo * 50 * level;
        }
        combo++;

        updateLevel();
        updateCombo();
        updateBackToBack();
    } else {
        // Reset combo si aucune ligne clearée
        if (combo > 0) {
            combo = 0;
            updateCombo();
        }
    }
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

function update(time = 0) {
    if (isPaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;

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
    animationFrameId = requestAnimationFrame(update);
}

function updateScore() {
    scoreElement.innerText = score;
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
            }
        } else if (key === 'ArrowRight' || key === 'UIKeyInputRightArrow') {
            piece.x++;
            if (collide(piece.shape)) {
                piece.x--;
            } else {
                resetLockDelay();
            }
        } else if (key === 'ArrowDown' || key === 'UIKeyInputDownArrow') {
            piece.y++;
            if (collide(piece.shape)) {
                piece.y--;
            } else {
                score += 1; // Soft drop scoring
                updateScore();
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
