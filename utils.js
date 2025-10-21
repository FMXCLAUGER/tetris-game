/* ========================================
   TETRIS - UTILITIES & SECURITY
   Safe localStorage, DOM manipulation, Constants
   ======================================== */

(function() {
    'use strict';

    // ========================================
    // GAME CONSTANTS (Extracted Magic Numbers)
    // ========================================

    const CONSTANTS = {
        // Timing
        ANIMATION_DURATION: 200,          // Line clear animation (ms)
        LOCK_DELAY_MAX: 500,              // Maximum lock delay (ms)
        LOCK_DELAY_MAX_MOVES: 15,         // Maximum moves during lock delay
        METRICS_UPDATE_INTERVAL: 1000,    // Update metrics every second instead of every frame

        // Scoring
        BASE_DROP_INTERVAL: 1000,         // Base drop speed (ms)
        DROP_SPEED_MULTIPLIER: 50,        // Speed increase per level
        MIN_DROP_INTERVAL: 100,           // Minimum drop interval (ms)
        SOFT_DROP_POINTS: 1,              // Points per soft drop cell
        HARD_DROP_POINTS: 2,              // Points per hard drop cell

        // Sprint mode
        SPRINT_GOAL_LINES: 40,            // Lines to complete in Sprint mode
        ULTRA_TIME_LIMIT: 120,            // Time limit for Ultra mode (seconds)

        // Touch/Swipe
        SWIPE_THRESHOLD: 30,              // Minimum pixels for swipe detection

        // Canvas
        BLOCK_SIZE_MAX: 40,               // Maximum block size (px)
        CANVAS_VIEWPORT_RATIO: 0.8,       // Canvas size as % of viewport

        // Storage
        MAX_HIGH_SCORES: 10,              // Maximum high scores to keep
        MAX_REPLAYS: 10,                  // Maximum replays to store

        // UI
        ACHIEVEMENT_NOTIFICATION_DURATION: 2000,  // Achievement display time (ms)
        ACHIEVEMENT_STAGGER_DELAY: 2500,          // Delay between multiple achievements
        RIPPLE_EFFECT_DURATION: 600,              // Ripple animation duration (ms)
    };

    // ========================================
    // SAFE LOCALSTORAGE OPERATIONS
    // ========================================

    /**
     * Safely get item from localStorage with error handling and validation
     * @param {string} key - The localStorage key
     * @param {*} defaultValue - Default value if key doesn't exist or parsing fails
     * @param {Function} validator - Optional validation function
     * @returns {*} The parsed value or default value
     */
    function safeGetItem(key, defaultValue = null, validator = null) {
        try {
            const item = localStorage.getItem(key);

            if (item === null) {
                return defaultValue;
            }

            const parsed = JSON.parse(item);

            // Run validator if provided
            if (validator && typeof validator === 'function') {
                if (!validator(parsed)) {
                    console.warn(`[Storage] Validation failed for key: ${key}. Using default value.`);
                    return defaultValue;
                }
            }

            return parsed;
        } catch (error) {
            console.error(`[Storage] Error reading key "${key}":`, error.message);
            return defaultValue;
        }
    }

    /**
     * Safely set item in localStorage with error handling
     * @param {string} key - The localStorage key
     * @param {*} value - The value to store
     * @returns {boolean} True if successful, false otherwise
     */
    function safeSetItem(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error(`[Storage] Error writing key "${key}":`, error.message);

            // Check if quota exceeded
            if (error.name === 'QuotaExceededError') {
                console.warn('[Storage] localStorage quota exceeded. Consider cleaning old data.');
            }

            return false;
        }
    }

    /**
     * Safely remove item from localStorage
     * @param {string} key - The localStorage key
     * @returns {boolean} True if successful, false otherwise
     */
    function safeRemoveItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`[Storage] Error removing key "${key}":`, error.message);
            return false;
        }
    }

    /**
     * Check if localStorage is available
     * @returns {boolean} True if localStorage is available and functional
     */
    function isStorageAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('[Storage] localStorage is not available:', error.message);
            return false;
        }
    }

    // ========================================
    // DATA VALIDATORS
    // ========================================

    /**
     * Validate high scores structure
     * @param {Array} scores - The scores array to validate
     * @returns {boolean} True if valid
     */
    function validateHighScores(scores) {
        if (!Array.isArray(scores)) return false;

        return scores.every(score =>
            score !== null &&
            typeof score === 'object' &&
            typeof score.score === 'number' &&
            typeof score.lines === 'number' &&
            typeof score.level === 'number' &&
            score.score >= 0 &&
            score.lines >= 0 &&
            score.level >= 1
        );
    }

    /**
     * Validate game stats structure
     * @param {Object} stats - The stats object to validate
     * @returns {boolean} True if valid
     */
    function validateGameStats(stats) {
        if (!stats || typeof stats !== 'object') return false;

        const requiredFields = [
            'totalGames', 'totalLines', 'totalScore', 'totalPlayTime',
            'highestCombo', 'highestBackToBack', 'totalTSpins',
            'totalPerfectClears', 'totalTetrises', 'gamesWon', 'gamesLost'
        ];

        // Check all required fields exist and are numbers
        for (const field of requiredFields) {
            if (typeof stats[field] !== 'number' || stats[field] < 0) {
                return false;
            }
        }

        // Check pieceStats is an array of 7 numbers
        if (!Array.isArray(stats.pieceStats) || stats.pieceStats.length !== 7) {
            return false;
        }

        if (!stats.pieceStats.every(count => typeof count === 'number' && count >= 0)) {
            return false;
        }

        return true;
    }

    /**
     * Validate replay structure
     * @param {Object} replay - The replay object to validate
     * @returns {boolean} True if valid
     */
    function validateReplay(replay) {
        if (!replay || typeof replay !== 'object') return false;

        return (
            typeof replay.seed === 'number' &&
            typeof replay.gameMode === 'string' &&
            typeof replay.gridType === 'string' &&
            Array.isArray(replay.inputs) &&
            Array.isArray(replay.pieces) &&
            replay.metadata &&
            typeof replay.metadata.score === 'number'
        );
    }

    /**
     * Validate achievements array
     * @param {Array} achievements - The achievements array to validate
     * @returns {boolean} True if valid
     */
    function validateAchievements(achievements) {
        if (!Array.isArray(achievements)) return false;
        return achievements.every(id => typeof id === 'string' && id.length > 0);
    }

    /**
     * Validate settings structure
     * @param {Object} settings - The settings object to validate
     * @returns {boolean} True if valid
     */
    function validateSettings(settings) {
        if (!settings || typeof settings !== 'object') return false;

        return (
            typeof settings.volume === 'number' &&
            settings.volume >= 0 &&
            settings.volume <= 100 &&
            typeof settings.showGhostPiece === 'boolean' &&
            typeof settings.showGridLines === 'boolean' &&
            typeof settings.startLevel === 'number' &&
            settings.startLevel >= 1 &&
            settings.startLevel <= 20 &&
            typeof settings.colorblindMode === 'boolean' &&
            typeof settings.highContrast === 'boolean'
        );
    }

    // ========================================
    // SAFE DOM MANIPULATION
    // ========================================

    /**
     * Create element with safe text content
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {string} textContent - Safe text content
     * @returns {HTMLElement} The created element
     */
    function createElement(tag, attributes = {}, textContent = '') {
        const element = document.createElement(tag);

        // Set attributes
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'style' && typeof attributes[key] === 'object') {
                Object.assign(element.style, attributes[key]);
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });

        // Set text content (safe from XSS)
        if (textContent) {
            element.textContent = textContent;
        }

        return element;
    }

    /**
     * Sanitize HTML string by escaping special characters
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    function sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Format number with thousands separator
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    function formatNumber(num) {
        return num.toLocaleString();
    }

    /**
     * Format time in MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     */
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // ========================================
    // EVENT LISTENER MANAGER
    // ========================================

    class EventListenerManager {
        constructor() {
            this.listeners = [];
        }

        /**
         * Add event listener and track it for cleanup
         * @param {HTMLElement} element - Target element
         * @param {string} event - Event name
         * @param {Function} handler - Event handler
         * @param {Object} options - Event options
         */
        add(element, event, handler, options = {}) {
            element.addEventListener(event, handler, options);
            this.listeners.push({ element, event, handler, options });
        }

        /**
         * Remove all tracked event listeners
         */
        removeAll() {
            this.listeners.forEach(({ element, event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
            this.listeners = [];
        }

        /**
         * Get count of tracked listeners
         * @returns {number} Number of tracked listeners
         */
        count() {
            return this.listeners.length;
        }
    }

    // ========================================
    // THROTTLE & DEBOUNCE UTILITIES
    // ========================================

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    function throttle(func, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // ========================================
    // EXPORT PUBLIC API
    // ========================================

    window.TetrisUtils = {
        // Constants
        CONSTANTS,

        // Storage
        safeGetItem,
        safeSetItem,
        safeRemoveItem,
        isStorageAvailable,

        // Validators
        validateHighScores,
        validateGameStats,
        validateReplay,
        validateAchievements,
        validateSettings,

        // DOM
        createElement,
        sanitizeHTML,
        formatNumber,
        formatTime,

        // Event Management
        EventListenerManager,

        // Performance
        throttle,
        debounce
    };

    console.log('[TetrisUtils] Utilities module loaded successfully');

})();
