// ==UserScript==
// @name         AMQ Co-op Farm
// @namespace    https://github.com/Mxyuki/
// @version      0.8
// @description  Auto Farm for AMQ. Answer and it will send it in the chatm everyone with the script will have it writen automaticaly.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqScriptInfo.js
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqWindows.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCoopFarm.user.js
// @updateURL	 https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCoopFarm.user.js
// ==/UserScript==


if (document.getElementById("loginPage")) return;

let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

let version = "0.8";
let farmWindow;
let mode = 2;
var lastAnswer= '';
var x = '';
var ar = '';
var prefix = '/// ';
var chat;

if (quiz.gameMode == "Ranked") return;

function sendChatMessage(message) {
  gameChat.$chatInputField.val(message);
  gameChat.sendMessage();
}

window.addEventListener("keydown", checkKeyPress, false)
function checkKeyPress(key) {
  if (key.keyCode == '13' && mode == 1|| key.keyCode == '13' && mode == 3) {

    x = document.getElementById("qpAnswerInput").value;
    chat = document.getElementById("gcInput").value;

      if(x != '' && x != lastAnswer && chat == ''){
    sendChatMessage(prefix + x);
          lastAnswer = x;
      }
  }
}

new Listener("game chat update", (payload) => {
  payload.messages.forEach(message => {
    processChatCommand(message);
  });
}).bindListener();

function processChatCommand(payload) {
  if (payload.message.startsWith(prefix) && mode == 1 || payload.message.startsWith(prefix) && mode == 4 && message.send) {
    var index = payload.message.indexOf(' ');
    if (index > 0) ar = payload.message.replace(prefix, "");
    else ar = '';
    if (quiz.isSpectator) return;
    if (ar.length > 0) {
      quiz.skipClicked();
        lastAnswer = ar;
      $("#qpAnswerInput").val(ar);
      quiz.answerInput.submitAnswer(true);
    }
  }
}
	new Listener("answer results", (data) => {
		lastAnswer = "";
	}).bindListener();
function Enable(){
$("#farmStatus").text('Enabled');
    mode = 1;
}

function Disabled(){
$("#farmStatus").text('Disabled');
    mode = 2;
}

function Send(){
$("#farmStatus").text('Send Only');
    mode = 3;
}

function Receive(){
$("#farmStatus").text('Receive Only');
    mode = 4;
}

function Prefix(){
    prefix = document.getElementById("farmPrefixTextBox").value;
}

function setup() {
    farmWindow = new AMQWindow({
        title: "Coop Farm",
        width: 350,
        height: 250,
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
        height: 50,
        position: {
            x: 0,
            y: 50
        },
        id: "farmWindowResults"
    });

    farmWindow.addPanel({
        width: 1.0,
        height: 50,
        position: {
            x: 0,
            y: 118
        },
        id: "farmWindowPrefix"
    });

   farmWindow.panels[0].panel.append(
        $(`<div id="farmWindowButton"></div>`)
        .append(
            $(`<button id="farmWindowEnable" class="btn btn-primary">Enable</button>`).click(function () {
                Enable();
            })
        )
        .append(
            $(`<button id="farmWindowDisabled" class="btn btn-primary">Disabled</button>`).click(function () {
                Disabled();
            })
        )
        .append(
            $(`<button id="farmWindowSend" class="btn btn-primary">Send</button>`).click(function () {
                Send();
            })
        )
        .append(
            $(`<button id="farmWindowReceive" class="btn btn-primary">Receive</button>`).click(function () {
                Receive();
            })
        )
    );

   farmWindow.panels[1].panel.append(
        $(`<div id="farmWindowStatus"></div>`)
        .append(
            $(
                `<div id="farmerWindowStatusText">
                    <H3 id="farmStatus">Disabled</H3>
                </div>`
            )
        )
    )

    farmWindow.panels[2].panel.append(
        $(`<div id="farmWindowPrefix"></div>`)
        .append($(`<input id="farmPrefixTextBox" type="text" placeholder="Prefix (original : /// )">`))

        .append(
            $(`<button id="farmWindowPrefixChange" class="btn btn-primary">Change</button>`).click(function () {
                Prefix();
            })
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
            content: "Coop Farm",
            trigger: "hover",
            placement: "bottom"
        })
    );

}

    AMQ_addScriptData({
        name: "Co-op Farm",
        author: "Mxyuki",
	version: version,
	link: "https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCoopFarm.user.js",
        description: `
            <p>This script is made to make your game in Farm co-op easier.</p>
            <p>--- Buttons ---</p>
            <p>Enter : If you have an answer writen pressing enter will permite to send it one time.
            <p>Top right "Coop Farm" button : Change Co-op Mode.</p>
            <p>--- Mods ---</p>
            <p>Co-op Farm enabled - Receive answer and Send answer Enabled.</p>
            <p>Send Answer Only - Only send your answer and don't receive answer.</p>
            <p>Receive Only - Only receive the answer and can't send answer.</p>
            <p>Co-op Farm Disabled - Receive answer and Send answer are Disabled.</p>
            <p>--- Prefix ---</p>
            <p>Write the Prefix you want in the Textbox, and then clic on change. (Each reload it will come back to /// )</p>
        `

    });

    AMQ_addStyle(`
        #qpFarmCoop {
            width: 27px;
            margin-right: 5px;
        }
        #farmerWindowStatus {
            width: 100%;
            float: center;
            text-align: center;
            padding-left: 5px;
        }
        #farmerWindowStatusText > p {
            margin-bottom: 0;
        }
        #farmWindowButton > button {
            width: 70px;
            margin: 7px;
        }
    `);
