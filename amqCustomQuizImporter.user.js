// ==UserScript==
// @name         AMQ Custom Quiz Importer
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      2.1
// @description  Import custom quizzes from JSON files with multi-rule block support
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomQuizImporter.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomQuizImporter.user.js
// ==/UserScript==

if ($("#loginPage").length) return;

const MAX_RULE_BLOCKS = 25;
const MAX_SONG_COUNT = 250;

class ImportedFile {
    constructor(fileName, content, onUpdate) {
        this.fileName = fileName;
        this.content = content;
        this.onUpdate = onUpdate;
        this.songTypeSettings = { op: true, ed: true, in: true };
        this.parsedData = this.parseContent();
    }

    parseContent() {
        try {
            const jsonData = JSON.parse(this.content);
            return this.extractFromJSON(jsonData);
        } catch (e) {
            return this.extractFromText(this.content);
        }
    }

    extractFromJSON(jsonData) {
        const result = [];
        const items = Array.isArray(jsonData) ? jsonData : [jsonData];

        items.forEach(item => {
            if (item && typeof item === 'object') {
                if (item.annSongId !== undefined) {
                    result.push({ annSongId: item.annSongId });
                } else if (item.annId !== undefined) {
                    result.push({
                        annId: item.annId,
                        includeSongTypes: { ...this.songTypeSettings },
                        numberOfSongs: 250
                    });
                }
            }
        });

        return result.length > 0 ? result : this.extractFromText(this.content);
    }

    extractFromText(content) {
        const result = [];

        const extractWithPatterns = (patterns, createEntry) => {
            let found = false;
            patterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const value = match[1];
                    if (value.includes(',') || /\s/.test(value)) {
                        value.split(',')
                            .map(n => parseInt(n.trim()))
                            .filter(n => !isNaN(n))
                            .forEach(id => result.push(createEntry(id)));
                    } else {
                        result.push(createEntry(parseInt(value)));
                    }
                    found = true;
                }
            });
            return found;
        };

        const annSongIdPatterns = [
            /"annSongId"\s*:\s*(\d+)/g,
            /annSongId\s*:\s*(\d+)/g,
            /"annSongId"\s*:\s*\[([\d,\s]+)\]/g,
            /annSongId\s*:\s*\[([\d,\s]+)\]/g
        ];

        if (extractWithPatterns(annSongIdPatterns, id => ({ annSongId: id }))) {
            return result;
        }

        const annIdPatterns = [
            /"annId"\s*:\s*(\d+)/g,
            /annId\s*:\s*(\d+)/g,
            /"annId"\s*:\s*\[([\d,\s]+)\]/g,
            /annId\s*:\s*\[([\d,\s]+)\]/g
        ];

        extractWithPatterns(annIdPatterns, id => ({
            annId: id,
            includeSongTypes: { ...this.songTypeSettings },
            numberOfSongs: 250
        }));

        return result;
    }

    toggleSongType(type) {
        this.songTypeSettings[type] = !this.songTypeSettings[type];
        this.parsedData.forEach(item => {
            if (item.annId !== undefined) {
                item.includeSongTypes[type] = this.songTypeSettings[type];
            }
        });
        this.onUpdate();
    }

    get songCount() {
        return this.parsedData.filter(item => item.annSongId !== undefined).length;
    }

    get animeCount() {
        return this.parsedData.filter(item => item.annId !== undefined).length;
    }

    get hasAnimeData() {
        return this.animeCount > 0;
    }

    get displayText() {
        const parts = [];
        if (this.songCount > 0) parts.push(`${this.songCount} songs`);
        if (this.animeCount > 0) parts.push(`${this.animeCount} animes`);
        return parts.join(' | ');
    }
}

class RuleBlock {
    constructor(id, onRemove) {
        this.id = id;
        this.onRemove = onRemove;
        this.files = [];
        this.settings = {
            randomOrder: true,
            songCount: 20,
            guessTime: 20,
            extraGuessTime: 0,
            playBackSpeed: 1,
            samplePointStart: 0,
            samplePointEnd: 100,
            duplicates: true
        };
        this.createElement();
    }

    createElement() {
        this.$element = $(`
            <div class="import-rule-block" data-id="${this.id}">
                <div class="rule-block-header">
                    <h3>Rule Block ${this.id} <span class="rule-block-stats">(0 songs | 0 animes)</span></h3>
                    <button class="remove-rule-block-btn">Remove</button>
                </div>
                <div class="rule-block-settings">
                    <div class="setting-row">
                        <label>Song Count: <input type="number" class="song-count-input" min="1" max="250" value="20"></label>
                        <label><input type="checkbox" class="random-order-input" checked> Random Order</label>
                        <label><input type="checkbox" class="duplicates-input" checked> Allow Duplicates</label>
                    </div>
                    <div class="setting-row">
                        <label>Guess Time: <input type="number" class="guess-time-input" min="1" max="99" value="20">s</label>
                        <label>Extra Time: <input type="number" class="extra-time-input" min="0" max="20" value="0">s</label>
                        <label>Speed: <input type="number" class="speed-input" min="0.5" max="2" step="0.25" value="1">x</label>
                    </div>
                    <div class="setting-row">
                        <label>Sample Point: <input type="number" class="sample-start-input" min="0" max="100" value="0">% - <input type="number" class="sample-end-input" min="0" max="100" value="100">%</label>
                    </div>
                </div>
                <div class="rule-block-files"></div>
                <button class="add-file-btn">Add File</button>
            </div>
        `);

        this.bindEvents();
    }

    bindEvents() {
        this.$element.find('.remove-rule-block-btn').on('click', () => this.onRemove(this.id));
        this.$element.find('.add-file-btn').on('click', () => this.addFileDialog());

        const createNumberInput = (selector, property, min, max) => {
            this.$element.find(selector).on('change', (e) => {
                this.settings[property] = Math.min(Math.max(parseFloat(e.target.value) || min, min), max);
                e.target.value = this.settings[property];
            });
        };

        createNumberInput('.song-count-input', 'songCount', 1, 250);
        createNumberInput('.guess-time-input', 'guessTime', 1, 99);
        createNumberInput('.extra-time-input', 'extraGuessTime', 0, 20);
        createNumberInput('.speed-input', 'playBackSpeed', 0.5, 2);
        createNumberInput('.sample-start-input', 'samplePointStart', 0, 100);
        createNumberInput('.sample-end-input', 'samplePointEnd', 0, 100);

        this.$element.find('.random-order-input').on('change', (e) => {
            this.settings.randomOrder = e.target.checked;
        });

        this.$element.find('.duplicates-input').on('change', (e) => {
            this.settings.duplicates = e.target.checked;
        });
    }

    addFileDialog() {
        const fileInput = $('<input>', {
            type: 'file',
            accept: '.json',
            multiple: true,
            css: { display: 'none' }
        });

        fileInput.on('change', (event) => {
            Array.from(event.target.files).forEach(file => this.loadFile(file));
            fileInput.remove();
        });

        fileInput.appendTo('body').trigger('click');
    }

    loadFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedFile = new ImportedFile(file.name, e.target.result, () => this.updateStats());

                if (importedFile.parsedData.length === 0) {
                    alert(`No valid data found in ${file.name}`);
                    return;
                }

                this.files.push(importedFile);
                this.renderFiles();
                this.updateStats();
            } catch (error) {
                console.error('Error loading file:', error);
                alert(`Error loading ${file.name}: ${error.message}`);
            }
        };
        reader.readAsText(file);
    }

    removeFile(fileName) {
        this.files = this.files.filter(f => f.fileName !== fileName);
        this.renderFiles();
        this.updateStats();
    }

    renderFiles() {
        const $filesContainer = this.$element.find('.rule-block-files');
        $filesContainer.empty();

        this.files.forEach(file => {
            const $fileItem = $(`
                <div class="file-item">
                    <div class="file-info">
                        <span class="file-name">${file.fileName}</span>
                        <span class="file-stats">(${file.displayText})</span>
                    </div>
                    <div class="file-controls">
                        ${file.hasAnimeData ? `
                            <div class="song-type-toggles">
                                <span class="song-type-toggle ${file.songTypeSettings.op ? 'active' : ''}" data-type="op">OP</span>
                                <span class="song-type-toggle ${file.songTypeSettings.ed ? 'active' : ''}" data-type="ed">ED</span>
                                <span class="song-type-toggle ${file.songTypeSettings.in ? 'active' : ''}" data-type="in">INS</span>
                            </div>
                        ` : ''}
                        <button class="remove-file-btn">×</button>
                    </div>
                </div>
            `);

            $fileItem.find('.remove-file-btn').on('click', () => this.removeFile(file.fileName));
            $fileItem.find('.song-type-toggle').on('click', (e) => {
                const type = $(e.target).data('type');
                file.toggleSongType(type);
                $(e.target).toggleClass('active');
            });

            $filesContainer.append($fileItem);
        });
    }

    updateStats() {
        let totalSongs = 0;
        let totalAnimes = 0;

        this.files.forEach(file => {
            totalSongs += file.songCount;
            totalAnimes += file.animeCount;
        });

        const parts = [];
        if (totalSongs > 0) parts.push(`${totalSongs} songs`);
        if (totalAnimes > 0) parts.push(`${totalAnimes} animes`);

        this.$element.find('.rule-block-stats').text(`(${parts.join(' | ') || '0 songs | 0 animes'})`);
    }

    getAllData() {
        const allData = [];
        this.files.forEach(file => allData.push(...file.parsedData));
        return allData;
    }

    toQuizData() {
        const allData = this.getAllData();
        if (allData.length === 0) return null;

        const quizData = {
            randomOrder: this.settings.randomOrder,
            songCount: Math.min(this.settings.songCount, MAX_SONG_COUNT),
            duplicates: this.settings.duplicates,
            blocks: allData
        };

        quizData.guessTime = {
            guessTime: this.settings.guessTime,
            extraGuessTime: this.settings.extraGuessTime
        };

        quizData.playBackSpeed = {
            playBackSpeed: this.settings.playBackSpeed
        };

        quizData.samplePoint = {
            samplePoint: [this.settings.samplePointStart, this.settings.samplePointEnd]
        };
        quizData.guessModes = {
            song: true,
            tinyVideo: false,
            blurVideo: false
        };

        return quizData;
    }
}

class ImportManager {
    constructor() {
        this.ruleBlocks = [];
        this.nextBlockId = 1;
        this.createModal();
    }

    createModal() {
        this.$modal = $(`
            <div id="importModal" class="import-modal" style="display: none;">
                <div class="import-modal-content">
                    <div class="import-modal-header">
                        <h2>Import Custom Quiz</h2>
                        <button class="close-modal-btn">×</button>
                    </div>
                    <div class="import-modal-body">
                        <div class="quiz-info-section">
                            <label>Quiz Name: <input type="text" id="quizNameInput" maxlength="30" placeholder="Enter quiz name"></label>
                            <label>Quiz Description: <textarea id="quizDescriptionInput" maxlength="500" placeholder="Enter quiz description"></textarea></label>
                        </div>
                        <div id="ruleBlocksContainer"></div>
                        <button id="addRuleBlockBtn" class="add-rule-block-btn">Add Rule Block</button>
                    </div>
                    <div class="import-modal-footer">
                        <button id="finalizeImportBtn" class="finalize-btn">Finalize Import</button>
                        <button class="cancel-btn">Cancel</button>
                    </div>
                </div>
            </div>
        `);

        this.addStyles();
        $('body').append(this.$modal);
        this.bindEvents();
    }

    addStyles() {
        $('<style>').text(`
            .import-modal {
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.7);
            }
            .import-modal-content {
                background-color: #2c2c2c;
                margin: 2% auto;
                padding: 0;
                border: 2px solid #888;
                width: 90%;
                max-width: 1000px;
                max-height: 90vh;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                color: #fff;
            }
            .import-modal-header {
                padding: 15px 20px;
                border-bottom: 1px solid #444;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .import-modal-header h2 {
                margin: 0;
                font-size: 24px;
            }
            .close-modal-btn {
                background: none;
                border: none;
                color: #fff;
                font-size: 32px;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                line-height: 32px;
            }
            .import-modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }
            .quiz-info-section {
                margin-bottom: 20px;
            }
            .quiz-info-section label {
                display: block;
                margin-bottom: 10px;
            }
            .quiz-info-section input,
            .quiz-info-section textarea {
                width: 100%;
                padding: 8px;
                background: #1a1a1a;
                border: 1px solid #555;
                color: #fff;
                border-radius: 4px;
                font-size: 16px;
                font-family: inherit;
            }
            .quiz-info-section textarea {
                min-height: 80px;
                resize: vertical;
            }
            .import-rule-block {
                background: #1a1a1a;
                border: 2px solid #444;
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 15px;
            }
            .rule-block-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            .rule-block-header h3 {
                margin: 0;
                font-size: 18px;
            }
            .rule-block-stats {
                color: #aaa;
                font-size: 14px;
                font-weight: normal;
            }
            .remove-rule-block-btn {
                background: #d32f2f;
                color: white;
                border: none;
                padding: 6px 12px;
                cursor: pointer;
                border-radius: 4px;
            }
            .rule-block-settings {
                background: #252525;
                padding: 12px;
                border-radius: 4px;
                margin-bottom: 12px;
            }
            .setting-row {
                display: flex;
                gap: 15px;
                margin-bottom: 8px;
            }
            .setting-row:last-child {
                margin-bottom: 0;
            }
            .setting-row label {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 14px;
            }
            .setting-row input[type="number"] {
                width: 60px;
                padding: 4px;
                background: #1a1a1a;
                border: 1px solid #555;
                color: #fff;
                border-radius: 3px;
            }
            .setting-row input[type="checkbox"] {
                width: 16px;
                height: 16px;
            }
            .rule-block-files {
                margin-bottom: 10px;
            }
            .file-item {
                background: #252525;
                padding: 8px 12px;
                margin-bottom: 6px;
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
            }
            .file-info {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }
            .file-controls {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .file-name {
                font-weight: bold;
            }
            .file-stats {
                color: #aaa;
                font-size: 13px;
            }
            .song-type-toggles {
                display: flex;
                gap: 6px;
            }
            .song-type-toggle {
                padding: 4px 8px;
                background: #1a1a1a;
                border: 1px solid #555;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.2s;
            }
            .song-type-toggle.active {
                background: #4caf50;
                border-color: #4caf50;
                color: white;
            }
            .song-type-toggle:not(.active) {
                color: #d32f2f;
            }
            .remove-file-btn {
                background: #d32f2f;
                color: white;
                border: none;
                width: 24px;
                height: 24px;
                cursor: pointer;
                border-radius: 3px;
                font-size: 18px;
                line-height: 20px;
                padding: 0;
            }
            .add-file-btn, .add-rule-block-btn {
                background: #4caf50;
                color: white;
                border: none;
                padding: 8px 16px;
                cursor: pointer;
                border-radius: 4px;
                font-size: 14px;
            }
            .add-rule-block-btn {
                width: 100%;
                margin-top: 10px;
            }
            .import-modal-footer {
                padding: 15px 20px;
                border-top: 1px solid #444;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            .finalize-btn, .cancel-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
            }
            .finalize-btn {
                background: #2196f3;
                color: white;
            }
            .cancel-btn {
                background: #757575;
                color: white;
            }
        `).appendTo('head');
    }

    bindEvents() {
        this.$modal.find('.close-modal-btn, .cancel-btn').on('click', () => this.hide());
        this.$modal.find('#addRuleBlockBtn').on('click', () => this.addRuleBlock());
        this.$modal.find('#finalizeImportBtn').on('click', () => this.finalizeImport());
    }

    show() {
        this.reset();
        this.addRuleBlock();
        this.$modal.show();
    }

    hide() {
        this.$modal.hide();
    }

    reset() {
        this.ruleBlocks = [];
        this.nextBlockId = 1;
        this.$modal.find('#ruleBlocksContainer').empty();
        this.$modal.find('#quizNameInput').val('');
        this.$modal.find('#quizDescriptionInput').val('');
    }

    addRuleBlock() {
        if (this.ruleBlocks.length >= MAX_RULE_BLOCKS) {
            alert(`Maximum of ${MAX_RULE_BLOCKS} rule blocks reached`);
            return;
        }

        const ruleBlock = new RuleBlock(this.nextBlockId++, (id) => this.removeRuleBlock(id));
        this.ruleBlocks.push(ruleBlock);
        this.$modal.find('#ruleBlocksContainer').append(ruleBlock.$element);
    }

    removeRuleBlock(id) {
        if (this.ruleBlocks.length === 1) {
            alert('Cannot remove the last rule block');
            return;
        }

        this.ruleBlocks = this.ruleBlocks.filter(rb => rb.id !== id);
        this.$modal.find(`[data-id="${id}"]`).remove();
    }

    finalizeImport() {
        const quizName = this.$modal.find('#quizNameInput').val().trim();
        const quizDescription = this.$modal.find('#quizDescriptionInput').val().trim();

        if (!quizName) {
            alert('Please enter a quiz name');
            return;
        }

        const ruleBlocksData = this.ruleBlocks
            .map(rb => rb.toQuizData())
            .filter(data => data !== null);

        if (ruleBlocksData.length === 0) {
            alert('No valid rule blocks with files to import');
            return;
        }

        const quizData = {
            command: "save quiz",
            type: "quizCreator",
            data: {
                quizSave: {
                    name: quizName,
                    description: quizDescription || `Imported quiz with ${ruleBlocksData.length} rule block(s)`,
                    tags: [],
                    ruleBlocks: ruleBlocksData
                },
                quizId: null
            }
        };

        if (typeof socket !== 'undefined' && typeof socket.sendCommand === 'function') {
            socket.sendCommand(quizData);

            setTimeout(() => {
                document.querySelector('#cqsCreatorButtonContainer > div')?.click();
                setTimeout(() => {
                    document.querySelector('#cqsCreatorButtonContainer > div')?.click();
                }, 500);
            }, 2000);

            console.log(`Imported quiz "${quizName}" with ${ruleBlocksData.length} rule block(s)`);
            alert(`Successfully imported quiz "${quizName}" with ${ruleBlocksData.length} rule block(s)`);
            this.hide();
        } else {
            console.error('Socket not available');
            alert('Unable to import quiz. Please make sure you are on the custom quiz page');
        }
    }
}

const importManager = new ImportManager();

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
    importButton.on('click', () => importManager.show());
}

function initialize() {
    const checkInterval = setInterval(() => {
        if ($('#cqsSlotBuyButton').length) {
            clearInterval(checkInterval);
            addImportButton();
        }
    }, 1000);
}

$(document).ready(function () {
    initialize();

    $(document).on('DOMNodeInserted', function (e) {
        if ($(e.target).find('#cqsSlotBuyButton').length || $(e.target).is('#cqsSlotBuyButton')) {
            setTimeout(addImportButton, 100);
        }
    });
});
