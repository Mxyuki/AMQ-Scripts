// ==UserScript==
// @name         AMQ Artist Game
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.5.0
// @description  Play with song only from a certain artist
// @description  You must already be in a game to start it.
// @description  "/ag <artist name>" to start a game.
// @description  "/agset" to open the setting window.
// @description  "/reset" to leave the game.
// @description  "/agvol <volume>" change the volume.
// @description  The Toggle List only use your AniList (MAL API is a pain that i didn't wante dto touch)
// @description  It's still in early version so bug are expected, and also a lot of features are missings.
// @description  Also can't be played during ranked because I use anisongdb to get the music and artist API call are blocked during ranked.
// @description  The next update i will make will be when anisongdb api call send long name (exemple noucome) or to fix bug.
// @description  Will one day make a cleaner version with kempanator when he finished working on his other script, because this script is a mess.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqWindows.js
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqArtistGame.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqArtistGame.user.js
// ==/UserScript==

if (document.getElementById("startPage")) return;

let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        clearInterval(loadInterval);
        setup();
    }
}, 500);

let artistSongList = [];
let allAnimeNames = [];

let completed = [];
let watching = [];
let onHold = [];
let dropped = [];
let planning = [];

let selectedAnime = [];
let currentSongIndex = 0;
let songTime;
let audio;
let randomTime;
let countDownInterval;
let countDown;
let pauseTime;
let maxArtist = 99;
let answer;
let volume = 0.5;
let commandArtist;
let isreset = false;

let isSkippable;

let point = 0;

let settingFiltered = [];

let gameSettings = {
    guessTime: 20,
    op: true,
    ed: true,
    ins: true,
    songNumber: 20,
    minYear: 1944,
    maxYear: 2023,
    minDiff: 0,
    maxDiff: 100,
    noYear: true,
    noDiff: true,
    list: true,
    watching: true,
    completed: true,
    onHold: true,
    dropped: true,
    planning: true
};

let agWindow;

function setup(){

    document.querySelector('#gcInput').addEventListener('keydown', function(event) {
        if (event.key === 'Enter'){
            processCommand(this.value);
        }
    });

    $('#gameChatPage > .col-xs-9').append('<div id="gameArtist" class="text-center hidden"></div>');

    $('#gameArtist').append(`
        <div id="gaAnimeContainer" class="row">
            <div class="col-xs-3">
                <div id="gaStandingContainer" class="container qpSideContainer floatingContainer cheatTestHide">
				    <div>
                        <h3>Score</h3>
                        <h4 id="gaStandingCorrectCount" class="hide" data-toggle="popover" data-content="Number of Correct Guesses." data-trigger="hover" data-html="true" data-placement="top" data-original-title="" title="">0</h4>
                    </div>
                    <div id="gaStandingItemContainer" class="ps__always_visible ps ps--theme_default" data-ps-id="f75b56c8-4af0-6f2b-8fd8-bec551a07143">
                        <div id="gaScoreBoardEntryContainer"></div>
                        <div class="ps__scrollbar-x-rail" style="left: 0px; bottom: 0px;">
                            <div class="ps__scrollbar-x" tabindex="0" style="left: 0px; width: 0px;"></div>
                        </div>
                        <div class="ps__scrollbar-y-rail" style="top: 0px; right: 0px;">
                            <div class="ps__scrollbar-y" tabindex="0" style="top: 0px; height: 0px;"></div>
                        </div>
                    </div>
                    <div id="gaScore">
                        <h1 id="gaScoreText">0</h1>
                    </div>
                </div>
            </div>
            <div id="gaAnimeCenterContainer" class="col-xs-6">
                <div id="gaCenterInfoContainer">
	                <div id="gaCounterShadowHider">
                        <div id="gaCounter" class="floatingContainer">
                            <span id="gaCurrentSongCount">100</span>/<span id="gaTotalSongCount">100</span>
                        </div>
                    </div>
                    <div id="gaAnimeNameContainer" class="qpAnimeNameContainer floatingContainer" data-original-title="" title="">
                        <div id="gaAnimeName">Name</div>
                    </div>
                </div>
                <div id="gaVideoContainerOuter">
                    <div id="gaVideoContainer">
                        <h1 id="gaCountDown" style="position: relative; top: -180px; font-size: 120px;">0</h1>
                    </div>
                </div>
                <div id="gaAnswerInputContainer" class="floatingContainer">
				    <div id="gaSkipContainer">
                        <div id="gaVoteShadowHider">
                            <duv id="gaVoteSkipGlowContainer"></duv>
                            <div id="gaVoteSkip" class="leftRightButtonTop clickAble qpSkipSection">
                                <p id="gaSkipText">Skip</p>
                            </div>
                        </div>
                    </div>
                    <input type="text" class="flatTextInput" id="gaAnswerInput" placeholder="Anime Name" maxlength="255"">
                </div>
            </div>
            <div class="col-xs-3">
                <div id="gaSongInfoContainer" class="container qpSideContainer floatingContainer cheatTestHide">
                    <div class="row">
                        <h3>Song Info</h3>
                    </div>
                    <div class="row">
                        <h5><b>Song Name</b></h5>
                        <p id="gaSongName">song name</p>
                    </div>
                    <div class="row">
                        <h5><b>Artist</b></h5>
                        <p id="gaSongArtist">artist</p>
                    </div>
                    <div class="row">
                        <h5><b>Type</b></h5>
                        <p id="gaSongType">type</p>
                    </div>
                </div>
            </div>
        </div>
    `);

    agWindow = new AMQWindow({
        title: "Artist Game Settings",
        width: 700,
        height: 550,
        minWidth: 440,
        minHeight: 250,
        zIndex: 999,
        draggable: true
    });

    agWindow.addPanel({
        width: 1.0,
        height: 450,
        position: {
            x: 0,
            y: 20
        },
        id: "agOption"
    });

    $('#agOption').append(`
        <div id="agQuizSettings" class="mhSettingContainer">
            <div class="row">
                <div id="gaGuessTime" class="col-xs-6 text-center">
                    <label>Guess Time</label>
                    <div>
                        <input id="gaGuessTimeText" type="text" value="20" class="gaText text-center">
                    </div>
                </div>
                <div id="gaSongType" class="col-xs-6 text-center">
                    <label>Song Type</label>
                    <div id="gaSongTypeContainer" class="checkboxContainer">
						<div>
							<div class="customCheckbox">
								<input id="gaOpening" type="checkbox" checked="">
								<label for="gaOpening"><i class="fa fa-check" aria-hidden="true"></i></label>
							</div>
							<p>Opening</p>
						</div>
						<div>
							<div class="customCheckbox">
								<input type="checkbox" id="gaEnding" checked="">
								<label for="gaEnding"><i class="fa fa-check" aria-hidden="true"></i></label>
							</div>
							<p>Ending</p>
						</div>
						<div>
							<div class="customCheckbox">
								<input type="checkbox" id="gaInsert" checked="">
								<label for="gaInsert"><i class="fa fa-check" aria-hidden="true"></i></label>
							</div>
							<p>Insert Song</p>
						</div>
					</div>
                </div>
            </div>
            <div class="row">
                <div id="gaNumberSong" class="col-xs-6 text-center">
                    <label>Number of Songs</label>
                    <div>
                        <input id="gaNumberSongText" type="text" value="20" class="gaText text-center">
                    </div>
                </div>
                <div id="gaYear" class="col-xs-6 text-center">
                    <label>Min/Max Year</label>
                    <div>
                        <input id="gaYearMinText" type="text" value="1944" class="gaText text-center">
                        -
                        <input id="gaYearMaxText" type="text" value="2023" class="gaText text-center">
                    </div>
                </div>
            </div>
            <div class="row">
                <div id="gaDifficulty" class="col-xs-6 text-center">
                    <label>Min/Max Difficulty</label>
                    <div>
                        <input id="gaDifficultyMinText" type="text" value="0" class="gaText text-center">
                        -
                        <input id="gaDifficultyMaxText" type="text" value="100" class="gaText text-center">
                    </div>
                </div>
                <div id="gaMaxArtist" class="col-xs-6 text-center">
                    <label>Max Other Artist</label>
                    <div>
                        <input id="gaMaxArtistText" type="text" value="99" class="gaText text-center">
                    </div>
                </div>
            </div>
            <div class="row">

                <div id="gaNotDefined" class="col-xs-6 text-center">
                    <label>Year/Diff Not defined</label>
                    <div id="gaSongTypeContainer" class="checkboxContainer">
                        <div>
                            <div class="customCheckbox">
                                <input id="gaNoYear" type="checkbox" checked="">
                                <label for="gaNoYear"><i class="fa fa-check" aria-hidden="true"></i></label>
                            </div>
                            <p>Toggle Year</p>
                        </div>
                        <div>
                            <div class="customCheckbox">
                                <input id="gaNoDiff" type="checkbox" checked="">
                                <label for="gaNoDiff"><i class="fa fa-check" aria-hidden="true"></i></label>
                            </div>
                            <p>Toggle Diff</p>
                        </div>
                    </div>
                </div>
                <div id="gaToggleList" class="col-xs-6 text-center">
                    <label>Anilist Anime Only</label>
                    <div id="gaSongTypeContainer" class="checkboxContainer">
                        <div>
                            <div class="customCheckbox">
                                <input id="gaListToggle" type="checkbox" checked="">
                                <label for="gaListToggle"><i class="fa fa-check" aria-hidden="true"></i></label>
                            </div>
                            <p>Toggle List</p>
                        </div>
                    </div>
                </div>

            </div>

            <div class="row">
                <div id="gaListType" class="text-center">
                    <label>Include Entries</label>
                    <div id="gaSongTypeContainer" class="checkboxContainer">
                        <div>
                            <div class="customCheckbox">
                                <input id="gaWatching" type="checkbox" checked="">
                                <label for="gaWatching"><i class="fa fa-check" aria-hidden="true"></i></label>
                            </div>
                            <p>Watching</p>
                        </div>
                        <div>
                            <div class="customCheckbox">
                                <input type="checkbox" id="gaCompleted" checked="">
                                <label for="gaCompleted"><i class="fa fa-check" aria-hidden="true"></i></label>
                            </div>
                            <p>Completed</p>
                        </div>
                        <div>
                            <div class="customCheckbox">
                                <input type="checkbox" id="gaOnHold" checked="">
                                <label for="gaOnHold"><i class="fa fa-check" aria-hidden="true"></i></label>
                            </div>
                            <p>On Hold</p>
                        </div>
                        <div>
                            <div class="customCheckbox">
                                <input id="gaDropped" type="checkbox" checked="">
                                <label for="gaDropped"><i class="fa fa-check" aria-hidden="true"></i></label>
                            </div>
                            <p>Dropped</p>
                        </div>
                        <div>
                            <div class="customCheckbox">
                                <input id="gaPlanning" type="checkbox" checked="">
                                <label for="gaPlanning"><i class="fa fa-check" aria-hidden="true"></i></label>
                            </div>
                            <p>Planning</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);

    $('#gaOpening').prop('checked', gameSettings.op).click(() => {
        gameSettings.op = !gameSettings.op;
    });
    $('#gaEnding').prop('checked', gameSettings.ed).click(() => {
        gameSettings.ed = !gameSettings.ed;
    });
    $('#gaInsert').prop('checked', gameSettings.ins).click(() => {
        gameSettings.ins = !gameSettings.ins;
    });
    $('#gaNoYear').prop('checked', gameSettings.noYear).click(() => {
        gameSettings.noYear = !gameSettings.noYear;
    });
    $('#gaNoDiff').prop('checked', gameSettings.noDiff).click(() => {
        gameSettings.noDiff = !gameSettings.noDiff;
    });
    $('#gaListToggle').prop('checked', gameSettings.list).click(() => {
        gameSettings.list = !gameSettings.list;
    });
    $('#gaWatching').prop('checked', gameSettings.watching).click(() => {
        gameSettings.watching = !gameSettings.watching;
    });
    $('#gaCompleted').prop('checked', gameSettings.completed).click(() => {
        gameSettings.completed = !gameSettings.completed;
    });
    $('#gaOnHold').prop('checked', gameSettings.onHold).click(() => {
        gameSettings.onHold = !gameSettings.onHold;
    });
    $('#gaDropped').prop('checked', gameSettings.dropped).click(() => {
        gameSettings.dropped = !gameSettings.dropped;
    });
    $('#gaPlanning').prop('checked', gameSettings.planning).click(() => {
        gameSettings.planning = !gameSettings.planning;
    });

    document.getElementById("gaVoteSkip").addEventListener("click", gaSkipClicked);
    document.getElementById("gaAnswerInput").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            if(answer == document.getElementById("gaAnswerInput").value) gaSkipClicked();
            answer = document.getElementById("gaAnswerInput").value;
            $("#gaAnswerInputContainer").css("box-shadow", "0 0 10px 2px rgb(111, 187, 217)");
        }
    });

    AMQ_addStyle(`
    #gameArtist {
        height: calc(100%);
    }
    #gaAnimeContainer {
        margin-bottom: 20px;
    }
    #gaStandingContainer {
        padding: 0;
    }
    #gaStandingCorrectCount {
        position: absolute;
        top: 5px;
        right: 5px;
        margin: 0;
        text-shadow: 0 0 5px #fff, 0 0 15px #b6ff00, 0 0 20px #b6ff00, 0 0 25px #b6ff00;
    }
    #gaStandingItemContainer {
        position: relative;
    }
    #gaCounterShadowHider {
        position: relative;
        z-index: 5;
        overflow: hidden;
        padding-top: 5px;
    }
    #gaCounter {
        font-size: 22px;
        width: 7ch;
        margin: 0 auto;
        border-top-left-radius: 50px;
        border-top-right-radius: 50px;
    }
    #gaAnimeNameContainer {
        font-size: 25px;
        position: relative;
    }
    #gaAnimeName {
        position: absolute;
        min-width: 100%;
        top: 50%;
        transform: translateY(-50%);
        white-space: pre-wrap;
    }
    #gaAnimeNameHider {
        position: absolute;
        top: 36px;
        left: 0;
        right: 0;
        background-color: #424242;
        line-height: 65px;
        font-size: 60px;
    }
    #gaVideoContainer {
        margin-top: 12px;
        width: 100%;
        height: 0px;
        padding-top: 56.25%;
        position: relative;
        background-color: #000;
    }
    #gaVideoOverflowContainer {
        position: relative;
        height: 100%;
        width: 100%;
        border-radius: 2px;
        overflow: hidden;
        z-index: 1;
        background-color: black;
    }
    @media screen and (max-height: 749px) #gaVideoContainer {
        width: 80%;
        padding-top: 45.1%;
        margin: 12px auto 0;
    }
    #gaAnswerInputContainer {
        width: 80%;
        margin: 8px auto 5px;
        padding: 5px;
        position: relative;
    }
    #gaSkipContainer {
        position: absolute;
        z-index: 1;
        top: 0;
        left: 0;
        height: 100%;
        width: 60px;
    }
    #gaVoteShadowHider {
        position: absolute;
        left: 0;
        top: 0;
        overflow: hidden;
        width: 80px;
        height: 100%;
    }
    #gaVoteSkipGlowContainer {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        -webkit-box-shadow: 3px 0px 10px 5px #228dff;
        box-shadow: 3px 0px 10px 5px #228dff;
        opacity: 0.7;
        z-index: -1;
    }
    #gaVoteSkip {
        position: absolute;
        width: 60px;
        top: 0;
        left: -14px;
        overflow: hidden;
        background-color: #424242;
        transform: skewX(-35.5deg);
        transition: transform 0.3s ease-out;
    }
    #gaSkipText {
        margin-top: 6px;
        margin-left: 7px;
    }
    #gaAnswerInputContainer .awesomplete {
        width: 100%;
    }
    .gaText {
        width: 50px;
        color: #000;
    }
    `);
}

function processCommand(command){
    if (command.startsWith("/ag ")){
        document.querySelector('#gcInput').value = "";

        commandArtist = command.replace("/ag ", "");
        if(commandArtist == " ") return;

        completed = [];
        dropped = [];
        planning = [];
        onHold = [];
        watching = [];
        isreset = false;

        gameSettings.guessTime = $('#gaGuessTimeText').val();
        gameSettings.songNumber = $('#gaNumberSongText').val();
        gameSettings.minYear = $('#gaYearMinText').val();
        gameSettings.maxYear = $('#gaYearMaxText').val();
        gameSettings.minDiff = $('#gaDifficultyMinText').val();
        gameSettings.maxDiff = $('#gaDifficultyMaxText').val();

        if(gameSettings.list == true){
            if(gameSettings.watching == false && gameSettings.completed == false && gameSettings.onHold == false && gameSettings.dropped == false && gameSettings.planning == false || gameSettings.op == false && gameSettings.ed == false && gameSettings.ins == false || gameSettings.songNumber <= 0 || gameSettings.guessTime <= 0) return;
            else getAnilist();
        }
        else{

            maxArtist = $('#gaMaxArtistText').val();

            currentSongIndex = 0;
            point = 0;
            $('#gaScoreText').text(point);
            anisongDB(commandArtist);
        }
    }
    else if (command.startsWith("/reset")){

        document.querySelector('#gcInput').value = "";

        isreset = true;

        clearInterval(countDownInterval);
        countDown = 0;
        clearTimeout(songTime);
        clearTimeout(pauseTime);

        if(audio) audio.pause();

        $("#gameArtist").addClass("hidden");
        $("#quizPage").removeClass("hidden");

    }
    else if (command.startsWith("/agset")){

        document.querySelector('#gcInput').value = "";

        agWindow.open();

    }
    else if (command.startsWith("/agvol ")){
        document.querySelector('#gcInput').value = "";

        if(command == "/agvol") return;
        let commandVolume = command.replace("/agvol ", "");
        if(commandVolume == " ") return;

        volume = commandVolume;
        if(audio) audio.volume = volume;
        chatSystemMessage("Volume changed to: " + volume)
    }
}

function chatSystemMessage(msg) {
    if (!gameChat.isShown()) return;
    gameChat.systemMessage(msg);
}

function anisongDB(query){

    let json = {};
    json.and_logic = false;
    json.ignore_duplicate = false;
    json.opening_filter = true;
    json.ending_filter = true;
    json.insert_filter = true;
    json.artist_search_filter = {search: query, partial_match: false, group_granularity: 0, max_other_artist: maxArtist};
    return fetch("https://anisongdb.com/api/search_request", {
        method: "POST",
        headers: {"Accept": "application/json", "Content-Type": "application/json"},
        body: JSON.stringify(json)
    }).then(res => (res.json())).then(json => {
        //console.log(json);
        artistSongList = json;

        artistSongList = artistSongList.map(song => {
            return {
                ...song,
                animeENName: [song.animeENName],
                animeJPName: [song.animeJPName]
            };
        });

        artistSongList.forEach(song1 => {
            artistSongList.forEach(song2 => {
                if (song1 !== song2 && song1.songArtist === song2.songArtist && song1.songName === song2.songName) {
                    if (!song1.animeENName.includes(song2.animeENName)) {
                        song1.animeENName.push(`${song2.animeENName[0]}`);
                    }
                    if (!song1.animeJPName.includes(song2.animeJPName)) {
                        song1.animeJPName.push(`${song2.animeJPName[0]}`);
                    }
                }
            });
        });
        //console.log(artistSongList);
        processJson();
    });
}

function processJson(){

    if(!$("#quizPage").hasClass("hidden") && artistSongList.length != 0){

        processsettings();

        $("#quizPage").addClass("hidden");

        $("#gameArtist").removeClass("hidden");
    }
}

function processsettings(){

    settingFiltered = [];

    if(gameSettings.list == true){
        //console.log(selectedAnime);

        if(gameSettings.completed == true){
            artistSongList.forEach(selected => {
                if (completed.includes(selected.animeENName[0]) || completed.includes(selected.animeJPName[0])) {
                    settingFiltered.push(selected);
                }
            });
        }
        if(gameSettings.watching == true){
            artistSongList.forEach(selected => {
                if (watching.includes(selected.animeENName[0]) || watching.includes(selected.animeJPName[0])) {
                    settingFiltered.push(selected);
                }
            });
        }
        if(gameSettings.onHold == true){
            artistSongList.forEach(selected => {
                if (onHold.includes(selected.animeENName[0]) || onHold.includes(selected.animeJPName[0])) {
                    settingFiltered.push(selected);
                }
            });
        }
        if(gameSettings.dropped == true){
            artistSongList.forEach(selected => {
                if (dropped.includes(selected.animeENName[0]) || dropped.includes(selected.animeJPName[0])) {
                    settingFiltered.push(selected);
                }
            });
        }
        if(gameSettings.planning == true){
            artistSongList.forEach(selected => {
                if (planning.includes(selected.animeENName[0]) || planning.includes(selected.animeJPName[0])) {
                    settingFiltered.push(selected);
                }
            });
        }
        //console.log(settingFiltered);
    }
    else{
        settingFiltered = artistSongList;
    }

    let filteredType = [];

    settingFiltered.forEach(obj => {
        if(gameSettings.op == true && obj.songType.startsWith("Opening")) filteredType.push(obj);
        else if (gameSettings.ed == true && obj.songType.startsWith("Ending")) filteredType.push(obj);
        else if (gameSettings.ins == true && obj.songType.startsWith("Insert")) filteredType.push(obj);
    });

    //console.log(filteredType);

    settingFiltered = filteredType;
    
    settingFiltered = settingFiltered.filter(obj => {
        if (obj.songDifficulty) {
            return obj.songDifficulty >= gameSettings.minDiff && obj.songDifficulty <= gameSettings.maxDiff;
        }
        else{
            if(gameSettings.noDiff == false) return false;
            else return true;
        }
    });

    settingFiltered = settingFiltered.filter(obj => {
        if (obj.animeVintage) {
            let year = parseInt(obj.animeVintage.split(" ")[1]);
            return year >= gameSettings.minYear && year <= gameSettings.maxYear;
        }
        else{
            if(gameSettings.noYear == false) return false;
            else return true;
        }
    });

    settingFiltered.forEach(song1 => {
        settingFiltered.forEach(song2 => {
            if (song1 !== song2 && song1.songArtist === song2.songArtist && song1.songName === song2.songName && (song1.animeJPName[0] === song2.animeJPName[0] || song1.animeENName[0] === song2.animeENName[0])) {
                let index = settingFiltered.indexOf(song2);
                settingFiltered.splice(index, 1);
            }
        });
    });

    if(settingFiltered.length == 0) finished();

    if(settingFiltered.length > gameSettings.songNumber){
        for(let i = 0; i < gameSettings.songNumber; i++){
            let randomIndex = Math.floor(Math.random() * settingFiltered.length);
            selectedAnime[i] = settingFiltered[randomIndex];
            settingFiltered.splice(randomIndex, 1);
        }
    }
    else{
        selectedAnime = shuffleArray(settingFiltered);
    }

    $('#gaCurrentSongCount').text("?");
    $('#gaTotalSongCount').text(selectedAnime.length);

    setTimeout(playMusic, 1000);

}

function playMusic() {

    if(isreset) return;

    $('#gaCurrentSongCount').text(currentSongIndex + 1);
    document.getElementById("gaAnswerInput").value = "";
    $("#gaAnswerInputContainer").css("box-shadow", "none");
    $("#gaStandingContainer").css("box-shadow", "none");
    answer = "";
    isSkippable = true;

    if (currentSongIndex >= selectedAnime.length) finished();

    audio = new Audio();
    if(selectedAnime[currentSongIndex]) audio.src = selectedAnime[currentSongIndex].audio;
    audio.onloadedmetadata = function() {
        randomTime = Math.random() * (audio.duration - gameSettings.guessTime);
        audio.currentTime = randomTime;
        audio.volume = volume;
        audio.play();

        countDown = gameSettings.guessTime;
        $('#gaCountDown').text(countDown);
        countDownInterval = setInterval(function() {
            countDown--;
            $('#gaCountDown').text(countDown);
            if (countDown === 0) {
                isSkippable = false;
                clearInterval(countDownInterval);
                audio.currentTime = randomTime;
                displayInfo();
                processAnswer();
                currentSongIndex++;
                if (currentSongIndex >= selectedAnime.length) finished();
                pauseTime = setTimeout(function() {
                    audio.pause();
                    if(isreset) return;
                    setTimeout(playMusic, 200);
                }, 5000);
            }
        }, 1000);
    };
}

function displayInfo(){
    $('#gaAnimeName').text(selectedAnime[currentSongIndex].animeJPName[0]);
    $('#gaSongName').text(selectedAnime[currentSongIndex].songName);
    $('#gaSongArtist').text(selectedAnime[currentSongIndex].songArtist);
    $('#gaSongType').text(selectedAnime[currentSongIndex].songType);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function gaSkipClicked(){
    if(isSkippable == true){
        isSkippable = false;
        clearInterval(countDownInterval);
        countDown = 0;
        clearTimeout(songTime);
        audio.currentTime = randomTime;
        displayInfo();
        processAnswer();
        currentSongIndex++;
        setTimeout(function() {
            audio.pause();
            setTimeout(playMusic, 200);
        }, 5000);
    }
}

function processAnswer() {

    let answered = false;
    answer = answer.toLowerCase();
    let found = false;

    //console.log(selectedAnime[currentSongIndex]);
  
    let animeENNameLower = selectedAnime[currentSongIndex].animeENName.map(name => name.toLowerCase());
    let animeJPNameLower = selectedAnime[currentSongIndex].animeJPName.map(name => name.toLowerCase());

    if(!answered && animeENNameLower.includes(answer) || !answered && animeJPNameLower.includes(answer)){
        point++;
        answered = true;
        found = true;
    }
    if (found) {
        $('#gaScoreText').text(point);
        $("#gaStandingContainer").css("box-shadow", "0 0 10px 2px rgb(189 247 255)");
    } else {
        $("#gaStandingContainer").css("box-shadow", "0 0 10px 2px rgb(227 105 59)");
    }
}

function finished(){
    document.querySelector('#gcInput').value = "";

    if(audio) audio.pause();

    $("#gameArtist").addClass("hidden");
    $("#quizPage").removeClass("hidden");
}

function getAnilist(){
    let username = $('#aniListUserNameInput').val();

    if(!username) return;

    const API_URL = 'https://graphql.anilist.co';

    const query = `
        query {
            MediaListCollection(userName: "${username}", type: ANIME) {
                lists {
                    entries {
                        media {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                        }
                        progress
                        status
                        score
                    }
                }
            }
        }
    `;

    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: query,
        }),
    })
        .then(res => res.json())
        .then(data => processAnilist(data.data.MediaListCollection.lists))
        .catch(error => console.error(error));
}

function processAnilist(anilist) {

    //console.log(anilist);

    completed = [];
    dropped = [];
    planning = [];
    onHold = [];
    watching = [];

    anilist.forEach(list => {
        list.entries.forEach(entry => {
            switch (entry.status) {
                case "COMPLETED":
                    if(entry.media.title.romaji) completed.push(entry.media.title.romaji);
                    if(entry.media.title.english) completed.push(entry.media.title.english);
                    break;
                case "DROPPED":
                    if(entry.media.title.romaji) dropped.push(entry.media.title.romaji);
                    if(entry.media.title.english) dropped.push(entry.media.title.english);
                    break;
                case "PLANNING":
                    if(entry.media.title.romaji) planning.push(entry.media.title.romaji);
                    if(entry.media.title.english) planning.push(entry.media.title.english);
                    break;
                case "PAUSED":
                    if(entry.media.title.romaji) onHold.push(entry.media.title.romaji);
                    if(entry.media.title.english) onHold.push(entry.media.title.english);
                    break;
                case "CURRENT":
                    if(entry.media.title.romaji) watching.push(entry.media.title.romaji);
                    if(entry.media.title.english) watching.push(entry.media.title.english);
                    break;
                default:
                    break;
            }
        });
    });

    //console.log(watching);
    //console.log(completed);
    //console.log(onHold);
    //console.log(dropped);
    //console.log(planning);

    maxArtist = $('#gaMaxArtistText').val();

    currentSongIndex = 0;
    point = 0;
    $('#gaScoreText').text(point);
    anisongDB(commandArtist);
}

new Listener("get all song names", (payload) => {
    setTimeout(function() {
        if(allAnimeNames.length == 0){
            allAnimeNames = payload.names;
            new AmqAwesomeplete(document.querySelector("#gaAnswerInput"), {list: allAnimeNames, minChars: 1, maxItems: 15});
        }
    }, 10);
}).bindListener();
