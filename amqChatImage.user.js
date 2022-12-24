// ==UserScript==
// @name         AMQ Chat Image
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.2
// @description  When a link finishing by .png of .jpg is sent in the chat show the image directly in the chat
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqChatImage.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqChatImage.user.js
// ==/UserScript==

if (document.getElementById("startPage")) return;

let counter = 0;
let regex = /(https?:\/\/[^\s]+\.(?:png|jpe?g|gif))/;

new Listener("game chat update", (payload) => {
  payload.messages.forEach(message => {
    const matches = message.message.match(regex);
    if (matches) {
      const url = matches[0];

      setTimeout(function() {
        const element = document.createElement("img");
        element.src = url;
        element.id = "chatImage" + counter;
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
    } else {
      console.log("nique");
    }
  });
}).bindListener();

