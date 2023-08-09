// ==UserScript==
// @name         AMQ Hidden Friends
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.1
// @description  By doing /HF in game chat, it will inform you which of your friends are invisible to you, and when opening the friend list hiding friend while have a Blue statue with written hidden next to them.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// ==/UserScript==

let onlinePlayer = [];
let isCommand = false;

let command = "/HF";

if (document.querySelector("#loginPage")) return;

let chatBox = document.getElementById("gcInput");
chatBox.addEventListener("keydown", function (event) {
    if (event.keyCode === 13) {
        let text = chatBox.value.trim();
        if (text.startsWith(command)) {
            event.preventDefault();
            isCommand = true;
            socket.sendCommand({ type: "social", command: "get online users" });
            chatBox.value = "";
        }
    }
});

new Listener("all online users", (payload) => {
    onlinePlayer = payload;
    let list = Object.keys(socialTab.offlineFriends).filter((name) => onlinePlayer.includes(name));
    if(isCommand){
        if(list.length > 0){
            list.forEach((hiddenPlayer) => {
                gameChat.systemMessage(`${hiddenPlayer} is hiding.`);
            });
        }
        else {
            gameChat.systemMessage(`No one is hiding.`);
        }
        isCommand = false;
    }
    let friendElements = document.querySelectorAll(".socialTabFriendPlayerEntry");
    friendElements.forEach((friendElement) => {
        let nameElement = friendElement.querySelector(".stPlayerName h4");
        let statusElement = friendElement.querySelector(".stPlayerName h3");
        let statusCircleElement = friendElement.querySelector(".socialTabPlayerSocialStatusInnerCircle");
        let friendName = nameElement.textContent.trim();
        if (list.includes(friendName)) {
            statusElement.textContent = "Hidden";
            statusElement.classList.add("hiddenFriendText");
            statusCircleElement.classList.remove("socialTabPlayerSocialStatusInnerCircleColorOffline");
            statusCircleElement.classList.add("hiddenFriend");
        } else {
            if (statusCircleElement.classList.contains("hiddenFriend")) {
                statusCircleElement.classList.remove("hiddenFriend");
                statusCircleElement.classList.add("socialTabPlayerSocialStatusInnerCircleColorOffline");
                statusElement.textContent = "Offline";
                statusElement.classList.remove("hiddenFriendText");
            }
        }
    });
}).bindListener();

new Listener("friend state change", (payload) => {
    socket.sendCommand({ type: "social", command: "get online users" });
}).bindListener();

AMQ_addStyle(`
    .hiddenFriend {
        background-color: lightblue;
    }
    #friendOfflineList .stPlayerName .hiddenFriendText {
        color: lightblue;
    }
`);

AMQ_addScriptData({
    name: "Hidden Friends",
    author: "Mxyuki",
    description: `
        <p>This script let you know who in your friends are hiding from you.</p>
        <p>Opening the friend list will display your friends that are hidden like this :</p>
        <img src="https://i.imgur.com/O4OvR8S.png" style="max-width: 250px">
        <p>Doing ${command} in chat will display all your hidden friends in chat like this :</p>
        <img src="https://i.imgur.com/H6HCnIL.png" style="max-width: 250px">
        <p>And if noone is hiding and you do ${command} it will tell you that no one is hiding.</p>
    `
});
