# Tetris Game

Classic Tetris game with multiple grid configurations, built with vanilla JavaScript and HTML5 Canvas.

## Features

- **Multiple Grid Configurations**: Choose from 5 different board sizes
  - Standard (10×20) - Classic Tetris
  - Square (15×15)
  - Wide (25×15)
  - Tall (8×25)
  - Mini (8×12)

- **Responsive Design**: Dynamic canvas sizing that adapts to viewport
- **Multiple Control Methods**:
  - Keyboard controls (Arrow keys, P for pause, R for restart)
  - Touch controls for mobile devices (swipe gestures)
  - On-screen button controls

- **Game Features**:
  - Next piece preview
  - Score tracking (10 points per line, doubles for consecutive lines)
  - Pause/Resume functionality
  - Smooth animations using requestAnimationFrame

## How to Play

### Online
Visit: [Your deployed URL here]

### Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/FMXCLAUGER/tetris-game.git
   cd tetris-game
   ```

2. Open `index.html` in your browser, or use a local server:
   ```bash
   python3 -m http.server 8000
   ```
   Then navigate to `http://localhost:8000`

### Controls

**Keyboard:**
- ← → : Move piece left/right
- ↓ : Drop piece faster
- ↑ : Rotate piece clockwise
- P : Pause/Resume
- R : Restart game

**Mobile:**
- Swipe left/right: Move piece
- Swipe down: Drop piece
- Swipe up: Rotate piece

## Technologies

- Vanilla JavaScript (ES6+)
- HTML5 Canvas
- CSS3

## Project Structure

```
tetris-game/
├── index.html      # Main HTML file
├── script.js       # Game logic and rendering
├── style.css       # Styling
├── CLAUDE.md       # Development documentation
└── README.md       # This file
```

## License

MIT License - Feel free to use and modify this code.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
