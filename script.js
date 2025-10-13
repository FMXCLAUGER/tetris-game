const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
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

    // Ajuster les dimensions du canvas principal
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;

    // Ajuster les dimensions du canvas de la prochaine pièce
    nextCanvas.width = 4 * NEXT_BLOCK_SIZE;
    nextCanvas.height = 4 * NEXT_BLOCK_SIZE;

    // Réinitialiser le contexte avec la nouvelle échelle
    context.scale(BLOCK_SIZE, BLOCK_SIZE);
    nextContext.scale(NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);

    // Réinitialiser le jeu
    board = createBoard();
    score = 0;
    updateScore();
    piece = createPiece();
    nextPiece = createPiece();
    
    // Afficher le conteneur de jeu
    document.getElementById('game-container').style.display = 'flex';
    document.getElementById('grid-menu').style.display = 'none';

    // Démarrer le jeu
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

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// Modifier createPiece pour tenir compte de la largeur de la grille
function createPiece() {
    const typeId = Math.floor(Math.random() * TETROMINOES.length);
    const piece = TETROMINOES[typeId];
    return {
        x: Math.floor(COLS / 2) - Math.floor(piece[0].length / 2),
        y: 0,
        shape: piece,
        color: COLORS[typeId],
        typeId: typeId
    };
}

function draw() {
    // Fond blanc
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Dessiner le plateau de jeu avec une bordure
    context.strokeStyle = '#000000';
    context.lineWidth = 0.1;
    context.strokeRect(0, 0, COLS, ROWS);

    // Dessiner les pièces fixes et la pièce active
    drawMatrix(board, { x: 0, y: 0 });
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

function drawNextPiece() {
    // Effacer le canvas de la prochaine pièce
    nextContext.fillStyle = '#FFFFFF';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    const shape = nextPiece.shape;
    const color = nextPiece.color;

    // Ajuster l'échelle pour la prochaine pièce
    const scale = Math.min(
        (nextCanvas.width / NEXT_BLOCK_SIZE) / shape[0].length,
        (nextCanvas.height / NEXT_BLOCK_SIZE) / shape.length
    ) * 0.8;

    // Centrer la pièce
    const xOffset = ((nextCanvas.width / NEXT_BLOCK_SIZE) - (shape[0].length * scale)) / 2;
    const yOffset = ((nextCanvas.height / NEXT_BLOCK_SIZE) - (shape.length * scale)) / 2;

    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                // Dessiner le bloc
                nextContext.fillStyle = color;
                nextContext.fillRect(
                    (x * scale) + xOffset,
                    (y * scale) + yOffset,
                    scale * 0.9,
                    scale * 0.9
                );

                // Ajouter une bordure
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
    const pos = piece.x;
    let offset = 1;
    piece.shape = newShape;
    
    while (collide(piece.shape)) {
        piece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > piece.shape[0].length) {
            piece.x = pos;
            piece.shape = originalShape;
            return;
        }
    }
    draw();
}

function pieceDrop() {
    piece.y++;
    if (collide(piece.shape)) {
        piece.y--;
        merge();
        resetPiece();
        sweepBoard();
        updateScore();
    }
    dropCounter = 0;
}

function collide(shape) {
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[0].length; x++) {
            if (shape[y][x] !== 0) {
                const newY = y + piece.y;
                const newX = x + piece.x;

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
    piece = nextPiece;
    nextPiece = createPiece();
    drawNextPiece();
    if (collide(piece.shape)) {
        // Game Over
        board.forEach(row => row.fill(0));
        score = 0;
        updateScore();
        alert('Game Over');
    }
}

function sweepBoard() {
    let rowCount = 1;
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
let dropInterval = 1000; // 1 seconde
let lastTime = 0;
let score = 0;
let board = createBoard();
let piece = createPiece();
let nextPiece = createPiece();

function update(time = 0) {
    if (isPaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        piece.y++;
        if (collide(piece.shape)) {
            piece.y--;
            merge();
            resetPiece();
            sweepBoard();
            updateScore();
        }
        dropCounter = 0;
    }

    draw();
    drawNextPiece();
    animationFrameId = requestAnimationFrame(update);
}

function updateScore() {
    scoreElement.innerText = score;
}

// Mise à jour des event listeners
document.addEventListener('keydown', event => {
    // Support iOS/iPadOS external keyboard non-standard key values
    const key = event.key;

    if (!isPaused) {
        if (key === 'ArrowLeft' || key === 'UIKeyInputLeftArrow') {
            piece.x--;
            if (collide(piece.shape)) {
                piece.x++;
            }
        } else if (key === 'ArrowRight' || key === 'UIKeyInputRightArrow') {
            piece.x++;
            if (collide(piece.shape)) {
                piece.x--;
            }
        } else if (key === 'ArrowDown' || key === 'UIKeyInputDownArrow') {
            pieceDrop();
        } else if (key === 'ArrowUp' || key === 'UIKeyInputUpArrow') {
            rotateRight();
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
    pieceDrop();
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

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault(); // Empêche le scroll
}, {passive: false}); // Requis pour preventDefault() sur iOS Safari 11.3+

document.addEventListener('touchend', (e) => {
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
                pieceDrop();
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

// Démarrer le jeu
updateScore();
draw();
drawNextPiece();
requestAnimationFrame(update);
