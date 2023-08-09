// ==UserScript==
// @name         AMQ No Sample Reset
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.2
// @description  When guessing phase end doesn't restart from the start sample but continue the music.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// ==/UserScript==

if(document.getElementById("loginPage"))return;

new Listener("answer results",(payload)=>{
    let endTime= parseFloat(quizVideoController.moePlayers[quizVideoController.currentMoePlayerId].$player[0].currentTime.toFixed(2));
    setTimeout(function(){
        quizVideoController.moePlayers[quizVideoController.currentMoePlayerId].$player[0].currentTime=endTime;
        quizVideoController.moePlayers[quizVideoController.currentMoePlayerId].$player[0].loop = true;
    },0.0001);
}).bindListener();
