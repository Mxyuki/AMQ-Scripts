// ==UserScript==
// @name         AMQ Co-op Farm
// @namespace    https://github.com/Mxyuki/
// @version      0.8
// @description  Auto Farm respond and then press ↑ so everyone get the answer !
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// ==/UserScript==


// don't load on login page
if (document.getElementById("startPage")) return;

// Wait until the LOADING... screen is hidden and load script
let loadInterval = setInterval(() => {
  if (document.getElementById("loadingScreen").classList.contains("hidden")) {
    clearInterval(loadInterval);
  }
}, 500);

var x = '';
var ar = '';
var on = '1';

//Disable in ranked
if (quiz.gameMode == "Ranked") return;

function sendChatMessage(message) {
  gameChat.$chatInputField.val(message);
  gameChat.sendMessage();
}

window.addEventListener("keydown", checkKeyPress, false)
function checkKeyPress(key) {
  if (key.keyCode == '38' && on == 1 || key.keyCode == '38' && on == 2) {

//Send Answer
    x = document.getElementById("qpAnswerInput").value;
    sendChatMessage('/// ' + x);
  }

//Change Mods
  if (key.keyCode == '37') {
    on = on + 1;
    if (on >= 5) {
      on = 1;
    }
    if (on == 1) {
      gameChat.systemMessage("Enabled Farm-Co-op");
    }
    else if (on == 2) {
      gameChat.systemMessage("Send answer Only");
    }
    else if (on == 3) {
      gameChat.systemMessage("Receivce answer Only");
    }
    else if (on == 4) {
      gameChat.systemMessage("Disabled Farm-Co-op");
    }
  }
}

new Listener("Game Chat Message", (payload) => {
  processChatCommand(payload);
}).bindListener();
new Listener("game chat update", (payload) => {
  payload.messages.forEach(message => {
    processChatCommand(message);
  });
}).bindListener();


//Auto Answer
function processChatCommand(payload) {
  if (payload.message.startsWith("///") && on == 1 || payload.message.startsWith("///") && on == 3 ) {
    var index = payload.message.indexOf(' ');
    if (index > 0) ar = payload.message.substr(index + 1);
    else ar = '';
    if (quiz.isSpectator) return;
    if (ar.length > 0) {
      quiz.skipClicked();
      $("#qpAnswerInput").val(ar);
      quiz.answerInput.submitAnswer(true);
    }
  }
}

    AMQ_addScriptData({
        name: "Co-op Farn",
        author: "Mxyuki",
        description: `

            <p>This script is made to make your game in Farm co-op easier.</p>

            <p>--- Buttons ---</p>

            <p>↑ : Send your answer in chat, if someone as the script and activated auto answer it will answer for him.</p>
            <p>← : Change Co-op Mode.</p>

            <p>--- Mods ---</p>

            <p>Co-op Farm enabled - Receive answer and Send answer Enabled.</p>

            <p>Send Answer Only - Only send your answer and don't receive answer.</p>

            <p>Receive Only - Only receive the answer and can't send answer.</p>

            <p>Co-op Farm Disabled - Receive answer and Send answer are Disabled.</p>
        `
    });