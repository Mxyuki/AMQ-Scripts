// ==UserScript==
// @name         AMQ AutoSendAnswer
// @namespace    https://github.com/Mxyuki
// @version      0.3
// @description  Press [Alt + T] to activate. Will send your answer at each letter you write when you are in team.
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// ==/UserScript==

if (document.getElementById('startPage')) {
    return;
}

var isAutoSend=false;
var answer
var x = ' ';

function doAltT(event) {
    if(event.altKey && event.keyCode=='84') {
        isAutoSend=!isAutoSend;
        gameChat.systemMessage(isAutoSend?"Auto Send is Enabled. Press [ALT+T] to disable.":"Auto Send is Disabled. Press [ALT+T] to enable.");
    }
}
document.addEventListener('keyup', doAltT, false);

function doKeyPressed(event) {
    if(event.keyCode >= 0 && isAutoSend == true){
        quiz.answerInput.submitAnswer(true);
        answer = document.getElementById("qpAnswerInput").value;
        if(answer == "" && event.keyCode == 8){
            $("#qpAnswerInput").val(" ");
            quiz.answerInput.submitAnswer(true);
            $("#qpAnswerInput").val("");
        }
    }
}
document.addEventListener('keydown', doKeyPressed, false);
document.addEventListener('keyup', doKeyPressed, false);

function chatSystemMessage(msg) {
    if(!gameChat.isShown()) return;
    gameChat.systemMessage(msg);
}
