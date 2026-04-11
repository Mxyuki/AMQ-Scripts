// ==UserScript==
// @name         AMQ Video Mode But Better
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.0
// @description  Let you resize the Tiny Video mode to your liking, and let you adjust the Blur to the ammount you want.
// @description  /tinysize <number> to edit the scale of the Tiny Mode, 0 to reset to default.
// @description  /blur <number> to choose how much blur you want, put reset or 25 to reset to default.
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @grant        none
// @run-at       document-idle
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqDiscretCommand.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqVideoModeButBetter.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqVideoModeButBetter.user.js
// ==/UserScript==

(function() {

    const DEFAULT_BLUR = 25;

    // <-- Separate style tags so tinysize and blur never interfere with each other -->
    const tinySizeStyle = document.createElement('style');
    const blurStyle     = document.createElement('style');
    document.head.appendChild(tinySizeStyle);
    document.head.appendChild(blurStyle);

    function applyScale(scale) {
        tinySizeStyle.textContent = `
            .qpVideoPlayer.tinyVideo {
                clip-path: polygon(
                    0 0,
                    25% 25%, 75% 25%,
                    75% 75%, 25% 75%,
                    25% 25%
                ) !important;
                transform: scale(${scale}) !important;
            }
            .qpVideoOverlay {
                height: 0px !important;
            }
        `;
        console.log('[TinySize] Scale set to', scale);
    }

    function removeTinyOverride() {
        tinySizeStyle.textContent = '';
        console.log('[TinySize] Override removed');
    }

    function applyBlur(px) {
        blurStyle.textContent = `
            .qpVideoPlayer.blurVideo {
                filter: blur(${px}px) !important;
            }
        `;
        console.log('[Blur] Blur set to', px + 'px');
    }

    // <-- Wait for CommandRegistry to be available -->
    const waitForRegistry = setInterval(() => {
        if (typeof window.CommandRegistry === 'undefined') return;
        clearInterval(waitForRegistry);

        window.CommandRegistry.register('/tinysize', (args) => {
            const input = parseFloat(args);

            if (isNaN(input)) {
                console.log('[TinySize] Invalid value, usage: /tinysize <number>');
                return;
            }

            if (input === 0) {
                removeTinyOverride();
                return;
            }

            // <-- User value + 2 becomes the final transform scale -->
            const scale = (input + 2).toFixed(2);
            applyScale(scale);
        });

        window.CommandRegistry.register('/blur', (args) => {
            const trimmed = args.trim();

            if (trimmed === 'reset') {
                applyBlur(DEFAULT_BLUR);
                return;
            }

            const input = parseFloat(trimmed);

            if (isNaN(input) || input < 0) {
                console.log('[Blur] Invalid value, usage: /blur <number> or /blur reset');
                return;
            }

            applyBlur(input);
        });

        console.log('[AMQ] Commands /tinysize and /blur registered');
    }, 300);

})();
