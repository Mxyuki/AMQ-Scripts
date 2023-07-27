// ==UserScript==
// @name         AMQ Hidden Friends
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  By doing /HF in game chat, it will inform you which of your friends are in invisible mode.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// ==/UserScript==

let friendList = [];
let onlinePlayer = [];

// Wait for the game to load before setting up the script
if (document.querySelector("#startPage")) return;

// Listen for chat input and trigger hidingFriends when /HF is entered
let chatBox = document.getElementById("gcInput");
chatBox.addEventListener("keydown", function (event) {
    if (event.keyCode === 13) {
        let text = chatBox.value.trim();
        if (text.startsWith("/HF")) {
            event.preventDefault();
            hidingFriends();
            chatBox.value = "";
        }
    }
});

// Function to check for hidden friends and change their statue in the friend list
function hidingFriends() {
    document.getElementById("mainMenuSocailButton").click();
    document.getElementById("mainMenuSocailButton").click();
    setTimeout(function () {
        onlinePlayer.forEach((name) => {
            const friend = friendList.find((friend) => friend.name === name);
            if (friend && !friend.online) {
                gameChat.systemMessage(`${name} is hiding.`);
                const playerNameContainers = document.querySelectorAll(".stPlayerNameContainer");
                playerNameContainers.forEach((container) => {
                    const playerNameElement = container.querySelector("h4");
                    if (playerNameElement && playerNameElement.innerText === name) {
                        const socialStatusCircle = container.closest("li").querySelector(".socialTabPlayerSocialStatusInnerCircle");
                        if (socialStatusCircle) {
                            socialStatusCircle.classList.remove("socialTabPlayerSocialStatusInnerCircleColorOffline");
                            socialStatusCircle.style.backgroundColor = "lightblue";
                            const statusElement = socialStatusCircle.closest("li").querySelector("h3");
                            if (statusElement) {
                                statusElement.textContent = "Hiding";
                            }
                        }
                    }
                });
            }
        });
    }, 100);
}

// Listen for login completion to get the friendList
new Listener("login complete", (payload) => {
    friendList = payload.friends;
}).bindListener();

// Listen for online user updates to maintain the onlinePlayer array
new Listener("all online users", (payload) => {
    onlinePlayer = payload;
}).bindListener();
