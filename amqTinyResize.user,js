// ==UserScript==
// @name         AMQ Tiny Resize
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.0
// @description  Let you resize the Tiny Video mode to your liking (pls don't use to cheat), "/tinysize <number>" to chose your size you want, set to 0 to go back to normal.
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @grant        none
// @run-at       document-idle
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqDiscretCommand.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqTinyResize.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqTinyResize.user.js
// ==/UserScript==

(function() {

    // <-- Injected style tag that we swap out on each command -->
    const styleEl = document.createElement('style');
    document.head.appendChild(styleEl);

    function applyScale(scale) {
        styleEl.textContent = `
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

    function removeOverride() {
        styleEl.textContent = '';
        console.log('[TinySize] Override removed');
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
                removeOverride();
                return;
            }

            // <-- User value + 2 becomes the final transform scale -->
            const scale = (input + 2).toFixed(2);
            applyScale(scale);
        });

        console.log('[TinySize] Command /tinysize registered');
    }, 300);

})();
