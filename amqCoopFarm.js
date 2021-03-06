// ==UserScript==
// @name         AMQ Co-op Farm
// @namespace    https://github.com/Mxyuki/
// @version      0.3
// @description  Auto Farm for AMQ. Answer and it will send it in the chatm everyone with the script will have it writen automaticaly.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @updateUrl    https://github.com/Mxyuki/AMQ-Scripts/raw/master/AMQArtistSongTypeGuess.js
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqWindows.js
// ==/UserScript==


if (document.getElementById("startPage")) return;

let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

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
    if (payload.message.startsWith(prefix) && mode == 1 || payload.message.startsWith(prefix) && mode == 4 ) {
        var index = payload.message.indexOf(' ');
        if (index > 0) ar = payload.message.substr(index + 1);
        else ar = '';
        if (quiz.isSpectator) return;
        if (ar.length > 0) {
            quiz.skipClicked();
            lastAnswer = ar;
            $("#qpAnswerInput").val(ar);
            quiz.answerInput.submitAnswer(true);
        }
    }

    new Listener("answer results", (data) => {
        lastAnswer = "";

    }).bindListener();
}
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

function setup() {
    farmWindow = new AMQWindow({
        title: "Coop Farm",
        width: 350,
        height: 200,
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
        $(`<div id="farmerWindowStatus"></div>`)
        .append(
            $(
                `<div id="farmerWindowStatusText">
                    <H3 id="farmStatus">Disabled</H3>
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
        content: "Coop Farm",
        trigger: "hover",
        placement: "bottom"
    })
                                        );

}

AMQ_addScriptData({
    name: "Co-op Farm",
    author: "Mxyuki",
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
