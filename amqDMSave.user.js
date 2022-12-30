// ==UserScript==
// @name         AMQ DM Save
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.2
// @description  Save the last 5 messages you sent in dm
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqDMSave.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqDMSave.user.js
// ==/UserScript==

if (document.querySelector("#startPage")) return;

let savedMessages = localStorage.getItem("messages");
let messages = savedMessages ? JSON.parse(savedMessages) : {};

let firstMessage = [];

let message1;
let message2;
let message3;
let message4;
let message5;

new Listener("chat message", (receive) => {

    if (!firstMessage.includes(receive.sender)) {
        firstMessage.push(receive.sender);
        if(messages[receive.sender]){
            console.log(`${receive.sender} added`);
            loadMessages(receive.sender);
        }
    }

    if (!messages[receive.sender]) messages[receive.sender] = [];
    messages[receive.sender].push({
        sender: receive.sender,
        message: receive.message
    });

    if (messages[receive.sender].length > 5) messages[receive.sender].shift();

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

    if (!messages[send.target]) messages[send.target] = [];

    messages[send.target].push({
        sender: selfName,
        message: send.msg
    });

    if (messages[send.target].length > 5) messages[send.target].shift();

    localStorage.setItem("messages", JSON.stringify(messages));

}).bindListener();

function loadMessages(name){

    if(messages[name].length >= 1) message1 = messages[name][0].sender + ": " + messages[name][0].message;
    if(messages[name].length >= 2) message2 = messages[name][1].sender + ": " + messages[name][1].message;
    if(messages[name].length >= 3) message3 = messages[name][2].sender + ": " + messages[name][2].message;
    if(messages[name].length >= 4) message4 = messages[name][3].sender + ": " + messages[name][3].message;
    if(messages[name].length >= 5) message5 = messages[name][4].sender + ": " + messages[name][4].message;


    if(messages[name].length >= 5){
        setTimeout(function() {
            $(`#chatBox-${name} > .chatBoxContainer > .chatContent > .ps__scrollbar-y-rail`).after(
                `<li>${message5}</li>`
            );
        }, 20);
    }

    if(messages[name].length >= 4){
        setTimeout(function() {
            $(`#chatBox-${name} > .chatBoxContainer > .chatContent > .ps__scrollbar-y-rail`).after(
                `<li>${message4}</li>`
            );
        }, 20);
    }

    if(messages[name].length >= 3){
        setTimeout(function() {
            $(`#chatBox-${name} > .chatBoxContainer > .chatContent > .ps__scrollbar-y-rail`).after(
                `<li>${message3}</li>`
            );
        }, 20);
    }

    if(messages[name].length >= 2){
        setTimeout(function() {
            $(`#chatBox-${name} > .chatBoxContainer > .chatContent > .ps__scrollbar-y-rail`).after(
                `<li>${message2}</li>`
            );
        }, 20);
    }

    if(messages[name].length >= 1){
        setTimeout(function() {
            $(`#chatBox-${name} > .chatBoxContainer > .chatContent > .ps__scrollbar-y-rail`).after(
                `<li>${message1}</li>`
            );
        }, 20);
    }
}
