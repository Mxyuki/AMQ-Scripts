// ==UserScript==
// @name         AMQ Custom Plus
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.3.1
// @description  Customize your AMQ, Change your Name / Level / Profil / Skin Everywhere, However you want (Of course it only display for You)
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomPlus.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCustomPlus.user.js
// ==/UserScript==

if (document.querySelector("#startPage")) return;
let loadInterval = setInterval(() => {
    if (document.querySelector("#loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

function setup(){
    profileChange();
    levelChange();
    changeImage();
}

let Image = "https://i.imgur.com/BIvbHqy.png";
let Name = "Name";
let Level = "Level";
let Date = "XX/XX/XXXX";
let Song = "Song Played";
let Guess = "Guess Rate";
let RoomName = "Room";
let RoomId = "#0";

let skinBase = "https://cdn.animemusicquiz.com/v1/avatars/Honoka/Fall/Hairband/latte/900px/Basic.webp";
let skinThinking = "https://cdn.animemusicquiz.com/v1/avatars/Honoka/Fall/Hairband/latte/900px/Thinking.webp";
let skinWaiting = "https://cdn.animemusicquiz.com/v1/avatars/Honoka/Fall/Hairband/latte/900px/Waiting.webp";
let skinNoAnswer = "https://cdn.animemusicquiz.com/v1/avatars/Honoka/Fall/Hairband/latte/900px/Confused.webp";
let skinCorrect = "https://cdn.animemusicquiz.com/v1/avatars/Honoka/Fall/Hairband/latte/900px/Right.webp";
let skinWrong = "https://cdn.animemusicquiz.com/v1/avatars/Honoka/Fall/Hairband/latte/900px/Wrong.webp";
let skinBackground = "https://cdn.animemusicquiz.com/v1/backgrounds/250px/Honoka_Fall_latte_vert.webp";

let loadSpeed = 5;
let previousSrc = null;

function profileChange(){
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                const playerName = mutation.target.querySelector('.ppPlayerName');
                if (playerName && playerName.textContent === selfName) {
                    const profileImg = mutation.target.querySelector('.ppProfileImg');
                    if (profileImg) {
                        setTimeout(function() {
                            profileImg.removeAttribute("srcset");
                            profileImg.src = Image;
                        }, loadSpeed);
                    }
                    const statsValueGuess = mutation.target.querySelector('.ppStatsRow.guessPercent .ppStatsValueContainer .ppStatsValue');
                    if (statsValueGuess) {
                        setTimeout(function() {
                            statsValueGuess.textContent = Guess;
                        }, loadSpeed);
                    }
                    const statsValueDate = mutation.target.querySelector('.ppStatsRow.creationDate .ppStatsValueContainer .ppStatsValue');
                    if (statsValueDate) {
                        setTimeout(function() {
                            statsValueDate.textContent = Date;
                        }, loadSpeed);
                    }
                    const statsValueSong = mutation.target.querySelector('.ppStatsRow.songCount .ppStatsValueContainer .ppStatsValue');
                    if (statsValueSong) {
                        setTimeout(function() {
                            statsValueSong.textContent = Song;
                        }, loadSpeed);
                    }
                    const playerLevel = mutation.target.querySelector('.ppPlayerLevel');
                    if (playerLevel) {
                        setTimeout(function() {
                            playerLevel.textContent = Level;
                        }, loadSpeed);
                    }
                    const playerName = document.querySelector('.ppPlayerName');
                    if (playerName) {
                        setTimeout(function() {
                            playerName.textContent = Name;
                        }, loadSpeed);
                    }
                    const truePlayerName = document.querySelector('.ppPlayerOriginalName');
                    if (truePlayerName) {
                        setTimeout(function() {
                            truePlayerName.textContent = Name;
                        }, loadSpeed);
                    }
                }
            }
        });
    });
    const playerProfileLayer = document.getElementById('playerProfileLayer');
    observer.observe(playerProfileLayer, {
        childList: true,
        subtree: true
    });
}

function nameChange(){
    const nameTextElement = document.querySelector('.lobbyAvatarNameContainerInner.self h2');
    if (nameTextElement) {
        nameTextElement.textContent = Name;
    }
    const nameSpecTextElement = document.querySelector('.gcSpectatorItem.self h3 span');
    if (nameSpecTextElement) {
        nameSpecTextElement.textContent = Name;
    }
    const nameGameTextElement = document.querySelector('.qpAvatarName.outOfFocusReduced.self');
    if (nameGameTextElement) {
        nameGameTextElement.textContent = Name;
    }
    const nameStandingTextElement = document.querySelector('.qpsPlayerName.self');
    if (nameStandingTextElement) {
        nameStandingTextElement.textContent = Name;
    }
}

function levelChange(){
    const levelLobbyTextElement = document.querySelector('.lobbyAvatarSubTextContainer h3');
    if (levelLobbyTextElement) {
        levelLobbyTextElement.textContent = Level;
    }
    const levelGameTextElement = document.querySelector('.qpAvatarLevel.self');
    if (levelGameTextElement) {
        levelGameTextElement.textContent = Level;
    }
    const levelTextElements = document.querySelectorAll('#xpLevelContainer p.levelText');
    levelTextElements.forEach(element => {
        element.textContent = Level;
    });
}

function hideRoom(){
    const lobbyRoomId = document.querySelector('#lobbyRoomId');
    if (lobbyRoomId) {
        setTimeout(function() {
            lobbyRoomId.textContent = RoomId;
        }, loadSpeed);
    }
    const lobbyRoomName = document.querySelector('#lobbyRoomName');
    if (lobbyRoomName) {
        setTimeout(function() {
            lobbyRoomName.textContent = RoomName;
        }, loadSpeed);
    }
}

function filterAvatar(state){
    if(state === "Basic") changeAvatar(skinBase);
    if(state === "Thinking") changeAvatar(skinThinking);
    if(state === "Waiting") changeAvatar(skinWaiting);
    if(state === "Confused") changeAvatar(skinNoAnswer);
    if(state === "Right") changeAvatar(skinCorrect);
    if(state === "Wrong") changeAvatar(skinWrong);
}

function observeAvatar(){

    previousSrc = null;

    const avatarName = document.querySelector('.qpAvatarName.outOfFocusReduced.self');
    if (avatarName) {
        const avatarContainer = avatarName.closest('.qpAvatarContainer');
        if (avatarContainer) {
            const backgroundImage = avatarContainer.querySelector('.qpAvatarImageContainer.floatingContainer .qpAvatarBackgroundContainer');
            if (backgroundImage) {
                backgroundImage.style.backgroundImage = `url(${skinBackground})`;
            }
            const avatarImage = avatarContainer.querySelector('.qpAvatarImageContainer.floatingContainer .qpAvatarImageInnerContainer .qpAvatarImage.inFocusHighlighted');
            if (avatarImage) {
                const observer = new MutationObserver(mutations => {
                    mutations.forEach(mutation => {
                        if (mutation.attributeName === 'src') {
                            const newSrc = mutation.target.src;
                            if (newSrc !== previousSrc) {
                                previousSrc = newSrc;
                                const newState = newSrc.substring(newSrc.lastIndexOf("/") + 1, newSrc.lastIndexOf("."));
                                filterAvatar(newState);
                            }
                        }
                    });
                });
                observer.observe(avatarImage, { attributes: true });
            }
        }
    }
}

function changeAvatar(skin){
    const avatarName = document.querySelector('.qpAvatarName.outOfFocusReduced.self');
    if (avatarName) {
        const avatarContainer = avatarName.closest('.qpAvatarContainer');
        if (avatarContainer) {
            const avatarImage = avatarContainer.querySelector('.qpAvatarImageContainer.floatingContainer .qpAvatarImageInnerContainer .qpAvatarImage.inFocusHighlighted');
            if (avatarImage) {
                avatarImage.removeAttribute("srcset");
                avatarImage.src = skin;
            }
        }
    }
}

function changeImage(){
    document.querySelector("#avatarUserImg").style.content = `url("${Image}")`;
    document.querySelector(".isSelf > .lobbyAvatarImgContainer > .lobbyAvatarImg").style.content = `url("${Image}")`;
}

new Listener("Join Game", (payload) => {
    setTimeout(function() {
        levelChange();
        setTimeout(function() {
            nameChange();
        }, loadSpeed);
        hideRoom();
        observeAvatar();
        filterAvatar("Basic");
    }, loadSpeed);
}).bindListener();
new Listener("Host Game", (payload) => {
    setTimeout(function() {
        levelChange();
        setTimeout(function() {
            nameChange();
        }, loadSpeed);
        hideRoom();
    }, loadSpeed);
}).bindListener();
new Listener("Game Starting", (payload) => {
    setTimeout(function() {
        levelChange();
        nameChange();
        observeAvatar();
        filterAvatar("Basic");
    }, loadSpeed);
}).bindListener();
new Listener("quiz over", (payload) => {
    setTimeout(function() {
        levelChange();
        nameChange();
        hideRoom();
    }, loadSpeed);
}).bindListener();
new Listener("Spectator Change To Player", (payload) => {
    setTimeout(function() {
        levelChange();
        nameChange();
    }, loadSpeed);
}).bindListener();
new Listener("Spectate Game", (payload) => {
    setTimeout(function() {
        nameChange();
        hideRoom();
    }, loadSpeed);
}).bindListener();
new Listener("Player Changed To Spectator", (payload) => {
    setTimeout(function() {
        nameChange();
    }, loadSpeed);
}).bindListener();
new Listener("quiz xp credit gain", (payload) => {
    setTimeout(function() {
        levelChange();
    }, 10);
}).bindListener();
