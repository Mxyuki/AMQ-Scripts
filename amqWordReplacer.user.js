// ==UserScript==
// @name         AMQ Word Replacer
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  Let you change certain word with another word, can only be seen by you.
// @description  I was too lazy to make a easy and clean interface, so if someone want to take it and make a clean version of it you can.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// ==/UserScript==

if (document.getElementById("loginPage")) return;

// To add a new custom word just add one under the other ones: "wordReplaced": "new word",

const replacement = {
    "word1": "new word 1",
    "word2": "new word 2",
    "word3": "new word 3"
};

// Replace the words in message by the new words above

function replaceWord(messageElement) {
    const messageText = messageElement.querySelector('.gcMessage').innerHTML;
    let replacedText = messageText;
    for (let word in replacement) {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        replacedText = replacedText.replace(regex, replacement[word]);
    }
    messageElement.querySelector('.gcMessage').innerHTML = replacedText;
}

new Listener('game chat update', (payload) => {
    setTimeout(() => {
        payload.messages.forEach(message => {
            const messageElement = document.getElementById(`gcPlayerMessage-${message.messageId}`);
            if (messageElement) replaceWord(messageElement);
        });
    }, 10);
}).bindListener();
