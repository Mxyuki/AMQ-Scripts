// ==UserScript==
// @name         AMQ Chat Image
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  When a link finishing by .png of .jpg is sent in the chat show the image directly in the chat
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// ==/UserScript==

if (document.getElementById("startPage")) return;

let counter = 0;

new Listener("game chat update", (payload) => {
    payload.messages.forEach(message => {

        if(message.message.startsWith("http") && message.message.endsWith(".png") || message.message.startsWith("http") && message.message.endsWith(".jpg")){

            setTimeout(function() {
                const element = document.createElement("img");
                element.src = message.message;
                element.id = "chatImage" + counter;
                element.className = "myImage";
                counter++;
                document.getElementById("gcMessageContainer").appendChild(element);

                $(".myImage").css({
                    "margin": "auto",
                    "display": "block",
                    "max-width": "80%",
                    "max-height": "20%"
                });
            }, 500);
        }
  });
}).bindListener();
