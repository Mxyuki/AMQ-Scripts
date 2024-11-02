// ==UserScript==
// @name         AMQ Japanese DropDown
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.4.0
// @description  Make AMQ playable using Japanese characters.
// @description  Most scrapped info from ANN are accessible here https://github.com/Mxyuki/amqJP <- I need to edit this to match the new way.
// @description  If you want to upgrade it feel free to use anything I put there.
// @description  Remade the way I get the titles usingthe new Expand Library, still need some tweakingto be perfect but should be working  better now.
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqCheckScriptVersion.js
// @downloadURL  https://raw.githubusercontent.com/Mxyuki/AMQ-Scripts/main/amqJapaneseDropDown.user.js
// @updateURL    https://raw.githubusercontent.com/Mxyuki/AMQ-Scripts/main/amqJapaneseDropDown.user.js
// ==/UserScript==

(function() {
    'use strict';

    let version = "1.4.0";
    checkScriptVersion("AMQ Japanese DropDown", version);

    const githubJsonUrl = 'https://raw.githubusercontent.com/Mxyuki/amqJP/main/newDropDown.json';
    let jsonData = null;

    async function fetchJsonData() {
        try {
            let response = await fetch(githubJsonUrl);
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            jsonData = await response.json();
        } catch (error) {
            console.error('Failed to fetch JSON data:', error);
        }
    }

    async function convertJapaneseToRO(japaneseTitle) {
        if (!jsonData) {
            await fetchJsonData();
        }
        for (let item of jsonData) {
            if (item.JA === japaneseTitle) {
                return item.RO;
            }
        }
        return japaneseTitle;
    }

    let originalSubmitAnswer = QuizTypeAnswerInputController.prototype.submitAnswer;

    QuizTypeAnswerInputController.prototype.submitAnswer = async function(answer) {
        let convertedAnswer = await convertJapaneseToRO(answer);
        originalSubmitAnswer.call(this, convertedAnswer);
    };

    AutoCompleteController.prototype.updateList = function () {
        if (this.version === null) {
            let retriveListListener = new Listener("get all song names", async function (payload) {
                this.version = payload.version;
                if (!jsonData) {
                    await fetchJsonData();
                }
                if (Array.isArray(jsonData)) {
                    this.list = jsonData.map(item => item.JA);
                } else {
                    console.error('Invalid data format:', jsonData);
                    return;
                }
                this.newList();
                retriveListListener.unbindListener();
            }.bind(this));
            retriveListListener.bindListener();
            socket.sendCommand({
                type: 'quiz',
                command: 'get all song names'
            });
        } else {
            let updateSongsListener = new Listener("update all song names", function (payload) {
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
                data: {
                    currentVersion: this.version
                }
            });
        }
    };

    new Listener("answer results", async (payload) => {
        if (payload.songInfo && payload.songInfo.animeNames) {
            const { romaji, english } = payload.songInfo.animeNames;

            if (!jsonData) {
                await fetchJsonData();
            }

            let foundJA = null;

            if (romaji) {
                for (let item of jsonData) {
                    if (item.RO === romaji) {
                        foundJA = item.JA;
                        break;
                    }
                }
            }
            if (!foundJA && english) {
                for (let item of jsonData) {
                    if (item.EN === english) {
                        foundJA = item.JA;
                        break;
                    }
                }
            }
            if (foundJA) {
                setTimeout(() => {
                    $('#qpAnimeName').text(foundJA);
                    fitTextToContainer($("#qpAnimeName"), $("#qpAnimeNameContainer"), 25, 11);
                }, 100);
            }
        }
    }).bindListener();
})();
