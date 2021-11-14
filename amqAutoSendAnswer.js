// ==UserScript==
// @name         AMQ AutoSendAnswer
// @namespace    https://github.com/Mxyuki
// @version      0.1
// @description  Press [Alt + T] to activate. Will send your answer at each letter you write when you are in team.
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// ==/UserScript==

if (document.getElementById('startPage')) {
    return;
}

var isAutoSend=false;

function dockeyup(event) {
    if(event.altKey && event.keyCode=='84') {
        isAutoSend=!isAutoSend;
        gameChat.systemMessage(isAutoSend?"Auto Send is Enabled. Press [ALT+T] to disable.":"Auto Send is Disabled. Press [ALT+T] to enable.");
    }


    if(event.keyCode >= 0 && isAutoSend == true){
        quiz.answerInput.submitAnswer(true);
    }

}

document.addEventListener('keyup', dockeyup, false);

function chatSystemMessage(msg) {
    if(!gameChat.isShown()) return;
    gameChat.systemMessage(msg);
}
