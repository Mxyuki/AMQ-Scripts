// ==UserScript==
// @name         AMQ Short Name
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  Make that you can easily add custom short answer to write a longer anime title.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// ==/UserScript==

if (document.getElementById("startPage")) return;

// Add the custom one you want here like that :
// "Short Name": "Long Name"

const replace = {
    "dal": "Date A Live",
    "dal2": "Date A Live II",
    "dal3": "Date A Live III",
    "denyuden": "Densetsu no Yuusha no Densetsu",
    "ubw": "Fate/stay night: Unlimited Blade Works",
};

function replaceTitle(answer) {
    for (let word in replace) {
        if(word == answer.toLowerCase()){
            socket.sendCommand({
                type: "quiz",
                command: "quiz answer",
                data: {
                    answer: replace[word],
                    isPlaying: quizVideoController.currentVideoPlaying(),
                    volumeAtMax: getVolumeAtMax(),
                },
            });
        }
    }
}

new Listener('quiz answer', (payload) => {
    replaceTitle(payload.answer);
}).bindListener();
