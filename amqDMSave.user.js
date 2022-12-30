// ==UserScript==
// @name         AMQ DM Save
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
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

new Listener("chat message", (receive) => {

    if (!firstMessage.includes(receive.sender)) {
        console.log(`${receive.sender} added`);
        loadMessages(receive.sender);
        firstMessage.push(receive.sender);
    }

    if (!messages[receive.sender]) {
        messages[receive.sender] = [];
    }

    messages[receive.sender].push({
        sender: receive.sender,
        message: receive.message
    });

    if (messages[receive.sender].length > 5) {
        messages[receive.sender].shift();
    }

    localStorage.setItem("messages", JSON.stringify(messages));

    console.log(messages[receive.sender]);
}).bindListener();

new Listener("chat message response", (send) => {

    if (!firstMessage.includes(send.target)) {
        console.log(`${send.target} added`);
        loadMessages(send.target);
        firstMessage.push(send.target);
    }

    if (!messages[send.target]) {
        messages[send.target] = [];
    }

    messages[send.target].push({
        sender: selfName,
        message: send.msg
    });

    if (messages[send.target].length > 5) {
        messages[send.target].shift();
    }

    localStorage.setItem("messages", JSON.stringify(messages));

    console.log(messages[send.target]);
}).bindListener();

function loadMessages(name){

    console.log(name);

    let message1 = messages[name][0].sender + ": " + messages[name][0].message;
    let message2 = messages[name][1].sender + ": " + messages[name][1].message;
    let message3 = messages[name][2].sender + ": " + messages[name][2].message;
    let message4 = messages[name][3].sender + ": " + messages[name][3].message;
    let message5 = messages[name][4].sender + ": " + messages[name][4].message;

    setTimeout(function() {
        $(`#chatBox-${name} > .chatBoxContainer > .chatContent > .ps__scrollbar-y-rail`).after(
            `<li>${message1}</li>
             <li>${message2}</li>
             <li>${message3}</li>
             <li>${message4}</li>
             <li>${message5}</li>`
        );
    }, 100);
}
