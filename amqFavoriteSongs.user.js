// ==UserScript==
// @name         AMQ Fav Songs
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.3.5
// @description  Make that you can Favorite a song during the Answer Result, and make that you can have a radio of only your favorite song you heard on AMQ.
// @description  Can now Import Json files to the Favorite Songs, so you can import other people Favorite Songs or Import a list of Song from AnisongDB
// @description  This was mainly made for personal use so there are some things like that it always save as a nl.catbox.video file so if you want to use it you may want to change it to your taste.
// @description  I still tried to make that it is kinda user friendly if some people try to use it.
// @author       Mxyuki
// @match        https://*.animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqCheckScriptVersion.js
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqFavoriteSongs.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqFavoriteSongs.user.js
// ==/UserScript==

let loadInterval = setInterval(() => {
    if (!document.getElementById("loadingScreen")) return;
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

let savedData = JSON.parse(localStorage.getItem("favSongs")) || {
  favSongs: []
};

let savedVolume = JSON.parse(localStorage.getItem("fsVolume")) || 0.5;

let orderType = "random";

const scriptVersion = "1.3.4";
const scriptName = "AMQ Fav Songs";
checkScriptVersion(scriptName, scriptVersion);

let favSongs = savedData.favSongs;
let currentInfo = null;
let previousSongIndex = -1;
let prePreviousSongIndex = -1;
let semiRandomPlayedSongs = [];

//FUNCTIONS
function setup(){

    const qpSongInfoLinkRow = document.getElementById('qpSongInfoLinkRow');

    const qpFavSong = document.createElement('i');
    qpFavSong.setAttribute('id', 'qpFavSong');
    qpFavSong.setAttribute('class', 'fa fa-heart unfaved');
    qpFavSong.setAttribute('aria-hidden', 'true');
    qpFavSong.setAttribute('data-original-title', '');
    qpFavSong.setAttribute('title', '');

    qpFavSong.style.position = 'absolute';
    qpFavSong.style.left = '5px';
    qpFavSong.style.fontSize = '18px';
    qpFavSong.style.marginTop = '3px';
    qpFavSong.style.cursor = 'pointer';

    qpFavSong.onclick = favoriteSong;

    qpSongInfoLinkRow.insertBefore(qpFavSong, qpSongInfoLinkRow.querySelector('b'));

    $("#gameContainer").append($(`
        <div class="modal fade" id="favSong" tabindex="-1" role="dialog">
            <div class="modal-dialog fsModal" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">×</span>
                        </button>
                        <h2 class="modal-title">Favorite Songs</h2>
                    </div>
                    <div class="modal-body" style="overflow-y: auto;max-height: calc(100vh - 150px);">
                        <audio id="fsPlayer" src=""></audio>
                        <div id="fsInfoRow" style="text-align: center;">
                            <p class="fsSongInfo">Song Name by Artist</p>
                            <p class="fsSongInfo">Anime Type</p>
                        </div>

                        <div id="fsButtonRow" style="text-align: center;">
                            <div id="fsPrevSongButton" class="button" style="width: 15px; padding-right: 5px; display: inline;">
                                <i class="fa fa-fast-backward" style="color: rgb(217, 217, 217); font-size: 17px; vertical-align: top;"></i>
                            </div>
                            <div id="fsPlayButton" class="button" style="width: 15px; padding-right: 5px; display: inline;">
                                <i class="fa fa-play" style="color: rgb(217, 217, 217); font-size: 15px; vertical-align: text-top;"></i>
                            </div>
                            <div id="fsNextSongButton" class="button" style="width: 15px; display: inline-block;">
                                <i class="fa fa-fast-forward" style="color: rgb(217, 217, 217); font-size: 17px; vertical-align: top;"></i>
                            </div>
                        </div>

                        <div id="volumeContainer">
                            <input type="range" id="fsVolumeSlider" min="0" max="1" step="0.01" value="1">
                        </div>

                        <div id="fsOptions">
                            <div id="fsOrderingType">
                                <label>
                                    <input type="checkbox" id="fsRandom" name="fsOrder" value="random">
                                    Random
                                </label>
                                <label>
                                    <input type="checkbox" id="fsSemiRandom" name="fsOrder" value="semi-random">
                                    SemiRandom
                                </label>
                                <label>
                                    <input type="checkbox" id="fsOrder" name="fsOrder" value="order">
                                    Order
                                </label>
                            </div>
                            <div id"fsSongNumberContainer">
                                <label id="fsSongNumber">
                                    0 Songs
                                </label>
                            </div>
                        </div>


                        <div id="fsButton">
                            <div id="fsImportExportButtons">
                                <button id="fsImport">Import</button>
                                <button id="fsExport">Export</button>
                            </div>
                            <div id="fsClearButtonContainer">
                                <button id="fsClear">Clear</button>
                            </div>
                        </div>

                        <div id="favSongsList">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th style="font-weight: bold;">Anime Name</th>
                                        <th style="font-weight: bold;">Song Name</th>
                                        <th style="font-weight: bold;">Artist</th>
                                        <th style="font-weight: bold; min-width: 70px;">Type</th>
                                        <th style="font-weight: bold;">mp3</th>
                                        <th style="font-weight: bold;"><i class="fa fa-trash trash-top"></i></th>
                                    </tr>
                                </thead>
                                <tbody>

                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `));

    $("#fsVolumeSlider").val(savedVolume);

    $("#fsPlayButton").click(() => {
        const fsPlayer = document.getElementById('fsPlayer');
        if (fsPlayer.paused) {
            fsPlayer.play();
            $("#fsPlayButton i").removeClass('fa-play').addClass('fa-pause');
        } else {
            fsPlayer.pause();
            $("#fsPlayButton i").removeClass('fa-pause').addClass('fa-play');
        }
    });

    $("#fsNextSongButton").click(function () {
        getRandomSong(orderType);
        const fsPlayButton = $("#fsPlayButton");
        if (fsPlayButton.find('i').hasClass('fa-pause')) {
            const fsPlayer = document.getElementById('fsPlayer');
            fsPlayer.play();
        }
    });

    $("#fsPrevSongButton").click(function () {
        if(prePreviousSongIndex != -1){
            previousSongIndex = prePreviousSongIndex;
            const fsPlayer = document.getElementById('fsPlayer');
            fsPlayer.src = favSongs[prePreviousSongIndex]["0"];

            const fsInfoRow = document.getElementById('fsInfoRow');
            const { songName, artist, romaji, type } = favSongs[prePreviousSongIndex];
            fsInfoRow.innerHTML = `
                <p class="fsSongInfo">${songName} by ${artist}</p>
                <p class="fsSongInfo">${romaji} • ${type}</p>
            `;

            const fsPlayButton = $("#fsPlayButton");
            if (fsPlayButton.find('i').hasClass('fa-pause')) {
                const fsPlayer = document.getElementById('fsPlayer');
                fsPlayer.play();
            }
        }
    });

    document.getElementById("fsExport").addEventListener("click", () => {
        exportData();
    });

    document.getElementById("fsImport").addEventListener("click", () => {
        let input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.addEventListener("change", (event) => {
            let file = event.target.files[0];
            let reader = new FileReader();
            reader.onload = (e) => {
                let importedData = e.target.result;
                processImport(importedData);
            };
            reader.readAsText(file);
        });
        input.click();
    });

    document.getElementById("fsImport").addEventListener("drop", (event) => {
        event.preventDefault();
        let file = event.dataTransfer.files[0];
        let reader = new FileReader();
        reader.onload = (e) => {
            let importedData = e.target.result;
            processImport(importedData);
        };
        reader.readAsText(file);
    });

    document.getElementById("fsImport").addEventListener("dragover", (event) => {
        event.preventDefault();
    });

    document.getElementById("fsClear").addEventListener("click", () => {
        let confirmClear = confirm("Are you sure you want to clear your Favorite Song list?");
        if (confirmClear) {
            favSongs = [];
            updateTable();
            saveSettings();
            alert("Favorite List cleared!");
        }
    });

    $("#fsSongNumber").html(favSongs.length + " Songs");

    let fsRandomCheckbox = document.getElementById("fsRandom");
    let fsSemiRandomCheckbox = document.getElementById("fsSemiRandom");
    let fsOrderCheckbox = document.getElementById("fsOrder");

    fsRandomCheckbox.checked = true;

    fsRandomCheckbox.addEventListener("click", () => {
        handleCheckboxSelection(fsRandomCheckbox);
        orderType = "random";
    });

    fsSemiRandomCheckbox.addEventListener("click", () => {
        handleCheckboxSelection(fsSemiRandomCheckbox);
        orderType = "semiRandom";
    });

    fsOrderCheckbox.addEventListener("click", () => {
        handleCheckboxSelection(fsOrderCheckbox);
        orderType = "order";
    });


    document.getElementById('fsPlayer').addEventListener('ended', function() {
        getRandomSong(orderType);
        fsPlayer.play();
    });

    $("#fsVolumeSlider").on("input", function() {
        const fsPlayer = document.getElementById('fsPlayer');
        fsPlayer.volume = $(this).val();
        savedVolume = $(this).val();
        localStorage.setItem("fsVolume", JSON.stringify($(this).val()));
    });

    updateTable();
    getRandomSong(orderType);
}

$("#optionsContainer > ul").prepend($(`<li class="clickAble" data-toggle="modal" data-target="#favSong">Fav. Songs</li>`));

function saveSettings() {
  localStorage.setItem("favSongs", JSON.stringify({ favSongs: favSongs }));
}

function favoriteSong(){
    if (currentInfo != null) {
        let link = currentInfo.videoTargetMap.catbox[0];
        if(link == undefined){
            console.error("Mp3 link missing, can't favorite.");
            return;
        }
        else{
            link = "https://nl.catbox.video/" + link;
            let favedIndex = favSongs.findIndex(song => song["0"] === link);
            if (favedIndex !== -1) {
                favSongs.splice(favedIndex, 1);
                updateClass(false);
            } else {
                const typeMap = {
                    1: "OP",
                    2: "ED",
                    3: "INS"
                };
                let type = typeMap[currentInfo.type] || "";
                if (type === "OP" || type === "ED") type += " " + currentInfo.typeNumber;
                const songData = {
                    romaji: currentInfo.animeNames.romaji,
                    english: currentInfo.animeNames.english,
                    0: link,
                    songName: currentInfo.songName,
                    artist: currentInfo.artist,
                    type: type
                };
                favSongs.push(songData);
                updateClass(true);
            }

            $("#fsSongNumber").html(favSongs.length + " Songs");
            filterOrder();
            updateTable();
            saveSettings();
        }
    }
}

function filterOrder() {
    favSongs.sort((a, b) => {
        const typeOrder = { "OP": 1, "ED": 2, "INS": 3 };
        const typeA = a.type.split(" ")[0];
        const typeB = b.type.split(" ")[0];
        const numberA = parseInt(a.type.split(" ")[1]);
        const numberB = parseInt(b.type.split(" ")[1]);

        if (typeOrder[typeA] !== typeOrder[typeB]) {
            return typeOrder[typeA] - typeOrder[typeB];
        } else if (!isNaN(numberA) && !isNaN(numberB)) {
            return numberA - numberB;
        } else {
            return a.romaji.localeCompare(b.romaji);
        }
    });

    favSongs.sort((a, b) => {
        if (a.romaji !== b.romaji) {
            return a.romaji.localeCompare(b.romaji);
        }
    });
}

function updateClass(isFaved){
    const qpFavSong = document.getElementById('qpFavSong');
    if (isFaved && qpFavSong.classList.contains('unfaved')) {
        qpFavSong.classList.remove('unfaved');
        qpFavSong.classList.add('faved');
    } else if (!isFaved && qpFavSong.classList.contains('faved')) {
        qpFavSong.classList.remove('faved');
        qpFavSong.classList.add('unfaved');
    }
}

function updateTable() {
    const tableBody = $("#favSongsList tbody");

    tableBody.empty();

    favSongs.forEach((song, index) => {
      const mp3Link = song["0"];
      const mp3Cell = $("<td>").text("mp3").addClass("mp3-link").attr("data-link", mp3Link);
      mp3Cell.click(() => {
        window.open(mp3Link, "_blank");
      });

      const trashIcon = $("<i>").addClass("fa fa-trash delete-icon");
      trashIcon.click(() => {
        favSongs.splice(index, 1);
        updateTable();
        saveSettings();
      });

      const row = $("<tr>").append(
        $("<td>").text(song.romaji || song.english || "N/A"), // Anime Name
        $("<td>").text(song.songName || "N/A"), // Song Name
        $("<td>").text(song.artist || "N/A"), // Artist
        $("<td>").text(song.type || "N/A"), // Type
        mp3Cell, // mp3 link
        $("<td>").append(trashIcon) // Trash icon cell
      );
      tableBody.append(row);
    });
}

function getRandomSong(orderType) {
    prePreviousSongIndex = previousSongIndex;
    let numSongs = favSongs.length;

    if (numSongs === 0) {
        return;
    }

    if (orderType === "random") {
        if (numSongs === 1) {
            previousSongIndex = 0;
        } else {
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * numSongs);
            } while (randomIndex === previousSongIndex);

            previousSongIndex = randomIndex;
        }
    } else if (orderType === "semiRandom") {
        let availableSongs = Array.from({ length: numSongs }, (_, i) => i)
            .filter(index => index !== previousSongIndex && index !== prePreviousSongIndex)
            .filter(index => !semiRandomPlayedSongs.includes(index));

        if (availableSongs.length === 0) {
            // All songs have been played, reset the list
            semiRandomPlayedSongs = [];
            availableSongs = Array.from({ length: numSongs }, (_, i) => i);
        }

        let randomIndex = availableSongs[Math.floor(Math.random() * availableSongs.length)];
        semiRandomPlayedSongs.push(randomIndex);
        previousSongIndex = randomIndex;
    } else if (orderType === "order") {
        previousSongIndex++;
        if(previousSongIndex >= favSongs.length) previousSongIndex = 0;
    }

    const fsPlayer = document.getElementById('fsPlayer');
    fsPlayer.volume = savedVolume;
    fsPlayer.src = favSongs[previousSongIndex][0];

    const fsInfoRow = document.getElementById('fsInfoRow');
    const { songName, artist, romaji, type } = favSongs[previousSongIndex];
    fsInfoRow.innerHTML = `
      <p class="fsSongInfo">${songName} by ${artist}</p>
      <p class="fsSongInfo">${romaji} • ${type}</p>
    `;
}

function exportData() {
    let json = JSON.stringify(favSongs, null, 2);
    let blob = new Blob([json], { type: "application/json" });
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "FavoriteSong.json";
    a.click();

    URL.revokeObjectURL(url);
}

function processImport(data) {
    try {
        let importedData = JSON.parse(data);
        if (Array.isArray(importedData)) {
            importedData.forEach(item => {
                if ((item.audio && item.animeJPName) || (item[0] && item.romaji)) {
                    if (item.audio && item.animeJPName) {
                        if (item.songType) {
                            if (item.songType.startsWith("Opening")) {
                                item.songType = "OP " + item.songType.split("Opening")[1].trim();
                            } else if (item.songType.startsWith("Ending")) {
                                item.songType = "ED " + item.songType.split("Ending")[1].trim();
                            } else if (item.songType === "Insert Song") {
                                item.songType = "INS";
                            }
                        }
                        if (item.audio.startsWith("https://files.catbox.moe/")) {
                            item.audio = item.audio.replace("https://files.catbox.moe/", "https://nl.catbox.video/");
                        }
                        else if (item.audio.startsWith("https://nl.catbox.moe/")) {
                            item.audio = item.audio.replace("https://nl.catbox..moe/", "https://nl.catbox.video/");
                        }
                        if (!favSongs.some(song => song[0] === item.audio)) {
                            favSongs.push({
                                0: item.audio,
                                romaji: item.animeJPName,
                                english: item.animeENName || item.animeAltName,
                                songName: item.songName,
                                artist: item.songArtist,
                                type: item.songType
                            });
                        }
                    } else if (item[0] && item.romaji) {
                        if (item.type && (item.type.startsWith("Opening") || item.type.startsWith("Ending"))) {
                            item.type = item.type.replace("Opening", "OP").replace("Ending", "ED");
                        }
                        if (item[0].startsWith("https://files.catbox.moe/")) {
                            item[0] = item[0].replace("https://files.catbox.moe/", "https://nl.catbox.video/");
                        }
                        else if (item[0].startsWith("https://ladist1.catbox.video/")) {
                            item[0] = item[0].replace("https://ladist1.catbox.video/", "https://nl.catbox.videoe/");
                        }
                        else if (item[0].startsWith("https://abdist1.catbox.video/")) {
                            item[0] = item[0].replace("https://abdist1.catbox.video/", "https://nl.catbox.video/");
                        }
                        else if (item[0].startsWith("https://nl.catbox.moe/")) {
                            item[0] = item[0].replace("https://nl.catbox.moe/", "https://nl.catbox.video/");
                        }
                        if (!favSongs.some(song => song[0] === item[0])) {
                            favSongs.push({
                                0: item[0],
                                romaji: item.romaji,
                                english: item.english,
                                songName: item.songName,
                                artist: item.artist,
                                type: item.type
                            });
                        }
                    }
                }
            });

            alert("Import successful!");
        } else {
            alert("Invalid data format!");
        }
    } catch (error) {
        alert("Error processing imported data: " + error);
    }
    filterOrder();
    saveSettings();
    updateTable();
}

function handleCheckboxSelection(checkbox) {

    let fsRandomCheckbox = document.getElementById("fsRandom");
    let fsSemiRandomCheckbox = document.getElementById("fsSemiRandom");
    let fsOrderCheckbox = document.getElementById("fsOrder");

    if (!checkbox.checked) {
        checkbox.checked = true; // Ensure at least one checkbox is always selected
    }
    // Uncheck the other checkboxes
    if (checkbox === fsRandomCheckbox) {
        fsSemiRandomCheckbox.checked = false;
        fsOrderCheckbox.checked = false;
    } else if (checkbox === fsSemiRandomCheckbox) {
        fsRandomCheckbox.checked = false;
        fsOrderCheckbox.checked = false;
    } else if (checkbox === fsOrderCheckbox) {
        fsRandomCheckbox.checked = false;
        fsSemiRandomCheckbox.checked = false;
    }
}

//LISTENERS
new Listener("answer results", (payload) => {
    currentInfo = payload.songInfo;
    let link = currentInfo.videoTargetMap.catbox[0];
    if(link == undefined){
        console.error("Mp3 link missing.");
    }
    else{
        link = "https://nl.catbox.video/" + link;

        let faved = favSongs.findIndex(song => song["0"] === link);

        if(faved === -1) faved = false;
        else faved = true;

        updateClass(faved);
    }
}).bindListener();

//STYLE
AMQ_addStyle(`
    .faved {
        color: #e6aeae;
    }
    .unfaved {
        color: #fff;
    }

    #fsPlayButton:hover {
        box-sahdow: none;
    }

    #fsNextSongButton:hover {
        box-sahdow: none;
    }

    #fsPrevSongButton:hover {
        box-sahdow: none;
    }

    #fsVideo {
    max-width: 40vh;
    }

    .mp3-link {
        cursor: pointer;
        text-decoration: underline;
        color: #679dd7;
    }

    .delete-icon {
        cursor: pointer;
        margin-left: 8px;
    }

    .delete-icon:hover {
        color: #dd7676;
    }

    .trash-top {
        margin-left: 8px;
    }

    .fsModal {
        width: 800px
    }

    #favSongsList tbody tr:nth-child(even) {
        background-color: #303035;
    }

    #favSongsList tbody tr:nth-child(odd) {
        background-color: #323338;
    }

    #volumeContainer {
        display: flex;
        justify-content: center;
    }

    #fsVolumeSlider {
        width: 15vh;
    }

    .modal-body:is(:has(#fsPlayer))::-webkit-scrollbar {
        width: 12px;
        background-color: rgba(0,0,0,0);
    }

    .modal-body:is(:has(#fsPlayer))::-webkit-scrollbar-thumb {
        background-color: #212121;
        border-radius: 12px;
    }

    #fsButton {
        display: flex;
        justify-content: space-between;
    }

    #fsImportExportButtons {
        display: flex;
        gap: 10px; /* Adjust the gap as needed */
    }

    #fsClearButtonContainer {
        text-align: right;
    }

    #fsClear {
        background-color: #d98282;
        color: #fff;
        border-radius: 4px;
        border: none;
    }

    #fsImport, #fsExport {
        background-color: #7e95c8;
        color: #fff;
        border-radius: 4px;
        border: none;
    }

    #fsOptions {
        display: flex;
        justify-content: space-between;
    }

    #fsOrderingType {
        display: flex;
        gap: 10px; /* Adjust the gap as needed */
    }

    #fsSongNumberContainer {
        text-align: right;
    }
`);

AMQ_addScriptData({
    name: "Favorite Songs",
    author: "Mxyuki",
    description: `
        <p>This script let you save favorite a song and play it in a Favorite Radio.</p>
        <p>You can Add and Remove favorite song by clicking the heart, it will be blue if it is a Fav and White if it isn't :</p>
        <img src="https://i.imgur.com/FfpPvua.png" style="max-width: 250px">
        <p>You can then access the Fav Songs page by clicking here :</p>
        <img src="https://i.imgur.com/3cY1Ly3.png" style="max-width: 250px">
        <p>In this page you will have the Radio Player and the list of all your liked songs which can be removed from here.</p>
        <img src="https://i.imgur.com/4j6YWuB.png" style="max-width: 250px">
        <p>The Export button will let you Export in json file all the songs you have in Favorite.</p>
        <p>The Import button will let you Import in your list song that you exported from the Script or song from an AnisongDB json file.</p>
        <p>You can either click on the Import Button or Drop the Json file on the button to import.</p>
        <img src="https://i.imgur.com/zeq26uO.png" style="max-width: 250px">
        <p>The clear button will remove all the song that you Favorited, so be sure to Export them before if you want to keep them.</p>
        <img src="https://i.imgur.com/piw7OvR.png" style="max-width: 250px">
        <p>Random = Full Random song from the list it just can't be two time in a row the same song.</p>
        <p>SemiRandom = Full Random song from the list it just can't be a song that already been played until all songs from the list as been played.</p>
        <p>Order = Will play the songs in the order of the List.</p>
        <img src="https://i.imgur.com/re8kRvm.png" style="max-width: 250px">
        <p>If you find some bugs tell me on discord : .micookie</p>
    `
});
