# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tetris game implementation in vanilla JavaScript using HTML5 Canvas. The game features multiple grid configurations, touch/keyboard controls, and a next-piece preview system.

## Running the Application

This is a static web application with no build process. To run:

1. Open `index.html` in a web browser
2. Alternatively, use a local server: `python3 -m http.server 8000` and navigate to `http://localhost:8000`

## Architecture

### Core Game Loop

The game uses `requestAnimationFrame` for the main game loop (`update()` function at script.js:374), which:
- Updates drop counter based on elapsed time
- Handles automatic piece dropping every 1000ms
- Calls `draw()` and `drawNextPiece()` for rendering
- Can be paused via `isPaused` flag

### Canvas System

Two separate canvas elements with different coordinate systems:
- **Main canvas**: Dynamic sizing based on grid configuration, uses `context.scale(BLOCK_SIZE, BLOCK_SIZE)` for normalized coordinates (script.js:46)
- **Next piece canvas**: Fixed at 4x4 grid using `NEXT_BLOCK_SIZE` constant (script.js:47)

### Grid Configuration

Five predefined grid configurations in `GRID_CONFIGS` (script.js:8-14):
- standard: 10×20 (classic Tetris)
- square: 15×15
- wide: 25×15
- tall: 8×25
- mini: 8×12

Block size is dynamically calculated via `calculateBlockSize()` (script.js:20-28) to fit 80% of viewport dimensions with 40px maximum.

### State Management

Global state variables (script.js:366-372):
- `board`: 2D array representing fixed pieces (0 = empty, 1-7 = tetromino type)
- `piece`: Current falling piece with `{x, y, shape, color, typeId}`
- `nextPiece`: Preview piece
- `score`: Current score (10 points per line, doubled for multiple lines)
- `isPaused`: Pause state
- `dropCounter`/`dropInterval`: Control piece falling speed

### Collision Detection

`collide()` function (script.js:297-315) checks:
1. Piece boundaries against grid edges (x: 0-COLS, y: 0-ROWS)
2. Overlap with fixed pieces in `board` array
3. Handles negative Y coordinates during piece spawn

### Rotation System

Two rotation functions with wall-kick logic:
- `rotateRight()`: Clockwise matrix transpose (script.js:260-266)
- `rotateLeft()`: Counter-clockwise (script.js:252-258)
- `tryRotate()`: Implements wall kicks by offsetting X position up to piece width (script.js:268-283)

### Rendering

`drawMatrix()` (script.js:126-180) renders blocks with:
- 0.8 block size with centered padding for grid visibility
- White highlight overlay (top-left) for 3D effect
- Background grid lines drawn independently
- Color lookup via `COLORS` array for piece types 1-7

### Input Handling

Three input systems:
1. **Keyboard**: Arrow keys for movement/rotation, P for pause, R for restart (script.js:403-431)
   - Supports both standard (`ArrowLeft`, `ArrowRight`, etc.) and iOS/iPadOS external keyboard values (`UIKeyInputLeftArrow`, etc.)
   - **Note**: iPad virtual keyboard has NO arrow keys - users must use touch gestures or external keyboard
2. **Button controls**: Grid layout for mobile (script.js:434-474)
3. **Touch gestures**: Swipe detection with 30px minimum threshold (script.js:476-531)
   - Uses `{passive: false}` for preventDefault() compatibility with Safari iOS 11.3+
   - Respects pause state (only processes swipes when `!isPaused`)
   - Horizontal swipes: move left/right
   - Down swipe: drop piece
   - Up swipe: rotate
   - Minimum swipe distance prevents accidental movements

### Game Initialization Flow

1. User selects grid configuration from dropdown
2. `initGame(gridType)` (script.js:31-65):
   - Sets ROWS, COLS, BLOCK_SIZE from selected config
   - Resizes both canvases
   - Reapplies canvas scaling
   - Creates new board and pieces
   - Starts animation loop

## Code Patterns

### Piece Creation
`createPiece()` (script.js:99-109) centers pieces horizontally using `Math.floor(COLS / 2) - Math.floor(piece[0].length / 2)`, making the system work across all grid sizes.

### Line Clearing
`sweepBoard()` (script.js:330-346) uses a bottom-up scan with labeled loop for efficient row detection. Score multiplier doubles for consecutive lines in single drop.

### Game Over Detection
Checked in `resetPiece()` (script.js:317-328) when new piece immediately collides. Resets board and score, shows alert.

### Pause System
`togglePause()` (script.js:352-364) cancels animation frame when paused and updates button icon via CSS class.

## Common Modifications

### Adjusting Game Speed
Modify `dropInterval` at script.js:367 (default: 1000ms). Consider progressive difficulty by decreasing this value as score increases.

### Adding New Tetrominos
Add shape to `TETROMINOES` array (script.js:73-81) and corresponding color to `COLORS` array (script.js:84-92). Arrays must stay synchronized.

### Changing Grid Background
Modify canvas fill in `draw()` (script.js:113) and grid line colors in `drawMatrix()` (script.js:166-179).

### Score Calculation
Modify scoring logic in `sweepBoard()` (script.js:343-344). Current formula: `rowCount * 10` where `rowCount` doubles per consecutive line.
