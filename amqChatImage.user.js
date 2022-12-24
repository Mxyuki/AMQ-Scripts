// ==UserScript==
// @name         AMQ Chat Image
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.4
// @description  When a link finishing by .png of .jpg is sent in the chat show the image directly in the chat
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// ==/UserScript==

if (document.getElementById("startPage")) return;

let counter = 0;
let regex = /(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|PNG|JPE?G))/;

new Listener("game chat update", (payload) => {
  payload.messages.forEach(message => {
    const matches = message.message.match(regex);
    if (matches) {
      const url = matches[0];

      setTimeout(function() {
        const element = document.createElement("img");
        element.src = url;
        element.id = "chatImage " + counter;
        element.className = "myImage";
        counter++;
        document.getElementById("gcMessageContainer").appendChild(element);

        $(".myImage").css({
          "margin": "auto",
          "display": "block",
          "max-width": "70%",
          "max-height": "20%"
        });
      }, 100);
    }
  });
}).bindListener();

new Listener("Host Game", (payload) => {
    $("[id*='chatImage']").remove();
}).bindListener();

new Listener("Join Game", (payload) => {
    $("[id*='chatImage']").remove();
}).bindListener();

new Listener("Spectate Game", (payload) => {
    $("[id*='chatImage']").remove();
}).bindListener();
