// ==UserScript==
// @name         AMQ AutoSendAnswer
// @namespace    https://github.com/Mxyuki
// @version      0.5
// @description  Press [Alt + T] to activate. Will send your answer at each letter you write when you are in team.
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// ==/UserScript==

const startPageElement = document.getElementById('startPage');
if (startPageElement) {
  return;
}

let isAutoSend = false;
let canWrite = true;

document.addEventListener('keyup', (event) => {
  if (event.altKey && event.keyCode === 84) {
    isAutoSend = !isAutoSend;
    gameChat.systemMessage(isAutoSend ? "Auto Send is Enabled. Press [ALT+T] to disable." : "Auto Send is Disabled. Press [ALT+T] to enable.");
  } else if (event.keyCode >= 0 && isAutoSend && canWrite) {
    quiz.answerInput.submitAnswer(true);
    const answerInput = document.getElementById("qpAnswerInput");
    const answer = answerInput.value;
    if (answer === "" && event.keyCode === 8) {
      answerInput.value = " ";
      quiz.answerInput.submitAnswer(true);
      answerInput.value = "";
    }
  }
});

new Listener("play next song", (payload) => {
  canWrite = true;
}).bindListener();

new Listener("guess phase over", (payload) => {
  canWrite = false;
}).bindListener();

function chatSystemMessage(msg) {
  if (!gameChat.isShown()) return;
  gameChat.systemMessage(msg);
}
