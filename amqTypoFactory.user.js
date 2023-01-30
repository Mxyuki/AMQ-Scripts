// ==UserScript==
// @name         AMQ TypoFactory
// @namespace    https://github.com/Mxyuki
// @version      0.1
// @description  Press Alt + enter to create random typo in your answer
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// ==/UserScript==

if (document.getElementById("startPage")) return;

$('#qpAnswerInput').keyup(function(event) {
    if (event.altKey && event.keyCode == 13) {
        let string = $(this).val();

        function shuffleString(str, numOfChars) {
            let shuffled = str.split('');
            let indices = [];
            for (let i = 0; i < numOfChars; i++) {
                let randomIndex = Math.floor(Math.random() * shuffled.length);
                indices.push(randomIndex);
            }
            for (let i = 0; i < indices.length; i++) {
                let randomIndex = Math.floor(Math.random() * (indices.length - i)) + i;
                [shuffled[indices[i]], shuffled[indices[randomIndex]]] = [shuffled[indices[randomIndex]], shuffled[indices[i]]];
            }
            return shuffled.join('');
        }
        let words = string.split(" ");
        let shuffledWords = words.map(function(word) {
            return shuffleString(word, 5);
        });
        $(this).val(shuffledWords.join(" "));
    }
});
