// ==UserScript==
// @name         AMQ Switch Catbox
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  Make that you can change catbox server withotu vpn but if you have buffering issue they will still be here but you will have song at least.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// ==/UserScript==

if (document.querySelector("#loginPage")) return;

let catbox = false;
let fileName;

document.addEventListener("keydown", function (event) {
    if (event.key === 'g' && event.altKey) {
        catbox = !catbox;
        console.log(catbox ? "Catbox: NL" : "catbox: NA");
    }
});

new Listener("play next song", (payload) => {
    setTimeout(function () {
        let current = quizVideoController.moePlayers[quizVideoController.currentMoePlayerId].$player[0].getAttribute('src');
        if (current.startsWith("https://amq.catbox.video/")) {
            const parts = current.split('/');
            fileName = parts.pop();
        }
        let link;
        if(catbox) link = "https://nl.catbox.moe/" + fileName;
        else link = "https://files.catbox.moe/" + fileName;
        let sample= parseFloat(quizVideoController.moePlayers[quizVideoController.currentMoePlayerId].$player[0].currentTime.toFixed(2));
        quizVideoController.moePlayers[quizVideoController.currentMoePlayerId].$player[0].src=link;
        quizVideoController.moePlayers[quizVideoController.currentMoePlayerId].$player[0].currentTime=sample;
    }, 100);
}).bindListener();

new Listener("quiz next video info", (payload) => {
    setTimeout(function () {
        let nextVideo = payload.videoInfo.videoMap.catbox[0];
        const parts = nextVideo.split('/');
        fileName = parts[parts.length - 1];
    }, 100);
}).bindListener();
