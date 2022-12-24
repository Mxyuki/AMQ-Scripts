// ==UserScript==
// @name         AMQ Chat Image
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.5.3
// @description  When a link finishing by .png of .jpg is sent in the chat show the image directly in the chat
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// ==/UserScript==

if (document.getElementById("startPage")) return;

let regex = /(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|PNG|JPE?G|GIF))/;

new Listener("game chat update", (payload) => {
  payload.messages.forEach(message => {
    const matches = message.message.match(regex);
    if (matches) {
      const url = matches[0];

      setTimeout(function() {
        const element = document.createElement("img");
        element.src = url;
        element.className = "myImage";
        document.getElementById("gcMessageContainer").appendChild(element);

        $(".myImage").css({
          "margin": "auto",
          "display": "block",
          "max-width": "70%",
          "max-height": "20%",
          "cursor": "pointer"
        });
          element.addEventListener("click", () => {
              element.remove();
        });
      }, 100);
    }
  });
}).bindListener();

new Listener("Host Game", (payload) => {
    $(".myImage").remove();
}).bindListener();

new Listener("Join Game", (payload) => {
    $(".myImage").remove();
}).bindListener();

new Listener("Spectate Game", (payload) => {
    $(".myImage").remove();
}).bindListener();
