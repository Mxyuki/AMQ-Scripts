// ==UserScript==
// @name         AMQ No Host + Custom Settings
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  When you just don't want ot be Host + Mode to change setting when host before giving it back
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// ==/UserScript==

if (document.getElementById("startPage")) return;

let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

let noHost = false;
let settings = false;

function doAltI(event) {
    if(event.altKey && event.keyCode=='73') {
        noHost=!noHost;
        settings= false;
        gameChat.systemMessage(noHost?"No Host Enabled press [Alt + I] to Disable":"No Host Disabled press [Alt + I] to Enable");
    }
    if(event.altKey && event.keyCode=='79') {
        settings=!settings;
        noHost= true;
        gameChat.systemMessage(settings?"Settings Enabled press [Alt + O] to Disable":"Settings Disabled press [Alt + O] to Enable");
    }
}
document.addEventListener('keyup', doAltI, false);

function setup() {
    let GetHost = new Listener("Host Promotion", (payload) => {
        if(payload.newHost == selfName && noHost == true){
            setTimeout(function() {
                $('.mhLoadEntryName').click();
            }, 50);
            if(settings == true){
                setTimeout(function() {
                    $('.mhLoadEntryName').click();
                    document.getElementById("mhChangeButton").click();
                }, 100);
            }
            setTimeout(function() {
                $('.playerCommandIconPromote').click();
            }, 150)
        }});
    GetHost.bindListener();
}
