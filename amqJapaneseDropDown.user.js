// ==UserScript==
// @name         AMQ Japanese DropDown
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.5.0
// @description  Make AMQ playable using Japanese characters.
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqCheckScriptVersion.js
// @downloadURL  https://raw.githubusercontent.com/Mxyuki/AMQ-Scripts/main/amqJapaneseDropDown.user.js
// @updateURL    https://raw.githubusercontent.com/Mxyuki/AMQ-Scripts/main/amqJapaneseDropDown.user.js
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_VERSION = "1.5.0";
    const JSON_URL = 'https://raw.githubusercontent.com/Mxyuki/amqJP/main/newDropDown.json';
    
    checkScriptVersion("AMQ Japanese DropDown", SCRIPT_VERSION);

    let animeDatabase = null;
    let romajiToJapaneseMap = new Map();
    let japaneseToRomajiMap = new Map();

    // <-- Database Management -->
    async function loadAnimeDatabase() {
        if (animeDatabase !== null) return;

        try {
            const response = await fetch(JSON_URL);
            
            if (!response.ok) {
                throw new Error(`Network response failed: ${response.statusText}`);
            }

            animeDatabase = await response.json();
            buildLookupMaps();
            
        } catch (error) {
            console.error('Failed to load anime database:', error);
            animeDatabase = {};
        }
    }

    function buildLookupMaps() {
        romajiToJapaneseMap.clear();
        japaneseToRomajiMap.clear();

        for (const id in animeDatabase) {
            const anime = animeDatabase[id];
            const romaji = anime.romaji;
            const japanese = anime.japanese;

            if (romaji && japanese) {
                romajiToJapaneseMap.set(romaji, japanese);
                japaneseToRomajiMap.set(japanese, romaji);
            }
        }
    }

    function getJapaneseList() {
        return Array.from(japaneseToRomajiMap.keys());
    }

    // <-- Title Conversion -->
    async function convertJapaneseToRomaji(japaneseTitle) {
        await loadAnimeDatabase();
        return japaneseToRomajiMap.get(japaneseTitle) || japaneseTitle;
    }

    async function convertRomajiToJapanese(romajiTitle) {
        await loadAnimeDatabase();
        return romajiToJapaneseMap.get(romajiTitle) || null;
    }

    // <-- Answer Submission Hook -->
    const originalSubmitAnswer = QuizTypeAnswerInputController.prototype.submitAnswer;

    QuizTypeAnswerInputController.prototype.submitAnswer = async function(answer) {
        const convertedAnswer = await convertJapaneseToRomaji(answer);
        originalSubmitAnswer.call(this, convertedAnswer);
    };

    // <-- AutoComplete List Override -->
    AutoCompleteController.prototype.updateList = function() {
        if (this.version === null) {
            const retrieveListListener = new Listener("get all song names", async function(payload) {
                this.version = payload.version;
                
                await loadAnimeDatabase();
                this.list = getJapaneseList();
                this.newList();
                
                retrieveListListener.unbindListener();
            }.bind(this));

            retrieveListListener.bindListener();
            socket.sendCommand({
                type: 'quiz',
                command: 'get all song names'
            });
        } else {
            const updateSongsListener = new Listener("update all song names", function(payload) {
                this.version = payload.version;

                if (payload.deleted.length + payload.new.length > 0) {
                    this.list = this.list.filter(name => !payload.deleted.includes(name));
                    this.list = this.list.concat(payload.new);
                    this.newList();
                }

                updateSongsListener.unbindListener();
            }.bind(this));

            updateSongsListener.bindListener();
            socket.sendCommand({
                type: 'quiz',
                command: 'update all song names',
                data: { currentVersion: this.version }
            });
        }
    };

    // <-- Answer Results Display Hook -->
    new Listener("answer results", async (payload) => {
        if (!payload.songInfo?.animeNames) return;

        const { romaji, english } = payload.songInfo.animeNames;
        await loadAnimeDatabase();

        const titleToLookup = romaji || english;
        if (!titleToLookup) return;

        const japaneseTitle = await convertRomajiToJapanese(titleToLookup);

        if (japaneseTitle) {
            setTimeout(() => {
                $('#qpAnimeName').text(japaneseTitle);
                fitTextToContainer($("#qpAnimeName"), $("#qpAnimeNameContainer"), 25, 11);
            }, 100);
        }
    }).bindListener();

})();
