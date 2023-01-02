// ==UserScript==
// @name         Auto Update List
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.2
// @description  Auto Update your choosen list when lauching amq
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqUpdateList.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqUpdateList.user.js
// ==/UserScript==

if (document.querySelector("#startPage")) return;
let loadInterval = setInterval(() => {
    if (document.querySelector("#loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

let savedSettings = JSON.parse(localStorage.getItem("autoUpdate")) || {};

let autoUpdateMal = savedSettings.autoUpdateMal !== undefined ? savedSettings.autoUpdateMal : false;
let autoUpdateAnilist = savedSettings.autoUpdateAnilist !== undefined ? savedSettings.autoUpdateAnilist : false;
let autoUpdateKitsu = savedSettings.autoUpdateKitsu !== undefined ? savedSettings.autoUpdateKitsu : false;

let popup = true;
let message = "";

$('#aniListLastUpdateDate').after(`
<div>
     <span style="width: 80%">Auto Update AniList</span>
     <div class="customCheckbox updateAutoCheckbox">
          <input id="anilistUpdateCheckbox" type="checkbox">
          <label for="anilistUpdateCheckbox">
           <i class="fa fa-check" aria-hidden="true"></i>
          </label>
     </div>
</div>
`);

$('#malLastUpdateDate').after(`
<div>
     <span style="width: 80%">Auto Update MAL</span>
     <div class="customCheckbox updateAutoCheckbox">
          <input id="malUpdateCheckbox" type="checkbox">
          <label for="malUpdateCheckbox">
           <i class="fa fa-check" aria-hidden="true"></i>
          </label>
     </div>
</div>
`);

$('#kitsuLastUpdated').after(`
<div>
     <span style="width: 80%">Auto Update Kitsu</span>
     <div class="customCheckbox updateAutoCheckbox">
          <input id="kitsuUpdateCheckbox" type="checkbox">
          <label for="kitsuUpdateCheckbox">
           <i class="fa fa-check" aria-hidden="true"></i>
          </label>
     </div>
</div>
`);

$('.updateAutoCheckbox').css({
    "margin-left": "2rem",
    "top": "0.5rem"
});


$('#anilistUpdateCheckbox').prop('checked', autoUpdateAnilist).click(() => {
    autoUpdateAnilist = !autoUpdateAnilist;
    saveSettings();
});
$('#malUpdateCheckbox').prop('checked', autoUpdateMal).click(() => {
    autoUpdateMal = !autoUpdateMal;
    saveSettings();
});
$('#kitsuUpdateCheckbox').prop('checked', autoUpdateKitsu).click(() => {
    autoUpdateKitsu = !autoUpdateKitsu;
    saveSettings();
});

function saveSettings(){
    let settings = {};
    settings.autoUpdateMal = autoUpdateMal;
    settings.autoUpdateAnilist = autoUpdateAnilist;
    settings.autoUpdateKitsu = autoUpdateKitsu;
    localStorage.setItem("autoUpdate", JSON.stringify(settings));
}

function setup(){
    if(autoUpdateAnilist) options.updateAniList();
    if(autoUpdateMal) options.updateMal();
    if(autoUpdateKitsu) options.updateKitsu();
}

new Listener("anime list update result", (payload) => {
    setTimeout(function() {
        $('.swal2-confirm').click();


        let aniListName = $("#aniListUserNameInput").val();
        let malName = $("#malUserNameInput").val();
        let kitsuName = $("#kitsuUserNameInput").val();

        if (aniListName) message += `AniList Name: ${aniListName}\n`;

        if (malName) message += `MAL Name: ${malName}\n`;

        if (kitsuName) message += `Kitsu Name: ${kitsuName}`;

    }, 0);

    setTimeout(function() {
        if(popup){
            if(message){
                //console.log(message);
                popoutMessages.displayStandardMessage("List Status", `${message}`);
                popup = !popup;
            }
        }
    }, 100);
}).bindListener();
