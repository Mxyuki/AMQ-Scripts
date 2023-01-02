// ==UserScript==
// @name         AMQ DM Save
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.5
// @description  Save the last messages you sent in dm
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqDMSave.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqDMSave.user.js
// ==/UserScript==

if (document.querySelector("#startPage")) return;

let savedMessages = localStorage.getItem("messages");
let messages = savedMessages ? JSON.parse(savedMessages) : {};

let firstMessage = [];

let numberSaved = 20; // < number of message saved by DM -1 (19)

let dmName;
let dmMessage;
let dmTimestamp;

let timestamp;

new Listener("chat message", (receive) => {

    if (!firstMessage.includes(receive.sender)) {
        firstMessage.push(receive.sender);
        if(messages[receive.sender]){
            console.log(`${receive.sender} added`);
            loadMessages(receive.sender);
        }
    }

    getTime();

    if (!messages[receive.sender]) messages[receive.sender] = [];
    messages[receive.sender].push({
        sender: receive.sender,
        message: receive.message,
        timestamp: timestamp
    });

    if (messages[receive.sender].length > numberSaved) messages[receive.sender].shift();

    localStorage.setItem("messages", JSON.stringify(messages));

}).bindListener();

new Listener("chat message response", (send) => {

    if (!firstMessage.includes(send.target)) {
        firstMessage.push(send.target);
        if(messages[send.target]){
            console.log(`${send.target} added`);
            loadMessages(send.target);
        }
    }

    getTime();

    if (!messages[send.target]) messages[send.target] = [];

    messages[send.target].push({
        sender: selfName,
        message: send.msg,
        timestamp: timestamp
    });

    if (messages[send.target].length > numberSaved) messages[send.target].shift();

    localStorage.setItem("messages", JSON.stringify(messages));

}).bindListener();

function loadMessages(name){

    setTimeout(function() {

        $(`#chatBox-${name} > .chatBoxContainer > .chatContent > .ps__scrollbar-y-rail`).after(
            `<li class="previousMessage" style="padding-left: 4rem">--- Previous Messages ---</li>`
            );

        for (let i = messages[name].length - 1 ; i > 0 ; i--) {
            if(messages[name].length >= i){

                dmName = messages[name][i-1].sender + ":";
                dmMessage = " " + messages[name][i-1].message;
                dmTimestamp = messages[name][i-1].timestamp;

            }

            $(`#chatBox-${name} > .chatBoxContainer > .chatContent > .ps__scrollbar-y-rail`).after(
                `<li>
                <span class="dmTimestamp">${dmTimestamp}</span>
                <span class="dmUsername">${dmName}</span>
                ${dmMessage}
                </li>`
            );
        }
    }, 20);

    $('.dmTimestamp').css("opacity", 0.5);

}

function getTime(){
    let now = new Date();
    timestamp = (now.getMonth() + 1).toString(10).padStart(2, '0') + "/" + now.getDate().toString(10).padStart(2, '0') + " | "+ now.getHours().toString(10).padStart(2, '0') + ":" + now.getMinutes().toString(10).padStart(2, '0');
}
