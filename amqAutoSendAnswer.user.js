// ==UserScript==
// @name         AMQ AutoSendAnswer
// @namespace    https://github.com/Mxyuki
// @version      0.5
// @description  Press [Alt + T] to activate. Will send your answer at each letter you write when you are in team.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqAutoSendAnswer.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqAutoSendAnswer.user.js
// ==/UserScript==
if (document.getElementById("loginPage")) return

let isAutoSend = false;

document.addEventListener('keyup', (event) => {
    if (event.altKey && event.keyCode === 84) {
        isAutoSend = !isAutoSend;
        if (!gameChat.isShown()) return;
        gameChat.systemMessage(isAutoSend ? "Auto Send is Enabled. Press [ALT+T] to disable." : "Auto Send is Disabled. Press [ALT+T] to enable.");
    }
    else if(event.keyCode === 13 && isAutoSend && document.getElementById("qpAnswerInput").value != ""){
        quiz.answerInput.submitAnswer(true);
    }
});

document.getElementById("qpAnswerInput").oninput = function() {
    if(isAutoSend){
        quiz.answerInput.submitAnswer(true);
        if(document.getElementById("qpAnswerInput").value == ""){
            document.getElementById("qpAnswerInput").value = " ";
            quiz.answerInput.submitAnswer(true);
            document.getElementById("qpAnswerInput").value = ""
        }
    }
};
