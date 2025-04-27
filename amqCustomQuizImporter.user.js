// ==UserScript==
// @name         AMQ Custom Quiz Importer
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.3
// @description  Import custom quizzes from JSON files from anisongdb.com with
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqCheckScriptVersion.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomQuizImporter.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomQuizImporter.user.js
// ==/UserScript==

if ($("#loginPage").length) return;

let version = 1.3;
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
                        const songData = parseImportData(content);
                        importQuiz(songData, fileName);
                    } catch (error) {
                        console.error('Error parsing file:', error);
                        alert('Error parsing file: ' + error.message);
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

function parseImportData(content) {
    try {
        // Try to parse as standard JSON
        const jsonData = JSON.parse(content);

        // Create an array to hold our final results
        const result = [];

        // Process array data
        if (Array.isArray(jsonData)) {
            jsonData.forEach(item => {
                // ONLY check for annSongId, ignore annId if annSongId exists
                if (item && typeof item === 'object' && item.annSongId !== undefined) {
                    result.push({ annSongId: item.annSongId });
                }
                // Only if no annSongId, then check for annId
                else if (item && typeof item === 'object' && item.annId !== undefined) {
                    result.push({
                        annId: item.annId,
                        includeSongTypes: { op: true, ed: true, in: true },
                        numberOfSongs: 250
                    });
                }
            });
        }
        // Process single object
        else if (jsonData && typeof jsonData === 'object') {
            // ONLY check for annSongId, ignore annId if annSongId exists
            if (jsonData.annSongId !== undefined) {
                result.push({ annSongId: jsonData.annSongId });
            }
            // Only if no annSongId, then check for annId
            else if (jsonData.annId !== undefined) {
                result.push({
                    annId: jsonData.annId,
                    includeSongTypes: { op: true, ed: true, in: true },
                    numberOfSongs: 250
                });
            }
        }

        // If we found any valid IDs, return them
        if (result.length > 0) {
            console.log("Parsed data:", result);
            return result;
        }

        // If we get here, no direct properties were found, so try to extract from text
        console.log("No direct properties found, trying text extraction");
        return extractIdsFromText(content);
    } catch (e) {
        console.log("JSON parsing failed, trying text extraction", e);
        return extractIdsFromText(content);
    }
}

function extractIdsFromText(content) {
    const result = [];

    // First search for annSongId patterns
    const annSongIdPatterns = [
        /"annSongId"\s*:\s*(\d+)/g,               // "annSongId": 123
        /annSongId\s*:\s*(\d+)/g,                  // annSongId: 123
        /"annSongId"\s*:\s*\[([\d,\s]+)\]/g,       // "annSongId": [1,2,3]
        /annSongId\s*:\s*\[([\d,\s]+)\]/g          // annSongId: [1,2,3]
    ];

    let foundAnnSongIds = false;

    // Try each pattern for annSongId
    for (const pattern of annSongIdPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            // For array patterns like [1,2,3]
            if (match[1].includes(',') || /\s/.test(match[1])) {
                const numbers = match[1].split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                numbers.forEach(id => {
                    result.push({ annSongId: id });
                });
            } else {
                // For single number patterns
                result.push({ annSongId: parseInt(match[1]) });
            }
            foundAnnSongIds = true;
        }
    }

    // If we found annSongIds, return them and don't look for annIds
    if (foundAnnSongIds) {
        console.log("Found annSongIds via text patterns:", result);
        return result;
    }

    // Only if no annSongIds were found, search for annId patterns
    const annIdPatterns = [
        /"annId"\s*:\s*(\d+)/g,                  // "annId": 123
        /annId\s*:\s*(\d+)/g,                     // annId: 123
        /"annId"\s*:\s*\[([\d,\s]+)\]/g,          // "annId": [1,2,3]
        /annId\s*:\s*\[([\d,\s]+)\]/g             // annId: [1,2,3]
    ];

    // Try each pattern for annId
    for (const pattern of annIdPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            // For array patterns like [1,2,3]
            if (match[1].includes(',') || /\s/.test(match[1])) {
                const numbers = match[1].split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                numbers.forEach(id => {
                    result.push({
                        annId: id,
                        includeSongTypes: { op: true, ed: true, in: true },
                        numberOfSongs: 250
                    });
                });
            } else {
                // For single number patterns
                result.push({
                    annId: parseInt(match[1]),
                    includeSongTypes: { op: true, ed: true, in: true },
                    numberOfSongs: 250
                });
            }
        }
    }

    console.log("Found IDs via text patterns:", result);
    return result;
}

function importQuiz(songData, fileName) {
    if (fileName.length > 30) {
        fileName = fileName.slice(0, 30);
    }

    if (!songData || songData.length === 0) {
        alert('No valid IDs found in the imported file. Make sure the file contains properly formatted annSongId or annId values.');
        return;
    }

    // Log the data being imported
    console.log("Final data being imported:", songData);

    // Check if this is an annId or annSongId import
    const isAnnIdImport = songData.some(item => item.annId !== undefined);
    const isAnnSongIdImport = songData.some(item => item.annSongId !== undefined);

    // Set songCount based on import type
    let songCount;
    if (isAnnIdImport && !isAnnSongIdImport) {
        songCount = 250; // Always 250 for annId imports only
    } else {
        songCount = Math.min(songData.length, 250); // For annSongId or mixed imports
    }

    // Determine the type of data for description
    let dataType;
    if (isAnnSongIdImport) {
        dataType = "song";
    } else {
        dataType = "anime";
    }

    const quizData = {
        command: "save quiz",
        type: "quizCreator",
        data: {
            quizId: null,
            quizSave: {
                name: fileName,
                description: songData.length + " " + dataType + "s imported from: " + fileName,
                tags: [],
                ruleBlocks: [
                    {
                        randomOrder: true,
                        songCount: songCount,
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
                        blocks: songData
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

        console.log(`🎵 Imported ${dataType} quiz "${fileName}" with ${songData.length} entries!`);
        alert(`Imported ${dataType} quiz "${fileName}" with ${songData.length} entries!`);
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
