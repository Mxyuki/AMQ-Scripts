// ==UserScript==
// @name         AMQ Co-op Farm V2
// @namespace    https://github.com/Mxyuki/
// @version      0.1
// @description  Auto Farm respond and then press ↑ so everyone get the answer !
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqWindows.js
// ==/UserScript==

// don't load on login page
if (document.getElementById("startPage")) return;

// Wait until the LOADING... screen is hidden and load script
let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);



let farmWindow;
let on = 2;
var x = '';
var ar = '';

//Disable in ranked
if (quiz.gameMode == "Ranked") return;

function sendChatMessage(message) {
  gameChat.$chatInputField.val(message);
  gameChat.sendMessage();
}

window.addEventListener("keydown", checkKeyPress, false)
function checkKeyPress(key) {
  if (key.keyCode == '38' && on == 1 || key.keyCode == '38' && on == 3) {

//Send Answer
    x = document.getElementById("qpAnswerInput").value;
    sendChatMessage('/// ' + x);
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
  if (payload.message.startsWith("///") && on == 1 || payload.message.startsWith("///") && on == 4 ) {
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

//Change Status
function Enable(){
$("#farmStatus").text('Enabled');
    on = 1;
}

function Disable(){
$("#farmStatus").text('Disabled');
    on = 2;
}

function Send(){
$("#farmStatus").text('Send Only');
    on = 3;
}

function Receive(){
$("#farmStatus").text('Receive Only');
    on = 4;
}

function setup() {
    farmWindow = new AMQWindow({
        title: "Coop Farm",
        width: 500,
        height: 270,
        zIndex: 1054,
        draggable: true
    });

    farmWindow.addPanel({
        width: 1.0,
        height: 50,
        id: "farmWindowControls"
    });

    farmWindow.addPanel({
        width: 1.0,
        height: 135,
        position: {
            x: 0,
            y: 50
        },
        id: "farmWindowResults"
    });

   farmWindow.panels[0].panel.append(
        $(`<div id="farmWindowControlsContainer"></div>`)
        .append(
            $(`<button id="farmWindowEnable" class="btn btn-primary">Enable</button>`).click(function () {
                Enable();
            })
        )
        .append(
            $(`<button id="farmWindowDisable" class="btn btn-primary">Disable</button>`).click(function () {
                Disable();
            })
        )
        .append(
            $(`<button id="farmWindowSend" class="btn btn-primary">Send Only</button>`).click(function () {
                Send();
            })
        )
        .append(
            $(`<button id="farmWindowReceive" class="btn btn-primary">Receive Only</button>`).click(function () {
                Receive();
            })
        )
    );

   farmWindow.panels[1].panel.append(
        $(`<div id="farmerWindowResultsContainer"></div>`)
        .append(
            $(
                `<div id="farmerWindowResultsLeft">
                    <H2 id="farmStatus">Disable</H2>
                </div>`
            )
        )
    )

    let oldWidth = $("#qpOptionContainer").width();
    $("#qpOptionContainer").width(oldWidth + 35);
    $("#qpOptionContainer > div").append($(`<div id="qpFarmCoop" class="clickAble qpOption"><i aria-hidden="true" class="fa fa-bars qpMenuItem"></i></div>`)
        .click(() => {
            if (farmWindow.isVisible()) {
                farmWindow.close();
            }
            else {
                farmWindow.open();
            }
        })
        .popover({
            content: "Coop Fram",
            trigger: "hover",
            placement: "bottom"
        })
    );

}

    AMQ_addScriptData({
        name: "Co-op Farn",
        author: "Mxyuki",
        description: `

            <p>This script is made to make your game in Farm co-op easier.</p>

            <p>--- Buttons ---</p>

            <p>↑ : Send your answer in chat, if someone as the script and activated auto answer it will answer for him.</p>
            <p>Top right "Coop Farm" button : Change Co-op Mode.</p>

            <p>--- Mods ---</p>

            <p>Co-op Farm enabled - Receive answer and Send answer Enabled.</p>

            <p>Send Answer Only - Only send your answer and don't receive answer.</p>

            <p>Receive Only - Only receive the answer and can't send answer.</p>

            <p>Co-op Farm Disabled - Receive answer and Send answer are Disabled.</p>
        `
    });
