// ==UserScript==
// @name         AMQ Japanese DropDown
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.3
// @description  Make AMQ playable using Japanese characters
// @description  I scraped ANN for the titles, and there might be Missing anime because the names didn't matched title in amq, or some didn't got scrapped for some reason.
// @description  Most scrapped info from ANN are accessible here https://github.com/Mxyuki/amqJP
// @description  If you want to upgrade it feel free to use anything i put here
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// @downloadURL  https://raw.githubusercontent.com/Mxyuki/AMQ-Scripts/main/amqJapaneseDropDown.user.js
// @updateURL    https://raw.githubusercontent.com/Mxyuki/AMQ-Scripts/main/amqJapaneseDropDown.user.js
// ==/UserScript==

(function() {
    'use strict';

    const githubJsonUrl = 'https://raw.githubusercontent.com/Mxyuki/amqJP/main/dropDown.json';
    let jsonData = null;

    async function fetchJsonData() {
        try {
            let response = await fetch(githubJsonUrl);
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            jsonData = await response.json();
        } catch (error) {
            console.error('Failed to fetch JSON data:', error);
        }
    }

    async function convertJapaneseToMain(japaneseTitle) {
        if (!jsonData) {
            await fetchJsonData();
        }
        for (let item of jsonData) {
            if (item.japanese_title === japaneseTitle) {
                return item.main_title;
            }
        }
        return japaneseTitle;
    }

    let originalSubmitAnswer = QuizTypeAnswerInputController.prototype.submitAnswer;

    QuizTypeAnswerInputController.prototype.submitAnswer = async function(answer) {
        let convertedAnswer = await convertJapaneseToMain(answer);
        console.log(`Converted answer: ${convertedAnswer}`);
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
                    this.list = jsonData.map(item => item.japanese_title);
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
        let name = payload.songInfo.altAnimeNames;
        if (Array.isArray(name)) {
            if (!jsonData) {
                await fetchJsonData();
            }
            for (let animeName of name) {
                let found = false;
                for (let item of jsonData) {
                    if (item.main_title === animeName) {
                         $('#qpAnimeName').text(item.japanese_title);
                        fitTextToContainer($("#qpAnimeName"), $("#qpAnimeNameContainer"), 25, 11);
                        found = true;
                        break;
                    }
                }
                if (found) {
                    break;
                }
            }
        }
    }).bindListener();
})();
