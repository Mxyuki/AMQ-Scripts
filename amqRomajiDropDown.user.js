// ==UserScript==
// @name         AMQ Romaji DropDown
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.0.1
// @description  Replace dropdown with only Romaji anime names using cache
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqRomajiDropDown.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqRomajiDropDown.user.js
// ==/UserScript==

((function() {
    'use strict';

    let dropdownList = [];
    let isInitialized = false;

    // <-- Extract Japanese names from cache (optimized) -->
    function extractNamesFromCache(animeCache) {
        const nameSet = new Set();

        for (const animeEntry of Object.values(animeCache)) {
            const names = animeEntry.names;
            if (!names?.length) continue;

            // <-- Get ALL JA names, fallback to ALL EN names if no JA exists -->
            const jaNames = names.filter(n => n.language === 'JA');
            const enNames = names.filter(n => n.language === 'EN');
            const targetNames = jaNames.length > 0 ? jaNames : enNames;

            for (const nameObj of targetNames) {
                if (nameObj.name) {
                    nameSet.add(nameObj.name);
                }
            }
        }

        dropdownList = Array.from(nameSet);
        console.log(`[AMQ Romaji] Loaded ${dropdownList.length} anime names`);
    }

    // <-- Wait for dependency with Promise -->
    function waitFor(checkFn, maxAttempts = 40) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const interval = setInterval(() => {
                if (checkFn()) {
                    clearInterval(interval);
                    resolve();
                } else if (++attempts >= maxAttempts) {
                    clearInterval(interval);
                    reject(new Error('Timeout waiting for dependency'));
                }
            }, 250);
        });
    }

    // <-- Replace autocomplete list (cached) -->
    function hookAutoComplete() {
        const originalUpdateList = AutoCompleteController.prototype.updateList;

        AutoCompleteController.prototype.updateList = function() {
            if (this.version === null) {
                const listener = new Listener("get all song names", (payload) => {
                    this.version = payload.version;
                    this.list = dropdownList;
                    this.newList();
                    listener.unbindListener();
                });

                listener.bindListener();
                socket.sendCommand({ type: 'quiz', command: 'get all song names' });
            } else {
                const listener = new Listener("update all song names", (payload) => {
                    this.version = payload.version;

                    if (payload.deleted.length + payload.new.length > 0) {
                        this.list = dropdownList;
                        this.newList();
                    }

                    listener.unbindListener();
                });

                listener.bindListener();
                socket.sendCommand({
                    type: 'quiz',
                    command: 'update all song names',
                    data: { currentVersion: this.version }
                });
            }
        };
    }

    // <-- Initialize (async) -->
    async function initialize() {
        if (isInitialized) return;

        try {
            await waitFor(() => typeof libraryCacheHandler !== 'undefined');
            await waitFor(() => typeof AutoCompleteController !== 'undefined');

            hookAutoComplete();

            libraryCacheHandler.getCache((animeCache) => {
                extractNamesFromCache(animeCache);
                isInitialized = true;
            });

            console.log('[AMQ Romaji] Script initialized successfully');
        } catch (error) {
            console.error('[AMQ Romaji] Initialization failed:', error);
        }
    }

    // <-- Start -->
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
