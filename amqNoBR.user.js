// ==UserScript==
// @name         AMQ no BR
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  Make you do the right choice when joining a BR room. Made specially for Dayt.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqNoBR.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqNoBR.user.js
// ==/UserScript==

new Listener("Host Game", (payload) => {
    setTimeout(function() {
        if(payload.settings.showSelection === 2) lobby.leave();
    }, 100);
}).bindListener();

new Listener("Room Settings Changed", (payload) => {
    setTimeout(function() {
        if(payload.showSelection === 2) lobby.leave();
    }, 100);
}).bindListener();

new Listener("Join Game", (payload) => {
    setTimeout(function() {
        if(payload.settings.showSelection === 2) lobby.leave();
    }, 100);
}).bindListener();

new Listener("Spectate Game", (payload) => {
    setTimeout(function() {
        if(payload.settings.showSelection === 2) lobby.leave();
    }, 100);
}).bindListener();
