// ==UserScript==
// @name         AMQ Custom Quiz Importer
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.0
// @description  Import custom quizzes from JSON files from anisongdb.com
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomQuizImporter.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomQuizImporte.user.js
// ==/UserScript==

(function() {
    'use strict';

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
                            const jsonData = JSON.parse(e.target.result);
                            importQuiz(jsonData, fileName);
                        } catch (error) {
                            console.error('Error parsing JSON:', error);
                            alert('Error parsing JSON file. Please ensure it\'s a valid JSON format.');
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

    function importQuiz(jsonData, fileName) {

        if (fileName.length > 30) {
            fileName = fileName.slice(0, 30);
        }

        const songIds = jsonData.map(item => ({ annSongId: item.annSongId }));

        if (songIds.length === 0) {
            alert('No song IDs found in the imported file.');
            return;
        }

        const quizData = {
            command: "save quiz",
            type: "quizCreator",
            data: {
                quizId: null,
                quizSave: {
                    name: fileName,
                    description: fileName,
                    tags: [],
                    ruleBlocks: [
                        {
                            randomOrder: true,
                            songCount: songIds.length,
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
                console.log('Clicked on "Browse" button');

                setTimeout(() => {
                    document.querySelector('#cqsCreatorButtonContainer > div').click();
                    console.log('Clicked on "Build" button');
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
        $(document).on('DOMNodeInserted', function(e) {
            if ($(e.target).find('#cqsSlotBuyButton').length || $(e.target).is('#cqsSlotBuyButton')) {
                setTimeout(addImportButton, 100);
            }
        });
    }

    $(document).ready(function() {
        initialize();
        setupObserver();
    });
})();
