// ==UserScript==
// @name         AMQ Custom Quiz Importer
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.1
// @description  Import custom quizzes from JSON files from anisongdb.com with support for multiple formats
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqCheckScriptVersion.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomQuizImporter.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomQuizImporter.user.js
// ==/UserScript==

if ($("#loginPage").length) return;

let version = 1.1;
checkScriptVersion("AMQ Custom Quiz Importer", version);

function addImportButton() {
    if (!$('#cqsSlotBuyButton').length || $('#cqsImportButton').length) return;

    const importButton = $('<div>', {
        id: 'cqsImportButton',
        class: 'leftTiltButton',
        css: {
            position: 'absolute',
            right: '-1px',
            top: '84px',
            fontSize: '20px',
            lineHeight: '20px',
            padding: '4px',
            paddingRight: '8px',
            paddingLeft: '22px',
            cursor: 'pointer',
            borderTop: '1px solid #1b1b1bde',
            zIndex: 2
        }
    }).append($('<div>').text('Import Quiz'));

    $('#cqsSlotBuyButton').parent().append(importButton);

    importButton.on('click', function () {
        const fileInput = $('<input>', {
            type: 'file',
            accept: '.json',
            css: { display: 'none' }
        });

        fileInput.on('change', function (event) {
            const file = event.target.files[0];
            if (file) {
                const fileName = file.name.replace('.json', '');
                const reader = new FileReader();
                reader.onload = function (e) {
                    try {
                        const content = e.target.result;
                        const songIds = parseSongIds(content);
                        importQuiz(songIds, fileName);
                    } catch (error) {
                        console.error('Error parsing file:', error);
                        alert('Error parsing file. Please ensure it\'s a valid JSON format.');
                    }
                    fileInput.remove();
                };
                reader.readAsText(file);
            } else {
                fileInput.remove();
            }
        });

        fileInput.appendTo('body');
        fileInput.trigger('click');
    });
}

function parseSongIds(content) {
    try {
        // Try to parse as standard JSON first
        const jsonData = JSON.parse(content);

        // Case 1: Array of objects with annSongId property
        if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].annSongId !== undefined) {
            return jsonData.map(item => ({ annSongId: item.annSongId }));
        }

        // Case 2: Object with annSongId array
        if (jsonData.annSongId && Array.isArray(jsonData.annSongId)) {
            return jsonData.annSongId.map(id => ({ annSongId: id }));
        }

        // Case 3: Array of IDs directly
        if (Array.isArray(jsonData) && typeof jsonData[0] === 'number') {
            return jsonData.map(id => ({ annSongId: id }));
        }

        // Case 4: Object with multiple annSongId keys (unlikely in valid JSON but we'll handle it)
        if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
            const ids = [];
            for (const key in jsonData) {
                if (key === 'annSongId' && typeof jsonData[key] === 'number') {
                    ids.push({ annSongId: jsonData[key] });
                }
            }
            if (ids.length > 0) return ids;
        }
    } catch (e) {
        console.log("Standard JSON parsing failed, trying alternative formats");
    }

    // Case 5: Handle non-standard format with multiple "annSongId: number" lines
    const regex = /annSongId\s*:\s*(\d+)/g;
    const matches = [...content.matchAll(regex)];
    if (matches.length > 0) {
        return matches.map(match => ({ annSongId: parseInt(match[1]) }));
    }

    // Case 6: Try to find any array of numbers in various brackets
    try {
        // Look for arrays in the format [num, num, ...] or (num, num, ...) or {num, num, ...}
        const arrayMatch = content.match(/[\[\(\{]([^\[\]\(\)\{\}]*)[\]\)\}]/);
        if (arrayMatch) {
            const numbers = arrayMatch[1].split(',')
                .map(s => parseInt(s.trim()))
                .filter(n => !isNaN(n));
            if (numbers.length > 0) {
                return numbers.map(id => ({ annSongId: id }));
            }
        }
    } catch (e) {
        console.log("Array extraction failed:", e);
    }

    // If all else fails, try to extract any numbers from the content
    const numberMatches = content.match(/\d+/g);
    if (numberMatches && numberMatches.length > 0) {
        return numberMatches.map(num => ({ annSongId: parseInt(num) }));
    }

    throw new Error("Could not extract song IDs from the provided file");
}

function importQuiz(songIds, fileName) {
    if (fileName.length > 30) {
        fileName = fileName.slice(0, 30);
    }

    if (!songIds || songIds.length === 0) {
        alert('No song IDs found in the imported file.');
        return;
    }

    let songNumber = Math.min(songIds.length, 250);

    const quizData = {
        command: "save quiz",
        type: "quizCreator",
        data: {
            quizId: null,
            quizSave: {
                name: fileName,
                description: songIds.length + " songs imported from: " + fileName,
                tags: [],
                ruleBlocks: [
                    {
                        randomOrder: true,
                        songCount: songNumber,
                        guessTime: {
                            guessTime: 20,
                            extraGuessTime: 0
                        },
                        playBackSpeed: {
                            playBackSpeed: 1
                        },
                        samplePoint: {
                            samplePoint: [0, 100]
                        },
                        blocks: songIds
                    }
                ]
            }
        }
    };

    if (typeof socket !== 'undefined' && typeof socket.sendCommand === 'function') {
        socket.sendCommand(quizData);

        setTimeout(() => {
            document.querySelector('#cqsCreatorButtonContainer > div').click();

            setTimeout(() => {
                document.querySelector('#cqsCreatorButtonContainer > div').click();
            }, 500);
        }, 2000);

        console.log(`🎵 Imported quiz "${fileName}" with ${songIds.length} songs!`);
        alert(`Imported quiz "${fileName}" with ${songIds.length} songs!`);
    } else {
        console.error('Socket not available.');
        alert('Unable to import quiz. Please make sure you\'re on the custom quiz page.');
    }
}

function initialize() {
    const checkForContainer = setInterval(() => {
        if ($('#cqsSlotBuyButton').length) {
            clearInterval(checkForContainer);
            addImportButton();
        }
    }, 1000);
}

function setupObserver() {
    $(document).on('DOMNodeInserted', function (e) {
        if ($(e.target).find('#cqsSlotBuyButton').length || $(e.target).is('#cqsSlotBuyButton')) {
            setTimeout(addImportButton, 100);
        }
    });
}

$(document).ready(function () {
    initialize();
    setupObserver();
});
