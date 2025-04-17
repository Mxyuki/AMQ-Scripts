// ==UserScript==
// @name         AMQ Wrong Songs
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.2.2
// @description  Edit of my Fav. Songs Script so that you it add to the song list all songs that you miss in your games.
// @description  Don't use it along the Fav. Songs script as it will prob cause issues.
// @author       Myuki
// @match        https://*.animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqCheckScriptVersion.js
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqScriptInfo.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqWrongSongs.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqWrongSongs.user.js
// ==/UserScript==

let loadInterval = setInterval(() => {
    if (!document.getElementById("loadingScreen")) return;
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

let version = "1.2.2";
checkScriptVersion("AMQ Wrong Songs", version);

let savedData = JSON.parse(localStorage.getItem("wrongSongs")) || {
  favSongs: []
};

savedData.favSongs.forEach(item => {
    if (item[0] && typeof item[0] === 'string') {
        if (item[0].startsWith("https://files.catbox.moe/")) {
            item[0] = item[0].replace("https://files.catbox.moe/", "https://eudist.animemusicquiz.com/");
        } else if (item[0].startsWith("https://ladist1.catbox.video/")) {
            item[0] = item[0].replace("https://ladist1.catbox.video/", "https://eudist.animemusicquiz.com/");
        } else if (item[0].startsWith("https://abdist1.catbox.video/")) {
            item[0] = item[0].replace("https://abdist1.catbox.video/", "https://eudist.animemusicquiz.com/");
        } else if (item[0].startsWith("https://nl.catbox.moe/")) {
            item[0] = item[0].replace("https://nl.catbox.moe/", "https://eudist.animemusicquiz.com/");
        } else if (item[0].startsWith("https://nl.catbox.video/")) {
            item[0] = item[0].replace("https://nl.catbox.video/", "https://eudist.animemusicquiz.com/");
        } else if (item[0].startsWith("https://naedist.animemusicquiz.com/")) {
            item[0] = item[0].replace("https://naedist.animemusicquiz.com/", "https://eudist.animemusicquiz.com/");
        } else if (item[0].startsWith("https://nawdist.animemusicquiz.com/")) {
            item[0] = item[0].replace("https://nawdist.animemusicquiz.com/", "https://eudist.animemusicquiz.com/");
        }
    }
});

localStorage.setItem("wrongSongs", JSON.stringify(savedData));

let savedVolume = JSON.parse(localStorage.getItem("fsVolume")) || 0.5;

let orderType = "random";
let favSongs = savedData.favSongs;
let currentInfo = null;
let playedSongs = [];
let currentPlayedSongIndex = -1;
let semiRandomPlayedSongs = [];
let isPlaying = false;
let isRepeat = false;
let settings = JSON.parse(localStorage.getItem("wsSettings")) || { isList: false, isToggle: true };
let isList = settings.isList;
let isToggle = settings.isToggle;

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

    qpFavSong.onclick = function() {
        favoriteSong();
    };

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
                                <i class="fa fa-fast-backward main-button" style="font-size: 17px; vertical-align: top;"></i>
                            </div>
                            <div id="fsPlayButton" class="button" style="width: 15px; padding-right: 5px; display: inline;">
                                <i class="fa fa-play main-button" style="font-size: 17px; vertical-align: top;"></i>
                            </div>
                            <div id="fsNextSongButton" class="button" style="width: 15px; display: inline-block;">
                                <i class="fa fa-fast-forward main-button" style="font-size: 17px; vertical-align: top;"></i>
                            </div>
                        </div>

                        <div id="volumeContainer">

                            <div class="fsSoundControl">
                                <i class="fa fa-volume-up fsSound-icon"></i>
                                <input type="range" id="fsVolume-slider" class="fsVolume-slider" style="width: 8px;" min="0" max="1" step="0.01" value="0.5" />
                            </div>
                            <span id="fsCurrentTime">00:00</span>
                            <input type="range" id="fsTimeSlider" min="0" max="1" step="0.01" value="1">
                            <span id="fsDuration">00:00</span>
                            <div id="fsRepeatControl" class="fsRepeatControl">
                                <i class="fa fa-repeat fsRepeat-icon"></i>
                            </div>
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
                                        <th style="font-weight: bold;"><i class="fa fa-play"></i></th>
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

    $("#fsVolume-slider").val(savedVolume);

    $("#fsRepeatControl").click(function () {
        isRepeat = !isRepeat;
        if(isRepeat) {
            $('.fsRepeat-icon').css('color', '#aebbd8');
        }
        else {
            $('.fsRepeat-icon').css('color', '#fff');
        }
    });

    const audio = document.getElementById('fsPlayer');
    const currentTimeDisplay = document.getElementById('fsCurrentTime');
    const durationDisplay = document.getElementById('fsDuration');
    const timeSlider = document.getElementById('fsTimeSlider');

    audio.addEventListener('timeupdate', () => {
        const currentTime = audio.currentTime;
        const duration = audio.duration;

        currentTimeDisplay.textContent = formatTime(currentTime);
        durationDisplay.textContent = formatTime(duration);

        if (duration) {
          timeSlider.value = (currentTime / duration) * 100;
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        durationDisplay.textContent = formatTime(duration);
        timeSlider.max = 100;
    });

    timeSlider.addEventListener('input', () => {
        const duration = audio.duration;
        if (duration) {
          audio.currentTime = (timeSlider.value / 100) * duration;
        }
    });

    $("#fsPlayButton").click(() => {
        const fsPlayer = document.getElementById('fsPlayer');
        if (fsPlayer.paused) {
            fsPlayer.play();
            $("#fsPlayButton i").removeClass('fa-play').addClass('fa-pause');
            isPlaying = true;
        } else {
            fsPlayer.pause();
            $("#fsPlayButton i").removeClass('fa-pause').addClass('fa-play');
            isPlaying = false;
        }
    });

    $("#fsNextSongButton").click(function () {
        if (currentPlayedSongIndex < playedSongs.length - 1) {
            currentPlayedSongIndex++;
            let nextSongIndex = playedSongs[currentPlayedSongIndex];
            playSongByIndex(nextSongIndex);
        } else {
            getRandomSong();
        }
    });

    $("#fsPrevSongButton").click(function () {
        if (currentPlayedSongIndex > 0) {
            currentPlayedSongIndex--;
            let prevSongIndex = playedSongs[currentPlayedSongIndex];
        playSongByIndex(prevSongIndex);
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
            $("#fsSongNumber").html(favSongs.length + " Songs");
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

        if(isRepeat){
            const audio = document.getElementById('fsPlayer');
            audio.currentTime = 0;
            audio.play();
            return;
        }

        getRandomSong(true);
        fsPlayer.play();
    });

    $("#fsVolume-slider").on("input", function() {
        const fsPlayer = document.getElementById('fsPlayer');
        fsPlayer.volume = $(this).val();
        savedVolume = $(this).val();
        localStorage.setItem("fsVolume", JSON.stringify($(this).val()));
    });

    updateTable();
    getRandomSong();
}

$("#optionsContainer > ul").prepend($(`<li class="clickAble" data-toggle="modal" data-target="#favSong">Wrong Songs</li>`));

function saveSettings() {
  localStorage.setItem("wrongSongs", JSON.stringify({ favSongs: favSongs }));
}

function favoriteSong(why) {
    if (currentInfo != null) {
        // Get mp3 link
        let mp3Link = currentInfo.videoTargetMap.catbox[0];
        mp3Link = mp3Link ? "https://eudist.animemusicquiz.com/" + mp3Link : null;

        // Get video link with preference for 720p, then 480p
        let videoLink = null;
        if (currentInfo.videoTargetMap.catbox[720]) {
            videoLink = "https://eudist.animemusicquiz.com/" + currentInfo.videoTargetMap.catbox[720];
        } else if (currentInfo.videoTargetMap.catbox[480]) {
            videoLink = "https://eudist.animemusicquiz.com/" + currentInfo.videoTargetMap.catbox[480];
        }

        // If both mp3 and video are null, show error and return
        if (mp3Link === null && videoLink === null) {
            console.error("Both MP3 and video links missing, can't favorite.");
            return;
        }

        // Check if song is already favorited
        let favedIndex = favSongs.findIndex(song => song["0"] === mp3Link);
        if (favedIndex !== -1) {
            if (why == "wrong") return;
            favSongs.splice(favedIndex, 1);
            updateClass(false);
        } else {
            if (why == "correct") return;
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
                0: mp3Link,
                songName: currentInfo.songName,
                artist: currentInfo.artist,
                type: type,
                video: videoLink
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

function filterOrder() {
    favSongs.sort((a, b) => {
        const typeOrder = { "OP": 1, "ED": 2, "INS": 3 };
        const typeA = typeof a.type === "string" ? a.type.split(" ")[0] : "";
        const typeB = typeof b.type === "string" ? b.type.split(" ")[0] : "";
        const numberA = typeof a.type === "string" ? parseInt(a.type.split(" ")[1]) : NaN;
        const numberB = typeof b.type === "string" ? parseInt(b.type.split(" ")[1]) : NaN;

        if (typeOrder[typeA] !== typeOrder[typeB]) {
            return (typeOrder[typeA] || 0) - (typeOrder[typeB] || 0);
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

        const playIcon = $("<i>").addClass("fa fa-play play-icon");
        playIcon.click(() => {
            currentPlayedSongIndex++;
            playedSongs[currentPlayedSongIndex] = index;
            playSongByIndex(index);
        });

        const trashIcon = $("<i>").addClass("fa fa-trash delete-icon");
      trashIcon.click(() => {
        favSongs.splice(index, 1);
        updateTable();
        saveSettings();
      });

      const row = $("<tr>").append(
         $("<td>").append(playIcon),
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

function getRandomSong(isEnded) {
    let numSongs = favSongs.length;

    if (numSongs === 0) {
        return;
    }

    let randomIndex;
    if (orderType === "random") {
        if (numSongs === 1) {
            randomIndex = 0;
        } else {
            do {
                randomIndex = Math.floor(Math.random() * numSongs);
            } while (playedSongs.length > 0 && randomIndex === playedSongs[currentPlayedSongIndex]);
        }
    } else if (orderType === "semiRandom") {
        let availableSongs = Array.from({ length: numSongs }, (_, i) => i)
            .filter(index => !playedSongs.includes(index));

        if (availableSongs.length === 0) {
            availableSongs = Array.from({ length: numSongs }, (_, i) => i);
            playedSongs = [];
        }

        randomIndex = availableSongs[Math.floor(Math.random() * availableSongs.length)];
    } else if (orderType === "order") {
        if (currentPlayedSongIndex >= numSongs) {
            currentPlayedSongIndex = 0;
        }
        randomIndex = currentPlayedSongIndex;
    }

    const fsPlayer = document.getElementById('fsPlayer');
    fsPlayer.volume = savedVolume;
    let song = favSongs[randomIndex];
    fsPlayer.src = song[0];
    currentPlayedSongIndex++;
    if(isEnded){
        playedSongs[currentPlayedSongIndex] = randomIndex;
        playedSongs = playedSongs.slice(0, currentPlayedSongIndex + 1);
    }
    else{
        playedSongs.push(randomIndex);
    }

    fsPlayer.play().then(() => {
        if (currentPlayedSongIndex === -1 || randomIndex !== playedSongs[currentPlayedSongIndex]) {
            currentPlayedSongIndex = playedSongs.length - 1;
        }
    }).catch(error => {
        console.error("Failed to play song:", error);
        if (isPlaying) {
            setTimeout(() => {
                getRandomSong();
            }, 5000);
        }
    });

    const fsInfoRow = document.getElementById('fsInfoRow');
    const { songName, artist, romaji, type } = song;
    fsInfoRow.innerHTML = `
      <p class="fsSongInfo">${songName} by ${artist}</p>
      <p class="fsSongInfo">${romaji} • ${type}</p>
    `;

    if (!isPlaying) {
        fsPlayer.pause();
    }
}

function playSongByIndex(songIndex) {
    const fsPlayer = document.getElementById('fsPlayer');
    let song = favSongs[songIndex];
    fsPlayer.src = song[0];

    const fsInfoRow = document.getElementById('fsInfoRow');
    const { songName, artist, romaji, type } = song;
    fsInfoRow.innerHTML = `
      <p class="fsSongInfo">${songName} by ${artist}</p>
      <p class="fsSongInfo">${romaji} • ${type}</p>
    `;

    const fsPlayButton = $("#fsPlayButton");
    if (fsPlayButton.find('i').hasClass('fa-pause')) {
        fsPlayer.play();
    }
}

function processImport(data) {
    try {
        let importedData = JSON.parse(data);
        if (Array.isArray(importedData)) {
            importedData.forEach(item => {
                // Normalize field names
                if (!item.audio && item.url) item.audio = item.url;
                if (!item.animeJPName && item.romaji) item.animeJPName = item.romaji;
                if (!item.songArtist && item.artist) item.songArtist = item.artist;
                if (!item.songType && item.type) item.songType = item.type;

                // Process video links
                let videoLink = null;

                // Process videos from any format - check all possible video fields
                if (item.HQ) {
                    // Check if it's just a filename or a full URL
                    videoLink = item.HQ.includes("://") ? processUrl(item.HQ) : "https://eudist.animemusicquiz.com/" + item.HQ;
                } else if (item.MQ) {
                    videoLink = item.MQ.includes("://") ? processUrl(item.MQ) : "https://eudist.animemusicquiz.com/" + item.MQ;
                } else if (item.video) {
                    videoLink = item.video.includes("://") ? processUrl(item.video) : "https://eudist.animemusicquiz.com/" + item.video;
                }

                // Process items in either format
                if ((item.audio && item.animeJPName) || (item[0] && item.romaji)) {
                    if (item.audio && item.animeJPName) {
                        // Process first format (audio, animeJPName)
                        if (item.songType) {
                            if (item.songType.startsWith("Opening")) {
                                item.songType = "OP " + item.songType.split("Opening")[1].trim();
                            } else if (item.songType.startsWith("Ending")) {
                                item.songType = "ED " + item.songType.split("Ending")[1].trim();
                            } else if (item.songType === "Insert Song") {
                                item.songType = "INS";
                            }
                        }

                        // Check if audio is just a filename or a full URL
                        const audioUrl = item.audio.includes("://") ?
                            processUrl(item.audio) :
                            "https://eudist.animemusicquiz.com/" + item.audio;

                        if (!favSongs.some(song => song[0] === audioUrl)) {
                            favSongs.push({
                                0: audioUrl,
                                romaji: item.animeJPName,
                                english: item.animeENName || item.animeAltName,
                                songName: item.songName,
                                artist: item.songArtist,
                                type: item.songType,
                                video: videoLink
                            });
                        }
                    } else if (item[0] && item.romaji) {
                        // Process second format (item[0], romaji)
                        if (item.type && (item.type.startsWith("Opening") || item.type.startsWith("Ending"))) {
                            item.type = item.type.replace("Opening", "OP").replace("Ending", "ED");
                        }

                        // Check if audio is just a filename or a full URL
                        const audioUrl = item[0].includes("://") ?
                            processUrl(item[0]) :
                            "https://eudist.animemusicquiz.com/" + item[0];

                        if (!favSongs.some(song => song[0] === audioUrl)) {
                            favSongs.push({
                                0: audioUrl,
                                romaji: item.romaji,
                                english: item.english,
                                songName: item.songName,
                                artist: item.artist,
                                type: item.type,
                                video: videoLink
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
    $("#fsSongNumber").html(favSongs.length + " Songs");
    filterOrder();
    saveSettings();
    updateTable();
}

// Helper function to process URLs to ensure they use the correct domain
function processUrl(url) {
    if (!url) return null;

    if (url.startsWith("https://files.catbox.moe/")) {
        return url.replace("https://files.catbox.moe/", "https://eudist.animemusicquiz.com/");
    } else if (url.startsWith("https://ladist1.catbox.video/")) {
        return url.replace("https://ladist1.catbox.video/", "https://eudist.animemusicquiz.com/");
    } else if (url.startsWith("https://abdist1.catbox.video/")) {
        return url.replace("https://abdist1.catbox.video/", "https://eudist.animemusicquiz.com/");
    } else if (url.startsWith("https://nl.catbox.moe/")) {
        return url.replace("https://nl.catbox.moe/", "https://eudist.animemusicquiz.com/");
    } else if (url.startsWith("https://nl.catbox.video/")) {
        return url.replace("https://nl.catbox.video/", "https://eudist.animemusicquiz.com/");
    } else if (url.startsWith("https://naedist.animemusicquiz.com/")) {
        return url.replace("https://naedist.animemusicquiz.com/", "https://eudist.animemusicquiz.com/");
    } else if (url.startsWith("https://nawdist.animemusicquiz.com/")) {
        return url.replace("https://nawdist.animemusicquiz.com/", "https://eudist.animemusicquiz.com/");
    } else if (url.startsWith("https://nl.catbox..moe/")) {
        return url.replace("https://nl.catbox..moe/", "https://eudist.animemusicquiz.com/");
    }
    return url;
}

function exportData() {
    const data = favSongs.map(song => ({
        HQ: song.video,
        audio: song.audio,
        animeJPName: song.romaji,
        animeENName: song.english,
        songArtist: song.artist,
        songName: song.songName,
        songType: song.type
    }));

    const jsonData = JSON.stringify(data, null, 2);

    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'wrongSongs.json';
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleCheckboxSelection(checkbox) {

    let fsRandomCheckbox = document.getElementById("fsRandom");
    let fsSemiRandomCheckbox = document.getElementById("fsSemiRandom");
    let fsOrderCheckbox = document.getElementById("fsOrder");

    if (!checkbox.checked) {
        checkbox.checked = true;
    }
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

function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function notify(){
    gameChat.systemMessage(isToggle
                           ? "Wrong songs will be saved. Use [/wstoggle] to disable."
                           : "Wrong songs won't be saved. Use [/wstoggle] to enable.");

    gameChat.systemMessage(isList
                           ? "Only misses from your list will be saved. Use [/wslist] to save all misses."
                           : "All misses will be saved. Use [/wslist] to save only those from your list.");
}

document.getElementById("gcInput").addEventListener("keydown", function(event) {
    if (event.keyCode === 13) {
        let text = document.getElementById("gcInput").value.trim();
        let settings = JSON.parse(localStorage.getItem("wsSettings")) || { isList: false, isToggle: true };

        if (text === "/wslist") {
            event.preventDefault();
            settings.isList = !settings.isList;
            isList = !isList;
            gameChat.systemMessage(isList
                           ? "Only misses from your list will be saved."
                           : "All misses will be saved.");
            localStorage.setItem("wsSettings", JSON.stringify(settings)); // Save updated state
            document.getElementById("gcInput").value = "";
        }
        else if (text === "/wstoggle") {
            event.preventDefault();
            settings.isToggle = !settings.isToggle;
            isToggle = !isToggle;
            gameChat.systemMessage(isToggle
                           ? "Wrong songs will be saved."
                           : "Wrong songs won't be saved.");
            localStorage.setItem("wsSettings", JSON.stringify(settings)); // Save updated state
            document.getElementById("gcInput").value = "";
        }
    }
});

//LISTENERS
new Listener("answer results", (payload) => {
    currentInfo = payload.songInfo;
    let link = currentInfo.videoTargetMap.catbox[0];
    if(link == undefined){
        console.error("Mp3 link missing.");
    }
    else{
        link = "https://eudist.animemusicquiz.com/" + link;

        // Check for video link with preference for 720p, then 480p
        let videoLink = null;
        if (currentInfo.videoTargetMap.catbox[720]) {
            videoLink = "https://eudist.animemusicquiz.com/" + currentInfo.videoTargetMap.catbox[720];
        } else if (currentInfo.videoTargetMap.catbox[480]) {
            videoLink = "https://eudist.animemusicquiz.com/" + currentInfo.videoTargetMap.catbox[480];
        }

        // Find if the song is already favorited
        let favedIndex = favSongs.findIndex(song => song["0"] === link);
        let faved = favedIndex !== -1;

        // If we found a video but the favorited song doesn't have one, update it
        if (faved && videoLink && !favSongs[favedIndex].video) {
            favSongs[favedIndex].video = videoLink;
            saveSettings(); // Save the updated song with video
        }

        updateClass(faved);
    }

    // GET PLAYER CORRECT STATE

    let playersArray = Object.values(quiz.players);
    let playerID = playersArray.findIndex(player => player._name === selfName);
    if(playerID == -1) return;
    if(isToggle == true && isList == false || isToggle == true && isList == true && payload.players[playerID].listStatus >= 0) if(payload.players[playerID].correct == false) favoriteSong("wrong");
    if(payload.players[playerID].correct == true) favoriteSong("correct");

}).bindListener();

new Listener("Join Game", (response) => {
	if(response.error) return;
	notify();
}).bindListener();

new Listener("Spectate Game", (response) => {
	if(response.error) return;
	notify();
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
        box-shadow: none;
    }

    #fsNextSongButton:hover {
        box-shadow: none;
    }

    #fsPrevSongButton:hover {
        box-shadow: none;
    }

    .play-icon:hover {
        color: #aebbd8;
        cursor: pointer;
    }

    .main-button:hover {
        color: #aebbd8;
        cursor: pointer;
    }

    .main-button {
        color: rgb(217, 217, 217);
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
        gap: 10px;
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
        gap: 10px;
    }

    #fsSongNumberContainer {
        text-align: right;
    }







    .fsSoundControl {
        position: relative;
        right: 10px;
        display: inline-block;
    }

    .fsRepeatControl {
        position: relative;
        left: 10px;
        display: inline-block;
    }

    .fsSound-icon {
        font-size: 20px;
        cursor: pointer;
    }

    .fsRepeat-icon {
        font-size: 20px;
        cursor: pointer;
    }

    .fsVolume-slider {
        position: absolute;
        left: 50%;
        bottom: 100%;
        transform: translateX(-50%);
        transform: translateX(-50%) rotate(180deg);
        width: 8px;
        height: 70px;
        border-radius: 10px;
        background: #63759d;
        visibility: hidden;
        opacity: 0;
        transition: visibility 0.3s ease, opacity 0.3s ease;
        outline: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
    }

    .fsVolume-slider:hover,
    .fsSoundControl:hover .fsVolume-slider {
        visibility: visible;
        opacity: 1;
    }

    .fsVolume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 15px;
        height: 15px;
        background: #aebbd8;
        cursor: pointer;
        border-radius: 50%;
    }

    .fsVolume-slider::-moz-range-thumb {
        width: 15px;
        height: 15px;
        background: #aebbd8;
        cursor: pointer;
        border-radius: 50%;
    }

    .fsVolume-slider {
        writing-mode: bt-lr;
        -webkit-writing-mode: vertical-rl;
    }

    #fsDuration {
        padding-left: 5px;
        font-size: 16px;
    }

    #fsCurrentTime {
        padding-right: 5px;
        font-size: 16px;
    }

    #fsTimeSlider {
        -webkit-appearance: none;
        margin-top: 7px;
        height: 8px;
        width: 13vh;
        background: #63759d;
        outline: none;
        border-radius: 5px;
    }

    #fsTimeSlider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 15px;
        height: 15px;
        background: #aebbd8;
        border-radius: 50%;
        cursor: pointer;
    }

    #fsTimeSlider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: #aebbd8;
        border-radius: 50%;
        cursor: pointer;
    }
`);

AMQ_addScriptData({
    name: "Favorite Songs",
    author: "Mxyuki",
    version: version,
    link: "https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqFavoriteSongs.user.js",
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
