// ==UserScript==
// @name         AMQ Anisong Search
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.2
// @description  Based on Kempanator amqAnswerStats, just click on the Title / Song Name / Artist Name to do an AnisondDB Research.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqWindows.js
// ==/UserScript==

if (document.querySelector("#startPage")) return;

let anisongdbWindow;

new Listener("answer results", (payload) => {
    setTimeout(function() {
        var p = document.getElementById("qpSongArtist");
        p.addEventListener("click", function(){
            anisongdbWindow.open();
            getAnisongdbData("artist", payload.songInfo.artist);
        });
        p = document.getElementById("qpAnimeName");
        p.addEventListener("click", function(){
            anisongdbWindow.open();
            getAnisongdbData("anime", payload.songInfo.animeNames.romaji);
        });
        p = document.getElementById("qpSongName");
        p.addEventListener("click", function(){
            anisongdbWindow.open();
            getAnisongdbData("song", payload.songInfo.songName);
        });
        applyStyles();
    }, 100);
}).bindListener();

function getAnisongdbData(mode, query) {
    anisongdbWindow.panels[0].clear();
    anisongdbWindow.panels[0].panel.append(`<p>loading...</p>`);
    let json = {};
    json.and_logic = false;
    json.ignore_duplicate = false;
    json.opening_filter = true;
    json.ending_filter = true;
    json.insert_filter = true;
    if (mode === "anime") json.anime_search_filter = {search: query, partial_match: false};
    else if (mode === "artist") json.artist_search_filter = {search: query, partial_match: false, group_granularity: 0, max_other_artist: 99};
    else if (mode === "song") json.song_name_search_filter = {search: query, partial_match: false}
    else if (mode === "composer") json.composer_search_filter = {search: query, partial_match: false, arrangement: false};
    return fetch("https://anisongdb.com/api/search_request", {
        method: "POST",
        headers: {"Accept": "application/json", "Content-Type": "application/json"},
        body: JSON.stringify(json)
    }).then(res => (res.json())).then(json => {
        console.log(json);
        anisongdbWindow.panels[0].clear();
        let $table = $(`
            <table id="anisongdbTable">
                <tr class="firstRow">
                    <th class="anime">Anime</th>
                    <th class="artist">Artist</th>
                    <th class="song">Song</th>
                    <th class="type">Type</th>
                    <th class="vintage">Vintage</th>
                </tr>
            </table>
        `);
        for (let result of json) {
            let $row = $(`
                <tr>
                    <td>${options.useRomajiNames ? result.animeJPName : result.animeENName}</td>
                    <td>${result.songArtist}</td>
                    <td>${result.songName}</td>
                    <td>${shortenType(result.songType)}</td>
                    <td>${result.animeVintage}</td>
                </tr>
            `)
            $table.append($row);
        }
        anisongdbWindow.panels[0].panel.append($table);
    });
}

function shortenType(type) {
    return type.replace("Opening ", "OP").replace("Ending ", "ED").replace("Insert Song", "IN");
}

anisongdbWindow = new AMQWindow({
    id: "anisongdbWindow",
    title: "AnisongDB Search",
    width: 600,
    height: 400,
    minWidth: 0,
    minHeight: 0,
    zIndex: 1100,
    resizable: true,
    draggable: true
});
anisongdbWindow.addPanel({
    id: "anisongdbPanel",
    width: 1.0,
    height: "100%",
    scrollable: {x: false, y: true}
});

function applyStyles() {
    let style = document.createElement("style");
    style.type = "text/css";
    style.id = "answerStatsStyle";
    style.appendChild(document.createTextNode(`
        #anisongdbTable {
            width: 100%;
        }
        #anisongdbTable th {
            font-weight: bold;
        }
        #anisongdbTable tr:hover {
            color: #70b7ff;
        }
        #anisongdbTable th.anime {
            width: 25%;
        }
        #anisongdbTable th.artist {
            width: 25%;
        }
        #anisongdbTable th.song {
            width: 25%;
        }
        #anisongdbTable th.type {
            width: 10%;
        }
        #anisongdbTable th.vintage {
            width: 15%;
        }
        #anisongdbTable tr:nth-child(even) {
            background-color: #353535;
        }
        .firstRow {
            background-color: #282828;
            padding: 10px;
        }
        #qpSongArtist:hover {
            color: #acacac;
            cursor: pointer;
        }
        #qpAnimeName:hover {
            color: #acacac;
            cursor: pointer;
        }
        #qpSongName:hover {
            color: #acacac;
            cursor: pointer;
        }
    `));
    document.head.appendChild(style);
}
