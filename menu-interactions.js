/* ========================================
   TETRIS - MENU INTERACTIONS
   Modern UX/UI JavaScript
   ======================================== */

(function() {
    'use strict';

    // ========================================
    // INITIALIZATION
    // ========================================

    document.addEventListener('DOMContentLoaded', function() {
        initMenuInteractions();
        loadBestScores();
        updateTotalGamesPlayed();
        initRippleEffect();
    });

    // ========================================
    // MENU INTERACTIONS
    // ========================================

    function initMenuInteractions() {
        // Mode selection
        const modeCards = document.querySelectorAll('.mode-card');
        const gameModeSelect = document.getElementById('game-mode');

        modeCards.forEach(card => {
            card.addEventListener('click', function() {
                // Remove selected from all
                modeCards.forEach(c => c.classList.remove('selected'));

                // Add selected to clicked
                this.classList.add('selected');

                // Update hidden select
                const mode = this.getAttribute('data-mode');
                gameModeSelect.value = mode;

                // Update config summary
                updateConfigSummary();
            });
        });

        // Grid selection
        const gridOptions = document.querySelectorAll('.grid-option');
        const gridSelect = document.getElementById('grid-select');

        gridOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected from all
                gridOptions.forEach(o => o.classList.remove('selected'));

                // Add selected to clicked
                this.classList.add('selected');

                // Update hidden select
                const grid = this.getAttribute('data-grid');
                gridSelect.value = grid;

                // Update config summary
                updateConfigSummary();
            });
        });

        // Theme selection
        const themeOptions = document.querySelectorAll('.theme-option');
        const themeSelect = document.getElementById('theme-select');

        themeOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected from all
                themeOptions.forEach(o => o.classList.remove('selected'));

                // Add selected to clicked
                this.classList.add('selected');

                // Update hidden select
                const theme = this.getAttribute('data-theme');
                themeSelect.value = theme;

                // Update config summary
                updateConfigSummary();
            });
        });

        // Tab navigation
        const configTabs = document.querySelectorAll('.config-tab');
        const configPanels = document.querySelectorAll('.config-panel');

        configTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');

                // Update tabs
                configTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                // Update panels
                configPanels.forEach(panel => {
                    if (panel.getAttribute('data-panel') === targetTab) {
                        panel.classList.add('active');
                    } else {
                        panel.classList.remove('active');
                    }
                });
            });
        });

        // Difficulty level
        const startLevelNew = document.getElementById('start-level-new');
        const startLevelOld = document.getElementById('start-level');

        if (startLevelNew && startLevelOld) {
            startLevelNew.addEventListener('change', function() {
                startLevelOld.value = this.value;
            });
        }

        // Quick access cards - prevent default link behavior
        document.querySelectorAll('.quick-card').forEach(card => {
            card.addEventListener('click', function(e) {
                e.preventDefault();
            });
        });
    }

    // ========================================
    // CONFIG SUMMARY UPDATE
    // ========================================

    function updateConfigSummary() {
        const selectedMode = document.querySelector('.mode-card.selected');
        const selectedGrid = document.querySelector('.grid-option.selected');
        const selectedTheme = document.querySelector('.theme-option.selected');

        if (selectedMode && selectedGrid && selectedTheme) {
            const modeText = selectedMode.querySelector('.mode-card__title').textContent;
            const gridText = selectedGrid.querySelector('.grid-label').textContent;
            const themeText = selectedTheme.querySelector('.theme-name').textContent;

            const summary = `${modeText} • ${gridText} • ${themeText}`;
            document.getElementById('config-summary').textContent = summary;
        }
    }

    // ========================================
    // BEST SCORES & LEADERBOARD
    // ========================================

    function loadBestScores() {
        const scores = getHighScores();

        // Update mode stats
        updateModeStats(scores);

        // Update leaderboard
        updateLeaderboard(scores);
    }

    function updateModeStats(scores) {
        // Find best score for each mode
        const marathonScores = scores.filter(s => !s.mode || s.mode === 'marathon');
        const sprintScores = scores.filter(s => s.mode === 'sprint');
        const ultraScores = scores.filter(s => s.mode === 'ultra');

        // Marathon best score
        if (marathonScores.length > 0) {
            const best = marathonScores[0];
            const elem = document.querySelector('[data-stat="marathon"]');
            if (elem) elem.textContent = best.score.toLocaleString() + ' pts';
        }

        // Sprint best time
        if (sprintScores.length > 0) {
            const best = sprintScores.reduce((min, s) => s.time < min.time ? s : min);
            const elem = document.querySelector('[data-stat="sprint"]');
            if (elem && best.time) {
                elem.textContent = formatTime(best.time);
            }
        }

        // Ultra best score
        if (ultraScores.length > 0) {
            const best = ultraScores[0];
            const elem = document.querySelector('[data-stat="ultra"]');
            if (elem) elem.textContent = best.score.toLocaleString() + ' pts';
        }
    }

    function updateLeaderboard(scores) {
        const podium = document.getElementById('top-3-podium');
        const list = document.getElementById('scores-list');

        if (!podium || !list) return;

        // Clear existing content
        podium.innerHTML = '';
        list.innerHTML = '';

        if (scores.length === 0) {
            list.innerHTML = '<li style="text-align: center; padding: 20px; color: #6c757d;">Aucun score enregistré. Sois le premier !</li>';
            return;
        }

        // Top 3 Podium
        const top3 = scores.slice(0, 3);
        const medals = ['🥇', '🥈', '🥉'];
        const positions = [1, 2, 3];

        // Create podium in correct order: 2nd, 1st, 3rd
        const podiumOrder = [1, 0, 2]; // indices for 2nd, 1st, 3rd

        podiumOrder.forEach(index => {
            if (top3[index]) {
                const score = top3[index];
                const place = document.createElement('div');
                place.className = `podium__place podium__place--${index + 1}`;

                place.innerHTML = `
                    <div class="medal">${medals[index]}</div>
                    <span class="rank">#${index + 1}</span>
                    <span class="score">${score.score.toLocaleString()}</span>
                `;

                podium.appendChild(place);
            }
        });

        // Remaining scores (4-10)
        if (scores.length > 3) {
            scores.slice(3).forEach((score, index) => {
                const item = document.createElement('li');
                item.className = 'leaderboard__item';

                item.innerHTML = `
                    <span style="font-weight: 600; color: #6c757d; min-width: 40px;">#${index + 4}</span>
                    <span style="flex: 1; font-weight: 600;">${score.score.toLocaleString()} pts</span>
                    <span style="font-size: 14px; color: #6c757d;">${score.lines} lignes • Niv. ${score.level}</span>
                `;

                list.appendChild(item);
            });
        }
    }

    function getHighScores() {
        return window.TetrisUtils.safeGetItem('tetrisHighScores', [], window.TetrisUtils.validateHighScores);
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // ========================================
    // TOTAL GAMES COUNTER
    // ========================================

    function updateTotalGamesPlayed() {
        const defaultStats = {
            totalGames: 0,
            totalLines: 0,
            totalScore: 0,
            totalPlayTime: 0,
            pieceStats: [0, 0, 0, 0, 0, 0, 0],
            highestCombo: 0,
            highestBackToBack: 0,
            totalTSpins: 0,
            totalPerfectClears: 0,
            totalTetrises: 0,
            fastestSprint: Infinity,
            gamesWon: 0,
            gamesLost: 0
        };

        const stats = window.TetrisUtils.safeGetItem('tetrisStats', defaultStats, window.TetrisUtils.validateGameStats);
        const elem = document.getElementById('total-games-played');

        if (stats && elem) {
            const total = stats.totalGames || 0;
            elem.textContent = `${total.toLocaleString()} partie${total > 1 ? 's' : ''} jouée${total > 1 ? 's' : ''}`;
        }
    }

    // ========================================
    // RIPPLE EFFECT
    // ========================================

    function initRippleEffect() {
        // Add ripple to all clickable elements
        const clickables = document.querySelectorAll('.mode-card, .grid-option, .theme-option, .hero-cta, .quick-card');

        clickables.forEach(elem => {
            elem.style.position = 'relative';
            elem.style.overflow = 'hidden';

            elem.addEventListener('click', createRipple);
        });
    }

    function createRipple(event) {
        const button = event.currentTarget;

        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
        circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
        circle.classList.add('ripple');

        const ripple = button.getElementsByClassName('ripple')[0];
        if (ripple) {
            ripple.remove();
        }

        button.appendChild(circle);

        setTimeout(() => {
            circle.remove();
        }, 600);
    }

    // ========================================
    // KEYBOARD NAVIGATION
    // ========================================

    document.addEventListener('keydown', function(e) {
        // Arrow keys for mode selection
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const modeCards = Array.from(document.querySelectorAll('.mode-card'));
            const currentIndex = modeCards.findIndex(card => card.classList.contains('selected'));

            let newIndex;
            if (e.key === 'ArrowLeft') {
                newIndex = currentIndex > 0 ? currentIndex - 1 : modeCards.length - 1;
            } else {
                newIndex = currentIndex < modeCards.length - 1 ? currentIndex + 1 : 0;
            }

            if (newIndex !== currentIndex) {
                modeCards[newIndex].click();
                e.preventDefault();
            }
        }

        // Enter to start game
        if (e.key === 'Enter' && document.getElementById('grid-menu').style.display !== 'none') {
            document.getElementById('start-game').click();
            e.preventDefault();
        }
    });

    // ========================================
    // EXPORT FOR COMPATIBILITY
    // ========================================

    window.menuInteractions = {
        updateLeaderboard: updateLeaderboard,
        updateTotalGamesPlayed: updateTotalGamesPlayed,
        loadBestScores: loadBestScores
    };

})();
