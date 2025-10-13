/* ========================================
   TETRIS - ORIENTATION DETECTION & HANDLING
   Android 16 Compliant Multi-Orientation Support
   ======================================== */

(function() {
    'use strict';

    // ========================================
    // ORIENTATION STATE
    // ========================================

    let currentOrientation = window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
    let orientationLockNotified = false;

    // ========================================
    // INITIALIZATION
    // ========================================

    document.addEventListener('DOMContentLoaded', function() {
        initOrientationDetection();
        applyOrientationOptimizations();
    });

    // ========================================
    // ORIENTATION DETECTION
    // ========================================

    function initOrientationDetection() {
        // Use matchMedia for orientation detection (modern approach)
        const portraitQuery = window.matchMedia('(orientation: portrait)');
        const landscapeQuery = window.matchMedia('(orientation: landscape)');

        // Initial orientation setup
        handleOrientationChange(portraitQuery.matches ? 'portrait' : 'landscape');

        // Listen for orientation changes
        portraitQuery.addEventListener('change', (e) => {
            if (e.matches) {
                handleOrientationChange('portrait');
            }
        });

        landscapeQuery.addEventListener('change', (e) => {
            if (e.matches) {
                handleOrientationChange('landscape');
            }
        });

        // Fallback: Listen to window resize for devices that don't fire orientation events properly
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const newOrientation = window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
                if (newOrientation !== currentOrientation) {
                    handleOrientationChange(newOrientation);
                }
            }, 150); // Debounce resize events
        });

        // Android 16 specific: Support for foldable devices
        if ('screen' in window && 'orientation' in window.screen) {
            window.screen.orientation.addEventListener('change', () => {
                const angle = window.screen.orientation.angle;
                const type = window.screen.orientation.type;

                // Determine orientation from angle
                const isPortrait = angle === 0 || angle === 180;
                const newOrientation = isPortrait ? 'portrait' : 'landscape';

                if (newOrientation !== currentOrientation) {
                    handleOrientationChange(newOrientation);
                }
            });
        }
    }

    // ========================================
    // ORIENTATION CHANGE HANDLER
    // ========================================

    function handleOrientationChange(newOrientation) {
        const previousOrientation = currentOrientation;
        currentOrientation = newOrientation;

        console.log(`[Orientation] Changed from ${previousOrientation} to ${newOrientation}`);

        // Update body data attribute for CSS targeting
        document.body.setAttribute('data-orientation', newOrientation);

        // Apply orientation-specific optimizations
        applyOrientationOptimizations();

        // Trigger custom event for other modules
        window.dispatchEvent(new CustomEvent('tetris:orientationchange', {
            detail: {
                orientation: newOrientation,
                previousOrientation: previousOrientation
            }
        }));

        // If game is active, potentially resize canvas
        resizeActiveGame();

        // Show helpful message on first orientation change
        if (!orientationLockNotified) {
            showOrientationMessage(newOrientation);
            orientationLockNotified = true;
        }
    }

    // ========================================
    // ORIENTATION-SPECIFIC OPTIMIZATIONS
    // ========================================

    function applyOrientationOptimizations() {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;

        // Apply orientation class for additional CSS hooks
        gameContainer.classList.remove('orientation-portrait', 'orientation-landscape');
        gameContainer.classList.add(`orientation-${currentOrientation}`);

        // Portrait-specific optimizations
        if (currentOrientation === 'portrait') {
            optimizeForPortrait();
        }
        // Landscape-specific optimizations
        else {
            optimizeForLandscape();
        }
    }

    function optimizeForPortrait() {
        // Portrait mode: Vertical layout, touch controls emphasized
        // The CSS Grid handles the layout, but we can add JS optimizations here

        // Ensure touch controls are easily accessible
        const controls = document.getElementById('controls');
        if (controls) {
            controls.style.touchAction = 'manipulation';
        }

        // Adjust canvas size if needed
        if (typeof window.initGame === 'function' && window.ROWS && window.COLS) {
            // Calculate optimal block size for portrait
            const maxHeight = window.innerHeight * 0.6; // Use 60% of height for portrait
            const maxWidth = window.innerWidth * 0.9;

            const blockWidth = Math.floor(maxWidth / window.COLS);
            const blockHeight = Math.floor(maxHeight / window.ROWS);

            window.BLOCK_SIZE_SUGGESTION = Math.min(blockWidth, blockHeight, 35);
        }
    }

    function optimizeForLandscape() {
        // Landscape mode: Horizontal layout, more screen real estate

        // Adjust canvas size if needed
        if (typeof window.initGame === 'function' && window.ROWS && window.COLS) {
            // Calculate optimal block size for landscape
            const maxWidth = window.innerWidth * 0.5; // Use 50% of width for landscape
            const maxHeight = window.innerHeight * 0.85;

            const blockWidth = Math.floor(maxWidth / window.COLS);
            const blockHeight = Math.floor(maxHeight / window.ROWS);

            window.BLOCK_SIZE_SUGGESTION = Math.min(blockWidth, blockHeight, 40);
        }
    }

    // ========================================
    // ACTIVE GAME RESIZE
    // ========================================

    function resizeActiveGame() {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;

        // Check if game is currently active
        const isGameActive = !gameContainer.classList.contains('hidden');

        if (isGameActive && window.initCanvas && window.context) {
            // Game is running - potentially resize canvas
            // This requires access to game state (ROWS, COLS, BLOCK_SIZE)

            // Emit event for game to handle resize
            window.dispatchEvent(new CustomEvent('tetris:resize-request'));
        }
    }

    // ========================================
    // ORIENTATION MESSAGES
    // ========================================

    function showOrientationMessage(orientation) {
        // Only show on mobile devices
        if (!isMobileDevice()) return;

        const message = orientation === 'portrait'
            ? 'Portrait mode: Controls below the game'
            : 'Landscape mode: Controls on the side';

        // Create temporary notification
        const notification = document.createElement('div');
        notification.className = 'orientation-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(102, 126, 234, 0.95);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideDown 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // ========================================
    // DEVICE DETECTION
    // ========================================

    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    }

    function isTablet() {
        const userAgent = navigator.userAgent.toLowerCase();
        return /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent);
    }

    function getDeviceType() {
        if (isTablet()) return 'tablet';
        if (isMobileDevice()) return 'mobile';
        return 'desktop';
    }

    // ========================================
    // VIEWPORT UTILITIES
    // ========================================

    function getViewportDimensions() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            // Use visual viewport for mobile browsers with address bar
            visualWidth: window.visualViewport ? window.visualViewport.width : window.innerWidth,
            visualHeight: window.visualViewport ? window.visualViewport.height : window.innerHeight
        };
    }

    // ========================================
    // FULLSCREEN API SUPPORT
    // ========================================

    function requestFullscreen() {
        const elem = document.documentElement;

        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) { // Safari
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { // IE11
            elem.msRequestFullscreen();
        }
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    function isFullscreen() {
        return !!(document.fullscreenElement ||
                  document.webkitFullscreenElement ||
                  document.msFullscreenElement);
    }

    // ========================================
    // SCREEN LOCK API (EXPERIMENTAL)
    // ========================================

    async function lockOrientation(mode) {
        // Screen Orientation API (experimental, Android/Chrome)
        if ('orientation' in screen && 'lock' in screen.orientation) {
            try {
                await screen.orientation.lock(mode); // 'portrait', 'landscape', 'natural', etc.
                console.log(`[Orientation] Locked to ${mode}`);
                return true;
            } catch (err) {
                console.warn('[Orientation] Lock failed:', err.message);
                return false;
            }
        }
        return false;
    }

    async function unlockOrientation() {
        if ('orientation' in screen && 'unlock' in screen.orientation) {
            screen.orientation.unlock();
            console.log('[Orientation] Unlocked');
        }
    }

    // ========================================
    // PUBLIC API
    // ========================================

    window.OrientationManager = {
        getCurrentOrientation: () => currentOrientation,
        getDeviceType: getDeviceType,
        isMobile: isMobileDevice,
        isTablet: isTablet,
        getViewportDimensions: getViewportDimensions,
        requestFullscreen: requestFullscreen,
        exitFullscreen: exitFullscreen,
        isFullscreen: isFullscreen,
        lockOrientation: lockOrientation,
        unlockOrientation: unlockOrientation
    };

    // ========================================
    // CSS ANIMATIONS FOR NOTIFICATIONS
    // ========================================

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from {
                transform: translateX(-50%) translateY(-100%);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }

        @keyframes slideUp {
            from {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
            to {
                transform: translateX(-50%) translateY(-100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

})();
