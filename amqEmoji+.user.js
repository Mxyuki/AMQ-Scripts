// ==UserScript==
// @name         AMQ Emoji+
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  Let you change certain word in emoji, can only be seen by you.
// @description  I was too lazy to make a easy and clean interface, so if someone want to take it and make a clean version of it you can.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// ==/UserScript==

if (document.getElementById("startPage")) return;

// To add a new custom emoji just add one under the other oens : "wordReplaced": "link to your image",

const replacement = {
    "word1": "https://i.imgur.com/XTPCaa9.png",
    "word2": "https://i.imgur.com/bAmSHgO.png",
    "word3": "https://i.imgur.com/syptORo.png"
};

// Replace the words in message by the saved images above

function replaceWordWithImage(messageElement) {
    const messageText = messageElement.querySelector('.gcMessage').innerHTML;
    let replacedText = messageText;
    for (let word in replacement) {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        replacedText = replacedText.replace(regex, `<img class="amqEmoji" alt="${word}" draggable="false" src="${replacement[word]}" sizes="28px" data-emotename="${word}" data-emoteusesrcset="true" data-original-title="" title="">`);
    }
    messageElement.querySelector('.gcMessage').innerHTML = replacedText;
}

new Listener('game chat update', (payload) => {
    setTimeout(() => {
        payload.messages.forEach(message => {
            const messageElement = document.getElementById(`gcPlayerMessage-${message.messageId}`);
            if (messageElement) replaceWordWithImage(messageElement);
        });
    }, 10);
}).bindListener();
