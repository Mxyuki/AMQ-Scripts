// ==UserScript==
// @name         AMQ Hidden Friends
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  By doing /HF in game chat, it will inform you which of your friends are in invisible mode.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// ==/UserScript==

// Global variables
let friendList = []; // Store the list of friends retrieved from login
let onlinePlayer = []; // Store the list of all online players

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

// Function to check for hidden friends
function hidingFriends() {
    // Open and close the social tab to update the onlinePlayer array
    document.getElementById("mainMenuSocailButton").click();
    document.getElementById("mainMenuSocailButton").click();

    // Delay before processing the online players
    setTimeout(function () {
        // Loop through each online player
        onlinePlayer.forEach((name) => {
            // Find the friend from the friendList by name
            const friend = friendList.find((friend) => friend.name === name);

            // Check if the player is a friend and is offline (hiding)
            if (friend && !friend.online) {
                // Display a system message indicating the friend is hiding
                gameChat.systemMessage(`${name} is hiding.`);

                // Find elements with the friend's name in the stPlayerNameContainer class
                const playerNameContainers = document.querySelectorAll(".stPlayerNameContainer");
                playerNameContainers.forEach((container) => {
                    const playerNameElement = container.querySelector("h4");
                    if (playerNameElement && playerNameElement.innerText === name) {
                        // Change the background color of the social status circle to light blue
                        const socialStatusCircle = container.closest("li").querySelector(".socialTabPlayerSocialStatusInnerCircle");
                        if (socialStatusCircle) {
                            socialStatusCircle.classList.remove("socialTabPlayerSocialStatusInnerCircleColorOffline");
                            socialStatusCircle.style.backgroundColor = "lightblue";

                            // Change the status text to "Hiding"
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
