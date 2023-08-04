// ==UserScript==
// @name         AMQ Fav Songs
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.0.1
// @description  Make that you can Favorite a song during the Answer Result, and make that you can have a radio of only your favorite song you heard on AMQ.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// ==/UserScript==

let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

let savedData = JSON.parse(localStorage.getItem("favSongs")) || {
  favSongs: []
};

let savedVolume = JSON.parse(localStorage.getItem("fsVolume")) || 0.5;


let favSongs = savedData.favSongs;
let currentInfo = null;
let previousSongIndex = -1;
let prePreviousSongIndex = -1;

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

                        <div id="favSongsList">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th style="font-weight: bold;">Anime Name</th>
                                        <th style="font-weight: bold;">Song Name</th>
                                        <th style="font-weight: bold;">Artist</th>
                                        <th style="font-weight: bold;">Type</th>
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
        getRandomSong();
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
            const { songName, artist, type } = favSongs[prePreviousSongIndex];
            fsInfoRow.innerHTML = `
                <p class="fsSongInfo">${songName} by ${artist}</p>
                <p class="fsSongInfo">${type}</p>
            `;

            const fsPlayButton = $("#fsPlayButton");
            if (fsPlayButton.find('i').hasClass('fa-pause')) {
                const fsPlayer = document.getElementById('fsPlayer');
                fsPlayer.play();
            }
        }
    });

    fsPlayer.addEventListener('ended', function() {
        getRandomSong();
        fsPlayer.play();
    });

    $("#fsVolumeSlider").on("input", function() {
        const fsPlayer = document.getElementById('fsPlayer');
        fsPlayer.volume = $(this).val();
        savedVolume = $(this).val();
        localStorage.setItem("fsVolume", JSON.stringify($(this).val()));
    });

    updateTable();
    getRandomSong();
}

$("#optionsContainer > ul").prepend($(`<li class="clickAble" data-toggle="modal" data-target="#favSong">Fav. Songs</li>`));

function saveSettings() {
  localStorage.setItem("favSongs", JSON.stringify({ favSongs: favSongs }));
}

function favoriteSong(){
    if (currentInfo != null) {
        let link = currentInfo.urlMap.catbox[0];
        if (link.includes("files.")) {
            link = link.replace("files.", "nl.");
        }
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

        updateTable();
        saveSettings();
    }
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

function getRandomSong() {
    prePreviousSongIndex = previousSongIndex;
    let numSongs = favSongs.length;

    if (numSongs === 0) {
      return;
    }
    if (numSongs === 1) {
      previousSongIndex = 0;
    } else {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * numSongs);
      } while (randomIndex === previousSongIndex);

      previousSongIndex = randomIndex;
    }
    const fsPlayer = document.getElementById('fsPlayer');
    fsPlayer.volume = savedVolume;
    fsPlayer.src = favSongs[previousSongIndex]["0"];

    const fsInfoRow = document.getElementById('fsInfoRow');
    const { songName, artist, romaji, type } = favSongs[previousSongIndex];
    fsInfoRow.innerHTML = `
      <p class="fsSongInfo">${songName} by ${artist}</p>
      <p class="fsSongInfo">${romaji} • ${type}</p>
    `;
}

//LISTENERS
new Listener("answer results", (payload) => {
    currentInfo = payload.songInfo;
    let link = currentInfo.urlMap.catbox[0];
    if (link.includes("files.")) {
        link = link.replace("files.", "nl.");
    }
    let faved = favSongs.findIndex(song => song["0"] === link);

    if(faved === -1) faved = false;
    else faved = true;

    updateClass(faved);
}).bindListener();

//STYLE
AMQ_addStyle(`
    .faved {
        color: #85a4e2;
    }
    .unfaved {
        color: #fff;
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

    /* For Chrome, Safari, and Opera */
    #fsVolumeSlider::-webkit-slider-thumb {
        background-color: #ff0000; /* Change to your desired color */
    }

    /* For Firefox */
    #fsVolumeSlider::-moz-range-thumb {
        background-color: #ff0000; /* Change to your desired color */
    }

    /* For IE and Edge */
    #fsVolumeSlider::-ms-thumb {
        background-color: #ff0000; /* Change to your desired color */
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
        <p>In this page you will have the Radio Player and the list of all your liked song which you can removed them from here.</p>
        <img src="https://i.imgur.com/QlFrkOQ.png" style="max-width: 250px">
    `
});
