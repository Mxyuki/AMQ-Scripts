// ==UserScript==
// @name         AMQ Change Picture
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  A script to change your Picture on amq
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// ==/UserScript==

if (document.querySelector("#startPage")) return;

let picture = "https://i.imgur.com/BIvbHqy.png"; // Put the Image you want Here

let loadInterval = setInterval(() => {

    if ($('#avatarUserImg').length > 0) {
        // Bottom Right Picture
        const imgElement = $('#avatarUserImg');
        imgElement.attr('src', picture);
        imgElement.removeAttr('srcset');
    }

    if ($('.lobbyAvatarImg').length > 0) {
        // Lobby Picture
        const imgElement = $('.lobbyAvatarImg');
        imgElement.attr('src', picture);
        imgElement.removeAttr('srcset');
    }

    if ($('.ppProfileImg').length > 0) {
        // Profile Picture
        const imgElement = $('.ppProfileImg');
        imgElement.attr('src', picture);
        imgElement.removeAttr('srcset');
    }
}, 100);
