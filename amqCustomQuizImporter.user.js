// ==UserScript==
// @name         AMQ Custom Quiz Importer
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.2
// @description  Import custom quizzes from JSON files from anisongdb.com
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqCheckScriptVersion.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomQuizImporter.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomQuizImporter.user.js
// ==/UserScript==

if ($("#loginPage").length) return;

let version = 1.2;
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
        // Try to parse as standard JSON first
        const jsonData = JSON.parse(content);
        const result = extractIdsFromJson(jsonData);

        if (result.length > 0) {
            return result;
        }
    } catch (e) {
        console.log("Standard JSON parsing failed, trying alternative formats", e);
    }

    // If JSON parsing failed or no IDs were found, try regex patterns
    return extractIdsFromText(content);
}

function extractIdsFromJson(data) {
    // First check for annSongId properties
    const annSongIds = extractSpecificIds(data, "annSongId");
    if (annSongIds.length > 0) {
        return annSongIds.map(id => ({ annSongId: id }));
    }

    // If no annSongId found, check for annId
    const annIds = extractSpecificIds(data, "annId");
    if (annIds.length > 0) {
        return annIds.map(id => ({
            annId: id,
            includeSongTypes: { op: true, ed: true, in: true },
            numberOfSongs: 250
        }));
    }

    return [];
}

function extractSpecificIds(data, idType) {
    const ids = [];

    // Case 1: Direct property on the root object
    if (data[idType] !== undefined && typeof data[idType] === 'number') {
        ids.push(data[idType]);
    }

    // Case 2: Array of IDs directly
    if (data[idType] !== undefined && Array.isArray(data[idType])) {
        data[idType].forEach(id => {
            if (typeof id === 'number') {
                ids.push(id);
            }
        });
    }

    // Case 3: Object with IDs as values
    if (data[idType] !== undefined && typeof data[idType] === 'object' && !Array.isArray(data[idType])) {
        for (const key in data[idType]) {
            const value = data[idType][key];
            if (typeof value === 'number') {
                ids.push(value);
            } else if (typeof value === 'string' && !isNaN(parseInt(value))) {
                ids.push(parseInt(value));
            }
        }
    }

    // Case 4: Array of objects with ID property
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item && typeof item === 'object' && item[idType] !== undefined) {
                if (typeof item[idType] === 'number') {
                    ids.push(item[idType]);
                } else if (Array.isArray(item[idType])) {
                    // Handle nested arrays like {annId: [1, 2, 3]}
                    item[idType].forEach(id => {
                        if (typeof id === 'number') {
                            ids.push(id);
                        } else if (typeof id === 'string' && !isNaN(parseInt(id))) {
                            ids.push(parseInt(id));
                        }
                    });
                } else if (typeof item[idType] === 'object') {
                    // Handle nested objects like {annId: {id1: 1, id2: 2}}
                    for (const key in item[idType]) {
                        const value = item[idType][key];
                        if (typeof value === 'number') {
                            ids.push(value);
                        } else if (typeof value === 'string' && !isNaN(parseInt(value))) {
                            ids.push(parseInt(value));
                        }
                    }
                }
            }
        });
    }

    // Search for deeply nested structures recursively
    if (typeof data === 'object' && data !== null) {
        for (const key in data) {
            // Skip the already processed idType property
            if (key === idType) continue;

            const value = data[key];
            if (typeof value === 'object' && value !== null) {
                // Recursive call for nested objects
                const nestedIds = extractSpecificIds(value, idType);
                ids.push(...nestedIds);
            }
        }
    }

    return ids;
}

function extractIdsFromText(content) {
    const result = [];

    // Pattern 1: "annSongId": <number> or "annSongId":<number>
    const annSongIdPattern = /"annSongId"\s*:\s*(\d+)/g;
    let match;
    while ((match = annSongIdPattern.exec(content)) !== null) {
        result.push({ annSongId: parseInt(match[1]) });
    }

    // Pattern 2: Look for array notation like "annSongId": [1, 2, 3]
    const annSongIdArrayPattern = /"annSongId"\s*:\s*\[([\d,\s]+)\]/g;
    while ((match = annSongIdArrayPattern.exec(content)) !== null) {
        const numbers = match[1].split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        numbers.forEach(id => {
            result.push({ annSongId: id });
        });
    }

    // If annSongId was found, return them (priority)
    if (result.length > 0) {
        return result;
    }

    // Pattern 3: "annId": <number> or "annId":<number>
    const annIdPattern = /"annId"\s*:\s*(\d+)/g;
    while ((match = annIdPattern.exec(content)) !== null) {
        result.push({
            annId: parseInt(match[1]),
            includeSongTypes: { op: true, ed: true, in: true },
            numberOfSongs: 250
        });
    }

    // Pattern 4: Look for array notation like "annId": [1, 2, 3]
    const annIdArrayPattern = /"annId"\s*:\s*\[([\d,\s]+)\]/g;
    while ((match = annIdArrayPattern.exec(content)) !== null) {
        const numbers = match[1].split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        numbers.forEach(id => {
            result.push({
                annId: id,
                includeSongTypes: { op: true, ed: true, in: true },
                numberOfSongs: 250
            });
        });
    }

    // Pattern 5: annSongId: <number> (without quotes)
    const unquotedAnnSongIdPattern = /annSongId\s*:\s*(\d+)/g;
    while ((match = unquotedAnnSongIdPattern.exec(content)) !== null) {
        // Make sure it's not already part of "annSongId" (with quotes)
        const prevChar = content.charAt(Math.max(0, match.index - 1));
        if (prevChar !== '"') {
            result.push({ annSongId: parseInt(match[1]) });
        }
    }

    // Pattern 6: annSongId: [1, 2, 3] (without quotes)
    const unquotedAnnSongIdArrayPattern = /annSongId\s*:\s*\[([\d,\s]+)\]/g;
    while ((match = unquotedAnnSongIdArrayPattern.exec(content)) !== null) {
        // Make sure it's not already part of "annSongId" (with quotes)
        const prevChar = content.charAt(Math.max(0, match.index - 1));
        if (prevChar !== '"') {
            const numbers = match[1].split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
            numbers.forEach(id => {
                result.push({ annSongId: id });
            });
        }
    }

    // If any annSongId was found, return them (priority)
    if (result.length > 0) {
        return result;
    }

    // Pattern 7: annId: <number> (without quotes)
    const unquotedAnnIdPattern = /annId\s*:\s*(\d+)/g;
    while ((match = unquotedAnnIdPattern.exec(content)) !== null) {
        // Make sure it's not already part of "annId" (with quotes)
        const prevChar = content.charAt(Math.max(0, match.index - 1));
        if (prevChar !== '"') {
            result.push({
                annId: parseInt(match[1]),
                includeSongTypes: { op: true, ed: true, in: true },
                numberOfSongs: 250
            });
        }
    }

    // Pattern 8: annId: [1, 2, 3] (without quotes)
    const unquotedAnnIdArrayPattern = /annId\s*:\s*\[([\d,\s]+)\]/g;
    while ((match = unquotedAnnIdArrayPattern.exec(content)) !== null) {
        // Make sure it's not already part of "annId" (with quotes)
        const prevChar = content.charAt(Math.max(0, match.index - 1));
        if (prevChar !== '"') {
            const numbers = match[1].split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
            numbers.forEach(id => {
                result.push({
                    annId: id,
                    includeSongTypes: { op: true, ed: true, in: true },
                    numberOfSongs: 250
                });
            });
        }
    }

    // Try to look for object notation in text format
    try {
        // Pattern 9: "annSongId": { ... } - Extract object contents and look for numbers
        const objectPattern = /"annSongId"\s*:\s*\{([^{}]*)\}/g;
        while ((match = objectPattern.exec(content)) !== null) {
            const objectContent = match[1];
            const numberMatches = objectContent.match(/\d+/g);
            if (numberMatches) {
                numberMatches.forEach(num => {
                    result.push({ annSongId: parseInt(num) });
                });
            }
        }

        // Pattern 10: "annId": { ... } - Extract object contents and look for numbers
        const annIdObjectPattern = /"annId"\s*:\s*\{([^{}]*)\}/g;
        while ((match = annIdObjectPattern.exec(content)) !== null) {
            const objectContent = match[1];
            const numberMatches = objectContent.match(/\d+/g);
            if (numberMatches) {
                numberMatches.forEach(num => {
                    result.push({
                        annId: parseInt(num),
                        includeSongTypes: { op: true, ed: true, in: true },
                        numberOfSongs: 250
                    });
                });
            }
        }
    } catch (e) {
        console.log("Object pattern extraction failed:", e);
    }

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

    // Check if this is an annId or annSongId import
    const isAnnIdImport = songData[0].annId !== undefined;

    // Set songCount based on import type
    let songCount;
    if (isAnnIdImport) {
        songCount = 250; // Always 250 for annId imports
    } else {
        songCount = Math.min(songData.length, 250); // Original behavior for annSongId
    }

    // Determine the type of data for description
    const dataType = isAnnIdImport ? "anime" : "song";

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
