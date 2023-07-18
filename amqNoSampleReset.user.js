// ==UserScript==
// @name         AMQ No Sample Reset
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  When guessing phase end doesn't restart from the start sample but continue the music.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// ==/UserScript==
if(document.getElementById("startPage"))return;new Listener("answer results",(payload)=>{let endTime=parseFloat(quizVideoController.moePlayers[quizVideoController.currentMoePlayerId].$player[0].currentTime.toFixed(2));setTimeout(function(){quizVideoController.moePlayers[quizVideoController.currentMoePlayerId].$player[0].currentTime=endTime;},0.1);}).bindListener();
