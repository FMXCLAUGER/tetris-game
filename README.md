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

## Deployment

### Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/FMXCLAUGER/tetris-game)

**Manual Deployment:**

1. Push your code to GitHub (already done!)

2. Go to [Railway](https://railway.app/) and sign in

3. Click "New Project" → "Deploy from GitHub repo"

4. Select your `tetris-game` repository

5. Railway will automatically:
   - Detect the Node.js project
   - Install dependencies (`npm install`)
   - Run the start command (`npm start`)

6. Generate a public domain in the Settings tab

7. Your game is live!

**Environment Variables:**
No environment variables required - the app uses Railway's automatic `PORT` variable.

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/FMXCLAUGER/tetris-game.git
   cd tetris-game
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   Then navigate to `http://localhost:3000`

**Alternative (no dependencies):**
Simply open `index.html` in your browser, or use Python:
```bash
python3 -m http.server 8000
```

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
├── package.json    # Node.js dependencies and scripts
├── railway.json    # Railway deployment configuration
├── CLAUDE.md       # Development documentation
└── README.md       # This file
```

## License

MIT License - Feel free to use and modify this code.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
